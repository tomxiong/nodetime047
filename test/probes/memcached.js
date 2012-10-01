
var nMemcached = require('memcached');
var memcached = new nMemcached("127.0.0.1:11211");

module.exports = function(cb) {
  memcached.get('testkey', function(err, result){
    if(err) {
      console.error(err);
    }
  
    console.log(result);

    memcached.get('testkey', function(err, result) {
      if(err) {
        console.error(err);
      }

      console.log(result);
  
      cb();
    });
  });
};

