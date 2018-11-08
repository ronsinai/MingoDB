var Insert = require('./insert');
var Get = require('./get');
var Delete = require('./delete');
var Find = require('./find');

function DB(basePath) {
  this.basePath = basePath;
}

DB.prototype.insert = Insert
DB.prototype.get = Get
DB.prototype.delete = Delete
DB.prototype.find = Find

module.exports = DB;
