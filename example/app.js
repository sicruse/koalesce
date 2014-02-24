var Q = require('q');

Q.spawn(startApp);

function* startApp () {
	var koalesce = require('..');
	var config = require('./config.js');

	var db = require('./db');
	yield db.initialize(config.mongoose.uri);

	var app = koalesce(config);
	app.keys = ['my-session-secret'];	
}

process.on('uncaughtException', function (err) {
	console.log('error', err, err.stack);
});