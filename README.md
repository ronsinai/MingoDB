# MingoDB
## A Mimic Project for MongoDB Containing all CRUD operations

1. MingoDB.connect(dbFolderPath, done):

   * done: function (err, db). err is null unless there is an error, in which case, err holds the error description.

2. db.insert(collectionName, jsonObj, done):

   * done: function (err, id). id holds the generated (or given) id of the inserted object.
   * If jsonObj does not have an id property, generate a unique id for it. Make sure it's really unique and will never repeat itself.
   * Creates afile named {id}.json in the directory collectionName. If such file already exists, replace it.

3. db.get(collectionName, id, done):

   * done: function (err, result).
   * If the collection does not exist, or id does not exist, return nothing.
   * The get operation should be O(1) - it should be fast even if there will be millions of documents in the collection.

4. db.delete(collectionName, id, done):

   * done: function (err).
   * If the collection does not exist or id does not exist, there is no error, nothing happens.

5. db.find(collectionName, queryFunction, done):

   * done: function (err, resultArray).
   * queryFunction is a function that defines whether a document should return in the find operation or not. If queryFunction(document) returns true then the document joins the find result, otherwise it does not.
   * Remember that you cannot assume anything about the structure of the document so be careful that a missing aatribute in the document won't crush your entire program.
