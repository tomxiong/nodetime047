
var nodetime = require('../lib/nodetime');
nodetime.on('sample', function(sample) { 
  //console.log(sample);
});

nodetime.profile({debug: true, headless: false});

process.on('uncaughtException', function (err) {
  console.error(err, err.stack)
});

var probes = require('./probes');

var http = require('http');
http.createServer(function(req, res) {
  probes(process.argv.slice(2), function() {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Hello World\n');
  });   

}).listen(3000);

console.log('http app started');
