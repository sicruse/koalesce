var mongoose = require('mongoose');
var Q = require('q');

var StatsD = require('node-statsd').StatsD;
var StatsDClient = new StatsD();

var UserSchema = new mongoose.Schema({
    email: { type: String, required: true },
    password: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    createdOn: { type: Date, required: true },
    updatedOn: { type: Date, required: true }
});

var UserModel = mongoose.model('User', UserSchema);

module.exports = UserModel;

UserModel.createUser = function (data) {
    var deferred = Q.defer();

    mongoose.poolActiveConnections += 1;
    StatsDClient.gauge('DB.poolActiveConnections', mongoose.poolActiveConnections);
    var startTime = new Date().getTime();
    UserModel.create(data, function(err, users) {
		var endTime = new Date().getTime();
        mongoose.poolActiveConnections -= 1;
		StatsDClient.timing('DB.createUser', endTime - startTime);

		if ( err ) {
			deferred.reject(err);
		} else {
			deferred.resolve(users);
		}
  });

  return deferred.promise;
};