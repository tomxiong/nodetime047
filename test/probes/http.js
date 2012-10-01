
var http = require('http');
var https = require('https');

module.exports = function(cb) {

  function error() {
    var client = http.get({hostname: 'nonexisting'}, function(cRes) {
      cRes.on('end', function() { 
        success();
      });

      cRes.on('error', function(err) {
        console.error(err);

        success();
      });
    });

    client.on('error', function(err) {
      console.error(err);

      success();
    });
  };


  function success() {
    var client = http.get({hostname: 'search.cliqz.com'}, function(cRes) {
      cRes.on('end', function() { 
        cb();
      });

      cRes.on('error', function(err) {
        console.error(err);

        cb();
      });
    });

    client.on('error', function(err) {
      console.error(err);

      cb();
    });
  };

  error();
};

