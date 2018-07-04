var assert = require('chai').assert;
var tjgl = require('./');
var simpleGit = require('simple-git');
var tmp = require('tmp');
var jsonfile = require('jsonfile');
var async = require('async');

describe('travis-json-git-log', function() {
  it('lifecycle', function(done) {
    tjgl.tjgl({
      data: { time: new Date().valueOf() },
      repo_slug: 'evolvator/travis-json-git-log',
      filename: 'test'
    }, (error, _context, config) => {
      if (error) throw error;
      var context = {};
      async.series([
        tjgl.prepareDir(context, config),
        tjgl.clone(context, config),
        (next) => {
          jsonfile.readFile(context.filepath, function(error, json) {
            assert.deepEqual(json, config.data);
            next();
          });
        },
        tjgl.clean(context, config),
      ], (error) => {
        if (error) throw error;
        done();
      });
    });
  });
});
