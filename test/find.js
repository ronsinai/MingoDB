var Rimraf = require('rimraf');
var Async = require('async');
var Chai = require('chai');
var Path = require('path');
var Fs = require('fs');

var should = Chai.should();

var MingoDB = require('../');
var Data = require('./data');

var dbFolderPath = Path.join(__dirname, 'forTesting/find');

var internals = {};

describe('#find', function () {
  var db;

  before(function (done) {
    Async.series({
      createDBFolder: function (next) {
        Fs.mkdir(dbFolderPath, next);
      },
      connectToDB: function (next) {
        MingoDB.connect(dbFolderPath, function (err, database) {
          should.not.exist(err);
          should.exist(database);
          db = database;
          next();
        });
      }
    }, done);
  });
  after(function (done) {
    Fs.rmdir(dbFolderPath, done);
  });

  describe('invalid arguments', function () {
    it('should return an error when collection is missing', function (done) {
      db.find(undefined,
        function () { return true; },
        function (err, id) {
          should.exist(err);
          err.message.should.equal('collection is missing');
          should.not.exist(id);
          done();
      });
    });

    it('should return an error when collection is invalid', function (done) {
      db.find(5,
        function () { return true; },
        function (err, id) {
          should.exist(err);
          err.message.should.equal('collection is not a string');
          should.not.exist(id);
          done();
        });
    });

    it('should return an error when collection is not a folder', function (done) {
      var fileName = 'someFile';
      var filePath = Path.join(dbFolderPath, fileName);
    
      Async.series({
          writeFile: function (next) {
            Fs.writeFile(filePath, '', next);
          },
          insert: function (next) {
            db.find(fileName,
              function () { return true; },
              function (err, object) {
                should.exist(err);
                err.message.should.equal('collection is not a directory');
                should.not.exist(object);
                done();
            });
          },
          removeFile: function (next) {
            Fs.unlink(filePath, next);
          }
      }, done);
    });

    it('should return an error when query is missing', function (done) {
      db.find('workers', undefined, function (err, id) {
        should.exist(err);
        err.message.should.equal('query is missing');
        should.not.exist(id);
        done();
      });
    });

    it('should return an error when query is invalid', function (done) {
      db.find('workers', 5, function (err, id) {
        should.exist(err);
        err.message.should.equal('query is not a function');
        should.not.exist(id);
        done();
      });
    });
  });

  describe('valid arguments', function () {
    beforeEach(function (done) {
      Rimraf(dbFolderPath + '/*', done);
    });
    afterEach(function (done) {
      Rimraf(dbFolderPath + '/*', done);
    });

    describe('empty collection', function () {
      it('should return empty array when collection does not exist', function (done) {
        var collection = 'students';
  
        var query = function (doc) { return false; };
        internals.testForEmptyResponse(db, collection, query, done);
      });
  
      it('should return empty array when collection is empty', function (done) {
        var collection = 'students';
        var collectionPath = Path.join(dbFolderPath, collection);
  
        Async.series({
          createCollection: function (next) {
            Fs.mkdir(collectionPath, next);
          },
          queryCollection: function (next) {
            var query = function (doc) { return false; };
            internals.testForEmptyResponse(db, collection, query, next);
          }
        }, done);
      });
    });
    

    describe('filled collection', function () {
      var collection = 'students';
      var collectionPath = Path.join(dbFolderPath, collection);

      beforeEach(function (done) {
        Async.series({
          createCollection: function (next) {
            Fs.mkdir(collectionPath, next);
          },
          createDocuments: function (next) {
            var documents = Data.valid.withIDs;
  
            Async.each(
              documents,
              function (document, next) {
                var documentPath = Path.join(collectionPath, document._id + '.json');
                Fs.writeFile(documentPath, JSON.stringify(document), 'utf8', next);
              }
            , next);
          },
        }, done);
      });

      it('should return empty array when query is falsy', function (done) {
        var query = function (doc) { return false; };
        internals.testForEmptyResponse(db, collection, query, done);
      });
      
      it('should return all documents when query is truthy', function (done) {
        var query = function (doc) { return true; };

        db.find(collection, query, function (err, documents) {
          should.not.exist(err);
          should.exist(documents);
          documents.should.be.an.instanceof(Array);
          documents.should.have.lengthOf(5);
          documents.sort(function (doc1, doc2) { return doc1.name - doc2.name; });
          JSON.stringify(documents).should.equal(JSON.stringify(Data.valid.withIDs));
          done();
        });
      });

      it('should return empty array when collection is not empty & query finds nothing', function (done) {
        var query = function (doc) { return doc.birthYear.yo < 2000; };
        internals.testForEmptyResponse(db, collection, query, done);
      });
  
      it('should return array of single document when query matches nothing but a single document', function (done) {
        var query = function (doc) { return doc.name === 'Alberto'; };

        db.find(collection, query, function (err, documents) {
          should.not.exist(err);
          should.exist(documents);
          documents.should.be.an.instanceof(Array);
          documents.should.have.lengthOf(1);
          JSON.stringify(documents[0]).should.equal(JSON.stringify(Data.valid.withIDs[0]));
          done();
        });
      });
  
      it('should return array of multiple documents when query matches multiple documents', function (done) {
        var query = function (doc) { return doc.name[0] >= 'A' && doc.name[0] <= 'E'; };
            
        db.find(collection, query, function (err, documents) {
          should.not.exist(err);
          should.exist(documents);
          documents.should.be.an.instanceof(Array);
          documents.should.have.lengthOf(5);
          documents.sort(function (doc1, doc2) { return doc1.name - doc2.name; });
          JSON.stringify(documents).should.equal(JSON.stringify(Data.valid.withIDs));
          done();
        });
      });

      it('should return array of multiple documents when query throws errors', function (done) {
        var query = function (doc) {
          if (doc.name === 'Alberto') {
            throw new Error('Alberto pisses me off!');
          }

          return true;
        };
            
        db.find(collection, query, function (err, documents) {
          should.not.exist(err);
          should.exist(documents);
          documents.should.be.an.instanceof(Array);
          documents.should.have.lengthOf(4);
          documents.sort(function (doc1, doc2) { return doc1.name - doc2.name; });
          JSON.stringify(documents).should.equal(JSON.stringify(Data.valid.withIDs.slice(1)));
          done();
        });
      });
      
      it('should return documents when collection contains unparsable data', function (done) {
        Async.series({
          insertDefected: function (next) {
            var document = 'matilda';
            var filePath = Path.join(collectionPath, document + '.json');
            Fs.writeFile(filePath, document, next);
          },
          find: function (next) {
            var query = function (doc) { return doc.name === 'Alberto'; };

            db.find(collection, query, function (err, documents) {
              should.not.exist(err);
              should.exist(documents);
              documents.should.be.an.instanceof(Array);
              documents.should.have.lengthOf(1);
              JSON.stringify(documents[0]).should.equal(JSON.stringify(Data.valid.withIDs[0]));
              done();
            });
          },
        }, done);
      });
    });
  });
});

internals.testForEmptyResponse = function (db, collection, query, done) {
  db.find(collection, query, function (err, documents) {
    should.not.exist(err);
    should.exist(documents);
    documents.should.be.an.instanceof(Array);
    documents.should.be.empty;
    done();
  });
}
