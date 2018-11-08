var Rimraf = require('rimraf');
var Async = require('async');
var Chai = require('chai');
var Path = require('path');
var Fs = require('fs');

var should = Chai.should();

var MingoDB = require('../');
var Data = require('./data');

var dbFolderPath = Path.join(__dirname, 'forTesting/insert');

var internals = {};

describe('#insert', function () {
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
        db.insert(undefined, {}, function (err, id) {
          should.exist(err);
          err.message.should.equal('collection is missing');
          should.not.exist(id);
          done();
        });
      });

      it('should return an error when collection is invalid', function (done) {
        db.insert(5, {}, function (err, id) {
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
              db.insert(fileName, {}, function (err, id) {
                should.exist(err);
                err.message.should.equal('collection is not a directory');
                should.not.exist(id);
                done();
              });
            },
            removeFile: function (next) {
              Fs.unlink(filePath, next);
            }
        }, done);
      });

      it('should return an error when obj is missing', function (done) {
        db.insert('workers', undefined, function (err, id) {
          should.exist(err);
          err.message.should.equal('object is missing');
          should.not.exist(id);
          done();
        });
      });

      it('should return an error when obj is invalid', function (done) {
        db.insert('workers', 5, function (err, id) {
          should.exist(err);
          err.message.should.equal('object is not an object');
          should.not.exist(id);
          done();
        });
      });

      it('should return an error when id is invalid', function (done) {
        db.insert('workers', { _id: 5 }, function (err, id) {
          should.exist(err);
          err.message.should.equal('object id is not a string');
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
    
    it('should insert document with given id', function (done) {
      var collection = 'students';
      var originalDocument = Data.valid.withIDs[0];

      Async.auto({
        insertDocument: function (next) {
          var document = JSON.parse(JSON.stringify(originalDocument));
          db.insert(collection, document, next);
        },
        testInsertion: ["insertDocument", function (results, next) {
          var insertedID = results.insertDocument;
          var id = originalDocument._id;
          id.should.equal(insertedID);

          var collectionPath = Path.join(dbFolderPath, collection);
          var documentPath = Path.join(collectionPath, insertedID + '.json');

          Async.parallel({
            testDocument: function (next) {
              internals.testDocumentsEquality(documentPath, originalDocument, next);
            },
            testFolder: function (next) {
              internals.testFolderSize(collectionPath, 1, next);
            }
          }, next);
        }]
      }, done);
    });
  
    it('should insert document with generated id', function (done) {
      var collection = 'students';
      var originalDocument = Data.valid.withoutIDs[0];
  
      Async.auto({
        insertDocument: function (next) {
          var document = JSON.parse(JSON.stringify(originalDocument));
          db.insert(collection, document, next);
        },
        testInsertion: ["insertDocument", function (results, next) {
          var insertedID = results.insertDocument;
          var document = JSON.parse(JSON.stringify(originalDocument));
          document._id = insertedID;

          var collectionPath = Path.join(dbFolderPath, collection);
          var documentPath = Path.join(collectionPath, insertedID + '.json');

          Async.parallel({
            testDocument: function (next) {
              internals.testDocumentsEquality(documentPath, document, next);
            },
            testFolder: function (next) {
              internals.testFolderSize(collectionPath, 1, next);
            }
          }, next);
        }]
      }, done);
    });

    it('should insert documents with both given & generated ids', function (done) {
      var collection = 'students';
      var documents = JSON.parse(JSON.stringify(Data.valid.withIDs.concat(Data.valid.withoutIDs)));
  
      Async.auto({
        insertDocuments: function (next) {
          Async.map(
            documents,
            function (document, next) {
              db.insert(collection, document, next);
            },
            next
          );
        },
        testInsertions: ["insertDocuments", function (results, next) {
          results.insertDocuments.should.have.lengthOf(documents.length);
          var collectionPath = Path.join(dbFolderPath, collection);
          internals.testFolderSize(collectionPath, documents.length, next);
        }]
      }, done);
    });
  });
});

internals.testDocumentsEquality = function (documentPath, document, done) {
  Fs.readFile(documentPath, 'utf8', function (err, data) {
    should.not.exist(err);
    should.exist(data);
    JSON.stringify(document).should.equal(data);
    done();
  });
}

internals.testFolderSize = function (folderPath, size, done) {
  Fs.readdir(folderPath, function (err, files) {
    should.not.exist(err);
    files.should.have.lengthOf(size);
    done();
  });
}
