
var Db = require('mongodb').Db;
var Server = require('mongodb').Server;

module.exports = function(cb) {
  var client = new Db('test', new Server("127.0.0.1", 27017, {}));
  client.open(function(err) {
    client.collection('test_col', function(err, collection) {
      if(err) {
        console.error(err);
        cb();
        return;
      }
  
      collection.insert({test:123}, function(err, docs) {
        if(err) {
          console.error(err);
          cb();
          return;
        }

        collection.count({test:123}, function(err) {
          if(err) {
            console.error(err);
          }
  
          cb();
        });
      });
    });
  });
};

