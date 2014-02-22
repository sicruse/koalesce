var koalesce = require('..');
var config = require('./config.js');

var db = require('./db');
db.initialize(config.mongoose.uri);

koalesce(config);
