var Rimraf = require('rimraf');
var Async = require('async');
var Chai = require('chai');
var Path = require('path');
var Fs = require('fs');

var should = Chai.should();

var MingoDB = require('../');
var Data = require('./data');

var dbFolderPath = Path.join(__dirname, 'forTesting/delete');

var internals = {};

describe('#delete', function () {
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
      db.delete(undefined, 'mark', function (err, id) {
        should.exist(err);
        err.message.should.equal('collection is missing');
        should.not.exist(id);
        done();
      });
    });

    it('should return an error when collection is invalid', function (done) {
      db.delete(5, 'mark', function (err, id) {
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
            db.delete(fileName, 'mark', function (err, object) {
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
      db.delete('workers', undefined, function (err, id) {
        should.exist(err);
        err.message.should.equal('id is missing');
        should.not.exist(id);
        done();
      });
    });

    it('should return an error when id is invalid', function (done) {
      db.delete('workers', 5, function (err, id) {
        should.exist(err);
        err.message.should.equal('id is not a string');
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
              var filePath = Path.join(collectionPath, document._id + '.json');
              Fs.writeFile(filePath, JSON.stringify(document), 'utf8', next);
            }
          , next);
        },
        getDocument: function (next) {
          internals.testDocumentNotExist(db, collection, '123', next);
        }
      }, done);
    });

    it('should delete document when collection contains nothing but the specified document', function (done) {
      var collection = 'students';
      var collectionPath = Path.join(dbFolderPath, collection);
      var document = Data.valid.withIDs[0];
      var id = document._id;
      var documentPath = Path.join(collectionPath, id + '.json');
      
      Async.series({
        createCollection: function (next) {
          Fs.mkdir(collectionPath, next);
        },
        createDocument: function (next) {
          Fs.writeFile(documentPath, JSON.stringify(document), 'utf8', next);
        },
        deleteDocument: function (next) {
          db.delete(collection, id, next);
        },
        verifyDeletion: function (next) {
          internals.testDocumentDeletion(documentPath, next);
        }
      }, done);
    });

    it('should delete document when collection contains multiple documents', function (done) {
      var collection = 'students';
      var collectionPath = Path.join(dbFolderPath, collection);
      var documents = Data.valid.withIDs.concat(Data.valid.withoutIDs);
      var deletedID = Data.valid.withIDs[0]._id;

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
        deleteDocument: function (next) {
          db.delete(collection, deletedID, next);
        },
        verifyDeletion: function (next) {
          var documentPath = Path.join(collectionPath, deletedID + '.json');
          internals.testDocumentDeletion(documentPath, next);
        }
      }, done);
    });
  });
});

internals.testDocumentNotExist = function (db, collection, id, done) {
  db.delete(collection, id, function (err) {
    should.not.exist(err);
    done();
  });
}

internals.testDocumentDeletion = function (documentPath, done) {
  Fs.readFile(documentPath, 'utf8', function (err, data) {
    should.exist(err);
    err.should.have.property('code', 'ENOENT');
    should.not.exist(data);
    done();
  });
}
