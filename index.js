var Async = require('async');
var Fs = require('fs');

var DB = require('./lib');
var Helper = require('./lib/helper');

exports.connect = function (dbFolderPath, done) {
  /*
    1. Validate dbFolderPath is defined and is a string
    2. Validate it is a folder
    (3. Validate it has proper permissions)
  */
  Async.auto({
      validateFolderPath: function (next) {
        if (!dbFolderPath) {
          return next(new Error('dbFolderPath is missing'));
        }
        if (!Helper.isString(dbFolderPath)) {
          return next(new Error('dbFolderPath is not a string'))
        }

        next()
      },
      validateFolder: function (next) {
        Helper.isDirectory(dbFolderPath, function (err, isDir) {
          if (err) return next(err);
          
          if (!isDir) {
            return next(new Error('dbFolderPath is not a directory'));
          }
          next()
        });
      }
  }, function (err) {
    if (err) return done(err);

    done(null, new DB(dbFolderPath));
  });
}
