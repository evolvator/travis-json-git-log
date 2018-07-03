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

module.exports = function(config, callback) {
  config = _.defaults(config, module.exports.defaultConfig);
  config.data = typeof(config.data) === 'string' ? JSON.parse(config.data) : config.data;
  if (!isNode) {
    if (!config.mute) console.warn('travis-json-git-log: only on node js side');
    if (callback) return callback();
  }
  if (!config.repo) {
    if (!config.auth) {
      if (!config.mute) console.warn('travis-json-git-log: auth is not defined');
      if (callback) return callback();
    }
    config.repo = `https://${config.auth}@github.com/${config.repo_slug}.git`;
  }

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
              var filename = `${config.filename}.json`;
              var filepath = `${path}/${filename}`;
              _filepath = filepath;
              if (_.includes(dir, filename)) {
                jsonfile.readFile(filepath, function(error, json) {
                  if (_.isArray(config.data)) json.push(...config.data);
                  else if (_.isObject(config.data)) _.extend(json, config.data);
                  else return callback(new Error(`unexpected data type ${typeof(config.data)}`));
                  jsonfile.writeFile(filepath, json, next);
                });
              } else {
                jsonfile.writeFile(filepath, config.data, next);
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
              `${config.commit || `results ${config.filename}`}`,
              next
            );
          },
          function(next) {
            git.push('origin', config.branch, next);
          },
          function(next) {
            clean();
            if (!config.mute) console.log(config.data);
            next();
          }
        ],
        error => {
          if (callback) callback(error);
        }
      );
    }
  });
};

module.exports.defaultConfig = {
  data: _.get(process, 'env.TJGL_DATA'),
  branch: _.get(process, 'env.TJGL_BRANCH') || 'results',
  repo_slug: _.get(process, 'env.TJGL_REPO_SLUG') || _.get(process, 'env.TRAVIS_REPO_SLUG'),
  repo: _.get(process, 'env.TJGL_REPO'),
  auth: _.get(process, 'env.TJGL_AUTH'),
  mute: _.get(process, 'env.TJGL_MUTE'),
  filename: _.get(process, 'env.TJGL_FILENAME') || _.get(process, 'env.TRAVIS_BUILD_ID') || `${new Date().valueOf()}`,
};

if (module.exports.defaultConfig.data) {
  module.exports({});
}
