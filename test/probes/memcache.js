
var memcache = require('memcache');

module.exports = function(cb) {
  var client = new memcache.Client();

  client.on('error', function(err) {
    console.log(err);
  });

  client.on('timeout', function(err) {
    console.log(err);
  });

  client.on('connect', function() {
    client.add('testkey','testval', function(err, result){
      if(err) {
        console.error(err);
      }
  
      console.log(result);

      client.get('testkey', function(err, result) {
        if(err) {
          console.error(err);
        }

        console.log(result);
  
        cb();
      });
    });
  });

  client.connect();
};

