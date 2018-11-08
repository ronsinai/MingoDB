var Async = require('async');
var Path = require('path');
var Fs = require('fs');

var Helper = require('./helper');

var internals = {};

module.exports = function (collection, id, done) {
  var basePath = this.basePath;

  Async.auto({
      validateCollection: function (next) {
        /*
          1. Validate collection is defined and is a string
          (2. Validate collectionPath is a folder)
          (3. Validate collectionPath has proper permissions)
        */
        if (!collection) {
          return next(new Error('collection is missing'));
        }
        if (!Helper.isString(collection)) {
          return next(new Error('collection is not a string'))
        }

        next();
      },
      validateID: function (next) {
        /*
          1. Validate id is defined and is a string
        */
        if (!id) {
          return next(new Error('id is missing'));
        }
        if (!Helper.isString(id)) {
          return next(new Error('id is not a string'))
        }

        next();
      },
      deleteObject: ["validateCollection", "validateID", function (prev, next) {
        var collectionPath = Path.join(basePath, collection);
        internals.deleteObject(collectionPath, id, next);
      }]
    }, function (err, results) {
      if (err) {
        return done(err);
      }

      done();
    }
  );
}

internals.deleteObject = function (path, id, done) {
  var documentPath = Path.join(path, id + '.json');
  Fs.unlink(documentPath, function (err) {
    if (err) {
      if (err.code === 'ENOTDIR') {
        return done(new Error('collection is not a directory'));
      }
      if (err.code === 'ENOENT') {
        return done();
      }

      return done(err);
    }

    done();
  });
}
