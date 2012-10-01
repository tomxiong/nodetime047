
require('nodetime').profile({debug: true});

process.on('uncaughtException', function (err) {
  console.error(err, err.stack)
});

var probes = require('./probes');

var express = require('express');
var app = express.createServer();

app.get('/', function(req, res){
  probes(process.argv.slice(2), function() {
        res.send('Hello World');
  });
});

app.listen(3000);

console.log('express app started');
