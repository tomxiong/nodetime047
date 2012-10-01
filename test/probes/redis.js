
var redis = require('redis');
var client = redis.createClient();

module.exports = function(cb) {
  client.mget('first', 'second', 'third', '4', 5, undefined, null, 'verylongverylongverylongverylongverylongverylongverylongverylongverylong', 9, 10, 12, function(err) {
    if(err) {
      console.error(err);
    }

    client.keys(function(err, keys) {
      if(err) {
        console.error(err);
      }
  
      cb();
    });
  });
};

