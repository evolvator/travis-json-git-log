var platform = require('platform');
var http = require('http');
var fs = require('fs');
var jsonfile = require('jsonfile');

var _ = require('lodash');
var async = require('async');

var simpleGit = require('simple-git');
var tmp = require('tmp');

exports.parseSuite = function(
  event,
) {
  var results = [];
  var max = 0;
  for (var b of event.currentTarget) {
    var result = {
      build: process.env.TRAVIS_BUILD_ID,
      job: process.env.TRAVIS_JOB_ID,
      platform: platform.name,
      version: platform.version,
      layout: platform.layout,
      os: platform.os,
      suite: event.currentTarget.name,
      benchmark: event.currentTarget[b].name,
      speed: parseInt(event.currentTarget[b].hz.toFixed(event.currentTarget[b].hz < 100 ? 2 : 0), 10),
      distortion: event.currentTarget[b].stats.rme.toFixed(2),
      sampled: event.currentTarget[b].stats.sample.length,
    };
    if (result.speed > max) max = result.speed;
    results.push(result);
  }
  for (var result of results) {
    result.percent = Math.round((1 + (result.speed - max) / max) * 100);
  }
  return results;
};

exports.saveSuite = function(
  suite,
  callback,
) {
  tmp.dir({ unsafeCleanup: true }, function(error, path, clean) {
    if (error) {
      return callback(error);
    } else {
      var git = simpleGit(path);
      async.series(
        [
          function(next) {
            git.clone(`https://github.com/${process.env.TRAVIS_REPO_SLUG}.git`, './', next);
          },
          function(next) {
            git.checkoutLocalBranch(process.env.RESULTS_BRANCH, next);
          },
          function(next) {
            fs.readdir(path, function(error, dir) {
              if (error) return next(error);
              var filename = `${process.env.TRAVIS_BUILD_ID}.json`;
              var filepath = `${path}/${filename}`;
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
            clean();
            next();
          },
        ],
        callback,
      );
    }
  });
};
