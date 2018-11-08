var Async = require('async');
var Path = require('path');
var Fs = require('fs');

var Helper = require('./helper');

var internals = {};

/*
  1. Create collection if does not exist
  2. Insert if object has id (replace file if exists)
  3. Create unique id for object and insert it (on retry for different ids if id exists)
*/
module.exports = function (collection, obj, done) {
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

        next()
      },
      validateObject: function (next) {
        /*
          1. Validate obj is defined and is an object
        */
        if (!obj) {
          return next(new Error('object is missing'));
        }
        if (!Helper.isObject(obj)) {
          return next(new Error('object is not an object'));
        }
        
        next();
      },
      createCollection: ["validateCollection", "validateObject", function (prev, next) {
        var collectionPath = Path.join(basePath, collection);
        internals.createFolder(collectionPath, next);
      }],
      insertObject: ["createCollection", function (prev, next) {
        var collectionPath = Path.join(basePath, collection);
        internals.insertObject(collectionPath, obj, next);
      }]
    }, function (err, results) {
      if (err) {
        return done(err);
      }

      done(null, results.insertObject);
    }
  );
}

internals.createFolder = function (path, done) {
  Fs.mkdir(path, function (err) {
    if (err && err.code !== 'EEXIST') {
      return done(err);
    }
    
    done();
  });
}

internals.insertObject = function (path, obj, done) {
  if (obj._id) {
    return internals.insertObjectWithID(path, obj, done);
  }
  
  internals.insertObjectWithoutID(path, obj, done);
}

internals.insertObjectWithID = function (path, obj, done) {
  if (!Helper.isString(obj._id)) {
    return done(new Error('object id is not a string'));
  }

  var filePath = Path.join(path, obj._id + '.json');
  Fs.writeFile(filePath, JSON.stringify(obj), 'utf8', function (err) {
    if (err) {
      return done(err);
    }

    done(null, obj._id);
  });
}

internals.insertObjectWithoutID = function (path, obj, done) {
  Async.retry({
      errorFilter: function (err) {
        return err && err.message === "ID already in use";
      }
    },
    function (next) {
      obj._id = new Date().valueOf() + Math.random().toString(36).substr(2);
      var filePath = Path.join(path, obj._id + '.json');

      // use flag 'wx' to fail when file exists
      var options = { encoding: 'utf8', flag: 'wx' };
      Fs.writeFile(filePath, JSON.stringify(obj), options, function (err) {
        if (err && err.code === 'ENOTDIR') {
          return next(new Error('collection is not a directory'));
        }

        next(err, obj._id);
      });
    },
    done
  );
}
