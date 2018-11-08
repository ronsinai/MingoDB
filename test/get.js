var Rimraf = require('rimraf');
var Async = require('async');
var Chai = require('chai');
var Path = require('path');
var Fs = require('fs');

var should = Chai.should();

var MingoDB = require('../');
var Data = require('./data');

var dbFolderPath = Path.join(__dirname, 'forTesting/get');

var internals = {};

describe('#get', function () {
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
      db.get(undefined, 'mark', function (err, id) {
        should.exist(err);
        err.message.should.equal('collection is missing');
        should.not.exist(id);
        done();
      });
    });

    it('should return an error when collection is invalid', function (done) {
      db.get(5, 'mark', function (err, id) {
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
            db.get(fileName, 'mark', function (err, object) {
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

    it('should return an error when id is missing', function (done) {
      db.get('workers', undefined, function (err, id) {
        should.exist(err);
        err.message.should.equal('id is missing');
        should.not.exist(id);
        done();
      });
    });

    it('should return an error when id is invalid', function (done) {
      db.get('workers', 5, function (err, id) {
        should.exist(err);
        err.message.should.equal('id is not a string');
        should.not.exist(id);
        done();
      });
    });

    it('should return an error when document exists but not parsable', function (done) {
      var document = 'matilda';
      var collection = 'workers';
      var collectionPath = Path.join(dbFolderPath, collection);
      var filePath = Path.join(collectionPath, document + '.json');
    
      Async.series({
          createCollection: function (next) {
            Fs.mkdir(collectionPath, next);
          },
          writeFile: function (next) {
            Fs.writeFile(filePath, document, next);
          },
          insert: function (next) {
            db.get(collection, document, function (err, object) {
              should.exist(err);
              err.message.should.equal('document is not parsable');
              should.not.exist(object);
              done();
            });
          },
          removeCollection: function (next) {
            Rimraf(collectionPath, next);
          }
      }, done);
    });
  });

  describe('valid arguments', function () {
    beforeEach(function (done) {
      Rimraf(dbFolderPath + '/*', done);
    });
    afterEach(function (done) {
      Rimraf(dbFolderPath + '/*', done);
    });

    it('should return nothing when collection does not exist', function (done) {
      internals.testDocumentNotExist(db, 'students', '123', done);
    });

    it('should return nothing when collection is empty', function (done) {
      var collection = 'students';
      
      Async.series({
        createCollection: function (next) {
          Fs.mkdir(Path.join(dbFolderPath, collection), next);
        },
        getDocument: function (next) {
          internals.testDocumentNotExist(db, collection, '123', next);
        }
      }, done);
    });
    
    it('should return nothing when collection is not empty & document does not exist', function (done) {
      var collection = 'students';
      var collectionPath = Path.join(dbFolderPath, collection);

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
        getDocument: function (next) {
          internals.testDocumentNotExist(db, collection, '123', next);
        }
      }, done);
    });

    it('should return document when collection contains nothing but the specified document', function (done) {
      var collection = 'students';
      var collectionPath = Path.join(dbFolderPath, collection);
      var document = Data.valid.withIDs[0];
      var id = document._id;
      
      Async.series({
        createCollection: function (next) {
          Fs.mkdir(collectionPath, next);
        },
        createDocument: function (next) {
          var documentPath = Path.join(collectionPath, id + '.json');
          Fs.writeFile(documentPath, JSON.stringify(document), 'utf8', next);
        },
        getDocument: function (next) {
          internals.testDocumentsEquality(db, collection, id, document, next);
        }
      }, done);
    });

    it('should return document when collection contains multiple documents', function (done) {
      var collection = 'students';
      var collectionPath = Path.join(dbFolderPath, collection);
      var documents = Data.valid.withIDs.concat(Data.valid.withoutIDs);

      Async.series({
        createCollection: function (next) {
          Fs.mkdir(collectionPath, next);
        },
        createDocuments: function (next) {
          Async.map(
            documents,
            function (document, next) {
              var documentPath = Path.join(collectionPath, document._id + '.json');
              Fs.writeFile(documentPath, JSON.stringify(document), 'utf8', next);
            },
            next
          );
        },
        getDocument: function (next) {
          var searchedDocument = Data.valid.withIDs[0];
          internals.testDocumentsEquality(db, collection, searchedDocument._id, searchedDocument, next);
        }
      }, done);
    });
  });
});

internals.testDocumentNotExist = function (db, collection, id, done) {
  db.get(collection, id, function (err, document) {
    should.not.exist(err);
    should.not.exist(document);
    done();
  });
}

internals.testDocumentsEquality = function (db, collection, id, document, done) {
  db.get(collection, id, function (err, data) {
    should.not.exist(err);
    should.exist(data);
    JSON.stringify(document).should.equal(JSON.stringify(data));
    done();
  });
}
