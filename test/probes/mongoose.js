
var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/test');

var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

mongoose.model('TestDoc', new Schema({
  test_id: ObjectId, 
  test_str: String, 
  test_date: Date 
}));


module.exports = function(cb) {
  var TestDoc = mongoose.model('TestDoc');
  testDoc = new TestDoc();
  testDoc.test_str = "some string";
  testDoc.test_date = new Date();

  testDoc.save(function() {
    TestDoc.find(function(arr) {
      cb();
    });
  });
};

