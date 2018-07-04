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

exports.prepareDir = (context, config) => (next) => {
  tmp.dir(
    { unsafeCleanup: true },
    function(error, path, clean) {
      if (error) {
        next(error);
      } else {
        context.clean = clean;
        context.path = path;
        context.git = simpleGit(path);
        next();
      }
    }
  );
};

exports.clone = (context, config) => (next) => {
  context.git = simpleGit(context.path);
  context.git.clone(config.repo, context.path, ['-b', config.branch], next);
};

exports.findFile = (context, config) => (next) => {
  fs.readdir(context.path, (error, dir) => {
    if (error) return next(error);
    context.filename = `${config.filename}.json`;
    context.filepath = `${context.path}/${context.filename}`;
    next();
  });
};

exports.upsertFile = (context, config) => (next) => {
  if (_.includes(dir, context.filename)) {
    jsonfile.readFile(context.filepath, function(error, json) {
      if (_.isArray(json)) {
        if (_.isArray(config.data)) json.push(...config.data);
        else json.push(config.data);
      } else if (_.isObject(json)) _.extend(json, config.data);
      else return callback(new Error(`unexpected data type ${typeof(config.data)}`));
      jsonfile.writeFile(context.filepath, json, next);
    });
  } else {
    jsonfile.writeFile(context.filepath, config.data, next);
  }
};

exports.lastLink = (context, config) => (next) => {
  fs.unlink(`${context.path}/last.json`, () => {
    fs.link(context.filepath, `${context.path}/last.json`, next);
  });
};

exports.add = (context, config) => (next) => context.git.add('./*', next);

exports.commit = (context, config) => (next) => context.git.commit(`${config.commit || `results ${config.filename}`}`, next);

exports.push = (context, config) => (next) => context.git.push('origin', config.branch, next);

exports.clean = (context, config) => (next) => {
  context.clean();
  if (!config.mute) console.log(config.data);
  next();
}

exports.parseConfig = (config) => {
  config = _.defaults(config, exports.defaultConfig);
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
  return config;
};

exports.tjgl = (config, callback) => {
  config = exports.parseConfig(config);
  var context = {};
  async.series([
    exports.prepareDir(context, config),
    exports.clone(context, config),
    exports.findFile(context, config),
    exports.upsertFile(context, config),
    exports.lastLink(context, config),
    exports.add(context, config),
    exports.commit(context, config),
    exports.push(context, config),
    exports.clean(context, config),
  ], (error) => callback ? callback(error, context, config) : null);
};

exports.defaultConfig = {
  data: _.get(process, 'env.TJGL_DATA'),
  branch: _.get(process, 'env.TJGL_BRANCH') || 'results',
  repo_slug: _.get(process, 'env.TJGL_REPO_SLUG') || _.get(process, 'env.TRAVIS_REPO_SLUG'),
  repo: _.get(process, 'env.TJGL_REPO'),
  auth: _.get(process, 'env.TJGL_AUTH'),
  mute: _.get(process, 'env.TJGL_MUTE'),
  filename: _.get(process, 'env.TJGL_FILENAME') || _.get(process, 'env.TRAVIS_BUILD_ID') || `${new Date().valueOf()}`,
};

if (exports.defaultConfig.data) {
  exports.tjgl({}, (error) => {
    console.log(error ? error : 'Done.');
    process.exit();
  });
}
