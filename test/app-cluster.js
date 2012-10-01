
var nodetime = require('nodetime');
nodetime.on('session', function(token) { 
  console.log('on session', token);
});
nodetime.profile({debug: true, stdout: false});

var cluster = require('cluster');

process.on('uncaughtException', function (err) {
  console.error(err, err.stack)
});


if(cluster.isMaster) {
  cluster.fork();

  cluster.on('death', function(worker) {
    console.log('worker ' + worker.pid + ' died');
  });
}
else {
  var probes = require('./probes');

  var http = require('http');
  http.createServer(function(req, res) {
    probes(process.argv.slice(2), function() {
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end('Hello World\n');
    });   
  }).listen(3000);
  
  console.log('cluster app started');
}
