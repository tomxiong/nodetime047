
var cassandra = require('cassandra');

module.exports = function(cb) {
  var client = new cassandra.Client("usergraph1.clyqz.com:9160");
  var CL = cassandra.ConsistencyLevel;

  client.consistencyLevel({
    write: CL.ONE,
    read: CL.ONE
  });

  client.connect("TestKeySpace");
  var cf = client.getColumnFamily("TestColumnFamily");

  var data = cf.get("testkey", function(err, data) {
    if(err) {
      console.error(err);
      return cb(err);
    }
 
    console.log(data);
    cb();
  });
};

module.exports(function(err) {
  if(err) console.log(err, err.stack);
  console.log('done');
});
