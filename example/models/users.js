var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');
var crypto = require('crypto');
var Q = require('q');
var DbStats = require('../helpers/dbstats');

var UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    facebook: { type: String, unique: true, sparse: true },
    twitter: { type: String, unique: true, sparse: true },
    google: { type: String, unique: true, sparse: true },
    github: { type: String, unique: true, sparse: true },
    tokens: Array,

    profile: {
        name: { type: String, default: '' },
    },

    resetPasswordToken: String,
    resetPasswordExpires: Date,

    createdOn: { type: Date, required: true },
    updatedOn: { type: Date, required: true }
});

UserSchema.pre('save', function(next) {
    var user = this;

    if ( !user.isModified('password') ) {
        return next();
    }

    bcrypt.genSalt(5, function(err, salt) {
        if ( err ) {
            return next(err);
        }

        bcrypt.hash(user.password, salt, null, function(err, hash) {
            if ( err ) {
                return next(err);
            }
            user.password = hash;
            next();
        });
    });
})

var bcryptP = Q.nbind(bcrypt.compare, bcrypt);

UserSchema.methods.comparePassword = function* (candidatePassword, callback) {
    return yield bcryptP(candidatePassword, this.password);
};

UserSchema.methods.gravatar = function(size, defaults) {
    if ( !size ) { 
        size = 200;
    }

    if ( !defaults ) {
        defaults = 'retro';
    }

    if ( !this.email ) {
        return 'https://gravatar.com/avatar/?s=' + size + '&d=' + defaults;
    }

    var md5 = crypto.createHash('md5').update(this.email);
    return 'https://gravatar.com/avatar/' + md5.digest('hex').toString() + '?s=' + size + '&d=' + defaults;
};

var UserModel = mongoose.model('User', UserSchema);

module.exports = UserModel;

UserModel.createUser = function (data) {
    var track = new DbStats('UserModel.createUser');

    var deferred = Q.defer();

    track.start();
    UserModel.create(data, function(err, users) {
        track.end();

		if ( err ) {
			deferred.reject(err);
		} else {
			deferred.resolve(users);
		}
  });

  return deferred.promise;
};