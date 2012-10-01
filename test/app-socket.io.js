
require('nodetime').profile({debug: true});

process.on('uncaughtException', function (err) {
  console.error(err, err.stack)
});

var probes = require('./probes');

var express = require('express');
var app = express.createServer();
app.set('views', __dirname);
app.set('view options', {layout: false});

app.get('/', function(req, res){
  res.render('app-socket.io.ejs');
});

app.listen(3000);


var io = require('socket.io').listen(app);

io.sockets.on('connection', function (socket) {
  socket.on('ping', function (data) {
    socket.emit('pong', data + ' first', function() {
      console.log('message received');
    });
  
    socket.emit('pong', data + ' second');
  });
});

console.log('socket.io app started');
