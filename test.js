var Benchmark = require('benchmark');
var tb = require('./');

describe('travis-benchmark', function() {
  it('lifecycle', function(done) {
    var suite = new Benchmark.Suite('lifecycle suite');
    suite.add('empty benchmark', function() {})
    tb.wrapSuite(suite, () => done());
    suite.run({ 'async': true });
  });
  it('error', function(done) {
    var suite = new Benchmark.Suite('error suite');
    suite.add('errored benchmark', function() { throw new Error('message'); })
    tb.wrapSuite(suite, () => done());
    suite.run({ 'async': true });
  });
});
