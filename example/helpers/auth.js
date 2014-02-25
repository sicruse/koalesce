var passport = require('koa-passport');

function Auth () {
}

Auth.initialize = function (config) {
/*
    passport.serializeUser(function(user, done) {
        done(null, user.id)
    });

    passport.deserializeUser(function(id, done) {
        done(null, user)
    });
*/
    var LocalStrategy = require('passport-local').Strategy
    passport.use(new LocalStrategy(function(username, password, done) {
        // retrieve user ...
        if (username === 'test' && password === 'test') {
            done(null, { username: username, password: password });
        } else {
            done(null, false)
        }
    }))

    var FacebookStrategy = require('passport-facebook').Strategy;
    passport.use(
        new FacebookStrategy({
            clientID: config.facebook.clientId,
            clientSecret: config.facebook.secret,
            callbackURL: config.uri + config.facebook.callbackPath
        },
        function(token, tokenSecret, profile, done) {
            // retrieve user ...
            done(null, user)
        })
    );

    var TwitterStrategy = require('passport-twitter').Strategy;
    passport.use(
        new TwitterStrategy({
            consumerKey: config.twitter.consumerKey,
            consumerSecret: config.twitter.secret,
            callbackURL: config.uri + config.twitter.callbackPath
        },
        function(token, tokenSecret, profile, done) {
            // retrieve user ...
            done(null, user)
        })
    );

    var GoogleStrategy = require('passport-google').Strategy;
    passport.use(
        new GoogleStrategy({
            returnURL: config.uri + config.google.callbackPath,
            realm: config.uri
        },
        function(identifier, profile, done) {
            console.log(profile);
            // retrieve user ...
            done(null, user)
        })
    );
}

module.exports = Auth;
