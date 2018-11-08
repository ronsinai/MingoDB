var Fs = require('fs');

exports.isString = function (path) {
  if (!(typeof path === 'string' || path instanceof String)) {
    return false;
  }

  return true;
}

exports.isDirectory = function (path, done) {
  Fs.stat(path, function (err, stats) {
    if (err) return done(err);

    if (!stats.isDirectory()) {
      return done(null, false);
    }
    done(null, true);
  });
}

exports.isObject = function (obj) {
  return Object.prototype.toString.call(obj) === '[object Object]';
}

exports.isFunction = function (func) {
  return typeof func === 'function';
}
