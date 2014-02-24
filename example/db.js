var mongoose = require('mongoose');
var Q = require('q');

var DB = {};

module.exports = DB;

DB.initialize = function (uri) {
	var deferred = Q.defer();

	mongoose.connect(uri, function(err) {
		if ( err ) {
			console.log('Could not connect to database.', err);
			deferred.reject(err);
		} else {
			console.log('Connected to database.');
			deferred.resolve();
		}
	});

	return deferred.promise;
};