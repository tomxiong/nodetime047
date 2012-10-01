
var cc = require('cassandra-client');

module.exports = function(cb) {
  var Connection = cc.Connection;
  var client = new Connection({host:'localhost', port:9160, keyspace:'TestKeyspace'});
  
  client.connect(function(err) {
    if(err) {
      cb(err);
      return;
    }

    client.execute('SELECT * FROM TestColumnFamily', [], function(err, rows) {
      if(err) {
        cb(err);
      } 
      else {
        console.log(rows);
        cb();
      }
    });
  });
};

