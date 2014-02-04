(function() {
  var Q = require('q');

  var StatsD = require('node-statsd').StatsD;
  var StatsDClient = new StatsD();

  var Users = require('../models/users');

  var UserData = (function() {
    function UserData() {
    }

    UserData.prototype.createUser = function (data) {
      var deferred = Q.defer();

      var startTime = new Date().getTime();

      Users.create(data, function(err, users) {
        var endTime = new Date().getTime();
        StatsDClient.timing('DB.createUser', endTime - startTime);

        if ( err ) {
          deferred.reject(err);
        } else {
          deferred.resolve(users);
        }
      });

      return deferred.promise;
    };

    UserData.prototype.test = function () {
      console.log('testing');
    };

    return UserData;
  })();

  module.exports = new UserData();

}).call(this);