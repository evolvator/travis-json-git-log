var Benchmark = require('benchmark');
var tb = require('./');

describe('travis-benchmark', function() {
  it('lifecycle', function(done) {
    var suite = new Benchmark.Suite('lifecycle suite');
    suite.add('empty benchmark', function() {})
    .on('complete', function(event) {
      tb.saveSuite(
        tb.parseSuite(event),
        function(error) {
          if (error) throw error;
          done();
        }
      );
    })
    .run({ 'async': true });
  });
  it('error', function(done) {
    var suite = new Benchmark.Suite('error suite');
    suite.add('errored benchmark', function() { throw new Error('message'); })
    .on('complete', function(event) {
      tb.saveSuite(
        tb.parseSuite(event),
        function(error) {
          if (error) throw error;
          done();
        }
      );
    })
    .run({ 'async': true });
  });
});
