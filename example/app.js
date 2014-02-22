var koalesce = require('..');
var config = require('./config.js');

var db = require('./db');
db.initialize(config.mongoose.uri);

process.on('uncaughtException', function (err) {
	console.log('error', err, err.stack);
});

var app = koalesce(config);
app.keys = ['my-session-secret'];