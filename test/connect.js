var Async = require('async');
var Chai = require('chai');
var Path = require('path');
var Fs = require('fs');

var should = Chai.should();

var MingoDB = require('../');
var DB = require('../lib');

var dbFolderPath = Path.join(__dirname, 'forTesting/connect');

describe('#connect', function () {
  before(function (done) {
    Fs.mkdir(dbFolderPath, done);
  });
  after(function (done) {
    Fs.rmdir(dbFolderPath, done);
  });

  describe('invalid dbFolderPath', function () {
    it('should return an error when dbFolderPath argument is missing', function (done) {
      MingoDB.connect(null, function (err, db) {
        should.exist(err);
        err.message.should.equal('dbFolderPath is missing');
        should.not.exist(db);
        done();
      });
    });

    it('should return an error when dbFolderPath does not exist', function (done) {
      MingoDB.connect('notExists', function (err, db) {
        should.exist(err);
        err.code.should.equal('ENOENT');
        should.not.exist(db);
        done();
      });
    });

    it('should return an error when dbFolderPath is not a folder', function (done) {
      var filePath = Path.join(dbFolderPath, 'someFile');
      
      Async.series({
          writeFile: function (next) {
            Fs.writeFile(filePath, '', next);
          },
          connect: function (next) {
            MingoDB.connect(filePath, function (err, db) {
              should.exist(err);
              err.message.should.equal('dbFolderPath is not a directory');
              should.not.exist(db);
              next()
            });
          },
          removeFile: function (next) {
            Fs.unlink(filePath, next);
          }
      }, done);
    });
  });

  describe('valid dbFolderPath', function () {
    it('should return a DB object', function (done) {
      MingoDB.connect(dbFolderPath, function (err, db) {
        if (err) return done(err)
        should.exist(db);

        db.should.have.property('insert');
        db.should.have.property('get');
        db.should.have.property('delete');
        db.should.have.property('find');
        db.should.be.an.instanceof(DB);
        done();
      });
    });
  });
});
