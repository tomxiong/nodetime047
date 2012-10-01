
var mysql = require('mysql');

var client = mysql.createClient({
  user: 'root',
  password: ''
});

module.exports = function(cb) {
  client.query('create database test_db', function(err) {
    if (err) {
      console.error(err);
    }

    client.query('use test_db', function(err) {
      client.query('create temporary table test_table (id int(11) auto_increment, test_field text, created datetime, primary key(id))', function(err) {
        if(err) {
          console.error(err);
        }
  
        client.query('insert into test_table set test_field=?, created=?', ['data', '2012-03-25 10:00:00'], function(err) {
          if(err) {
            console.error(err);
            cb();
            return;
          }

          client.query('select * from test_table', function(err) {
            if(err) {
              console.error(err);
              cb();
              return;
            }
  
            cb();
          });
        });
      });
    });
  });
};

