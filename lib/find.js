var Async = require('async');
var Path = require('path');
var Fs = require('fs');

var Helper = require('./helper');

var internals = {};

module.exports = function (collection, query, done) {
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
      validateQuery: function (next) {
        /*
          1. Validate query is defined and is a function
        */
        if (!query) {
          return next(new Error('query is missing'));
        }
        if (!Helper.isFunction(query)) {
          return next(new Error('query is not a function'))
        }

        next();
      },
      findObjects: ["validateCollection", "validateQuery", function (prev, next) {
        var collectionPath = Path.join(basePath, collection);
        internals.findObjects(collectionPath, query, next);
      }]
    }, function (err, results) {
      if (err) {
        return done(err);
      }

      done(null, results.findObjects);
    }
  );
}

internals.findObjects = function (path, query, done) {
  Fs.readdir(path, function (err, files) {
    if (err) {
      if (err.code === 'ENOTDIR') {
        return done(new Error('collection is not a directory'));
      }
      if (err.code === 'ENOENT') {
        return done(null, []);
      }

      return done(err);
    }

    internals.queryObjects(path, files, query, done);
  });
}

internals.queryObjects = function (path, files, query, done) {
  Async.reduce(
    files,
    [],
    function (passed, file, next) {
      var filePath = Path.join(path, file);
      internals.queryObject(filePath, query, passed, next);
    },
    done
  );
}

internals.queryObject = function (filePath, query, passed, done) {
  Async.auto({
    readFile: function (next) {
      Fs.readFile(filePath, 'utf8', function (err, data) {
        if (err) {
          return next();
        }
    
        try {
          data = JSON.parse(data);
        }
        catch (err) {
          return next(err);
        }

        next(null, data);
      });
    },
    queryObject: ["readFile", function (prev, next) {
      var document = prev.readFile;
      try {
        var answer = query(document);
      }
      catch (err) {
        return next();
      }

      if (answer) {
        passed.push(document);
      }

      next();
    }],
  }, function (err) {
    done(null, passed);
  });
}
