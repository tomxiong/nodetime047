
var fs = require('fs');

module.exports = function(cb) {
  fs.mkdirSync('/tmp/fstest');

  fs.rmdirSync('/tmp/fstest');

  fs.mkdir('/tmp/fstest', function(err) {
    if(err) console.error(err);

    fs.rmdir('/tmp/fstest', function(err) {
      if(err) console.error(err);

      cb();
    });
  });
};

