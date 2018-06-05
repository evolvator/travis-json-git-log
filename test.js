var Benchmark = require('benchmark');
var tb = require('./');

describe('travis-benchmark', function() {
  it('lifecycle', function(done) {
    var suite = new Benchmark.Suite('suiteName');
    suite.add('benchmarkName', function() {})
    .on('complete', function(event) {
      tb.saveSuite(
        tb.parseSuite(event),
        function(error) {
          done();
        }
      );
    })
    .run({ 'async': true });
  });
});
