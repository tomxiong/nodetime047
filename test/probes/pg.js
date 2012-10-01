
var pg = require('pg').native;


module.exports = function(cb) {
  pg.connect("tcp://postgres:postgres@localhost/postgres", function(err, client) {
    if(err) {
      console.error(err);
      cb();
      return;
    }

    client.query('create database test_db', function(err) {
      if (err) {
        console.error(err);
      }

      client.query('create temporary table test_table (str_field varchar(10), int_field integer, date_field timestamptz)', function(err) {
        if(err) {
          console.error(err);
        }
  
        client.query('insert into test_table (str_field, int_field, date_field) values ($1, $2, $3)', ['data', 123, new Date()], function(err) {
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
            client.close();
          });
        });
      });
    });
  });


  var client = new pg.Client("tcp://postgres:postgres@localhost/postgres");
  client.connect();


  var query = client.query('create temporary table test_table (str_field varchar(10), int_field integer, date_field timestamptz)');

  query.on('row', function(row) {
    console.log(row);
  });

  query.on('error', function(err) {
    console.error(err);
  });

  query.on('end', function() {
  });


  var query = client.query('errorgeneratingcommand');

  query.on('row', function(row) {
    console.log(row);
  });

  query.on('error', function(err) {
    console.error(err);
  });

  query.on('end', function() {
  });


};

