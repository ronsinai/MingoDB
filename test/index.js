var Path = require('path');
var Fs = require('fs');

var testingFolder = Path.join(__dirname, 'forTesting');

describe('MingoDB', function () {
  before(function (done) {
    Fs.mkdir(testingFolder, done);
  });
  after(function (done) {
    Fs.rmdir(testingFolder, done);
  });

  require('./connect');
  require('./insert');
  require('./get');
  require('./delete');
  require('./find');
});
