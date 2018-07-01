var platform = require('platform');
var http = require('http');
var fs = require('fs');
var jsonfile = require('jsonfile');

var _ = require('lodash');
var async = require('async');

const isNode = platform.name === 'Node.js';

if (isNode) {
  var simpleGit = require('simple-git');
  var tmp = require('tmp');
}

exports.defaultConfig = {
  branch:
    process && process.env && process.env.RESULTS_BRANCH
      ? process.env.RESULTS_BRANCH
      : 'results',
  repo_slug:
  process && process.env ? process.env.RESULTS_REPO_SLUG || process.env.TRAVIS_REPO_SLUG : undefined,
  repo:
    process && process.env && process.env.RESULTS_REPO
      ? process.env.RESULTS_REPO
      : undefined,
  auth:
    process && process.env && process.env.RESULTS_AUTH
      ? process.env.RESULTS_AUTH
      : undefined,
  mute:
    process && process.env && process.env.RESULTS_MUTE
      ? process.env.RESULTS_MUTE
      : undefined,
  build:
    process && process.env && process.env.TRAVIS_BUILD_ID
      ? process.env.TRAVIS_BUILD_ID
      : undefined,
  job:
    process && process.env && process.env.TRAVIS_JOB_ID
      ? process.env.TRAVIS_JOB_ID
      : undefined
};

exports.parseSuite = function(event, config) {
  config = _.defaults(config, exports.defaultConfig);
  var results = [];
  var max = 0;
  for (var b = 0; b < event.currentTarget.length; b++) {
    var result = {
      build: config.build,
      job: config.job,
      platform: platform.name,
      version: platform.version,
      layout: platform.layout,
      os: platform.os.toString(),
      suite: event.currentTarget.name,
      benchmark: event.currentTarget[b].name,
      speed: parseInt(
        event.currentTarget[b].hz.toFixed(
          event.currentTarget[b].hz < 100 ? 2 : 0
        ),
        10
      ),
      distortion: event.currentTarget[b].stats.rme.toFixed(2),
      sampled: event.currentTarget[b].stats.sample.length
    };
    if (event.currentTarget[b].error) {
      result.error = event.currentTarget[b].error.stack;
    }
    if (result.speed > max) max = result.speed;
    results.push(result);
  }
  for (var result of results) {
    result.percent = Math.round((1 + (result.speed - max) / max) * 100);
  }
  return results;
};

exports.saveSuite = function(suite, callback, config) {
  config = _.defaults(config, exports.defaultConfig);
  if (!config.repo)
    config.repo = `https://${config.auth}@github.com/${config.repo_slug}.git`;

  if (isNode && config.auth) {
    tmp.dir({ unsafeCleanup: true }, function(error, path, clean) {
      if (error) {
        if (callback) return callback(error);
      } else {
        var git = simpleGit(path);
        var _filepath;
        async.series(
          [
            function(next) {
              git.clone(config.repo, path, ['-b', config.branch], next);
            },
            function(next) {
              fs.readdir(path, function(error, dir) {
                if (error) return next(error);
                var filename = `${config.build}.json`;
                var filepath = `${path}/${filename}`;
                _filepath = filepath;
                if (_.includes(dir, filename)) {
                  jsonfile.readFile(filepath, function(error, json) {
                    json.push(...suite);
                    jsonfile.writeFile(filepath, json, next);
                  });
                } else {
                  jsonfile.writeFile(filepath, suite, next);
                }
              });
            },
            function(next) {
              fs.unlink(`${path}/last.json`, () => {
                fs.link(_filepath, `${path}/last.json`, next);
              });
            },
            function(next) {
              git.add('./*', next);
            },
            function(next) {
              git.commit(
                `results ${config.build}/${config.job}/${suite.name}`,
                next
              );
            },
            function(next) {
              git.push('origin', config.branch, next);
            },
            function(next) {
              clean();
              if (!config.mute) console.log(suite);
              next();
            }
          ],
          error => {
            if (callback) callback(error);
          }
        );
      }
    });
  } else {
    if (!config.mute) console.warn('travis-benchmark: auth is not defined');
    if (!config.mute) console.log(suite);
    if (callback) callback();
  }
};

exports.wrapSuite = function(suite, callback, config) {
  suite.on('cycle', function(event) {
    console.log(String(event.target));
  });
  suite.on('complete', function(event) {
    exports.saveSuite(
      exports.parseSuite(event),
      function(error) {
        if (callback) callback(error);
      },
      config
    );
  });
};
