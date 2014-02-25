var passport = require('koa-passport');
var config = require('../config');
//var Joi = require('joi');
//var Exception = require('../helpers/exception');

var passportRedirect = {
    successRedirect: '/app',
    failureRedirect: '/logout'
};

module.exports = {

    dependencies : {
        Users: 'models/users'
    },

    // runs in order before any route on this controller
    middleware : [
        {
            name: 'passport-translate-query',
            object: function* (next) {
                this.req.query = this.query;
                yield next;
            }
        }
    ],

    routes : {
        getLogin: {
            url: '/login',
            action: 'GET',
            responseContentType: 'html',
            handler: function* () {
                yield this.render('login', {});
            }
        },
        postLogin: {
            url: '/login',
            action: 'POST',
            requestContentType: 'form',
            responseContentType: 'html',
            handler: passport.authenticate('local', passportRedirect)
        },
        authFacebook: {
            url: config.auth.facebook.path,
            action: 'GET',
            handler: passport.authenticate('facebook')
        },
        authFacebookCallback: {
            url: config.auth.facebook.callbackPath,
            action: 'GET',
            handler: passport.authenticate('facebook', passportRedirect)
        },
        authTwitter: {
            url: config.auth.twitter.path,
            action: 'GET',
            handler: passport.authenticate('twitter')
        },
        authTwitterCallback: {
            url: config.auth.twitter.callbackPath,
            action: 'GET',
            responseContentType: 'html',
            handler: passport.authenticate('twitter', passportRedirect)
        },
        authGoogle: {
            url: config.auth.google.path,
            action: 'GET',
            responseContentType: 'html',
            handler: passport.authenticate('google')
        },
        authGoogleCallback: {
            url: config.auth.google.callbackPath,
            action: 'GET',
            responseContentType: 'html',
            handler: passport.authenticate('google', passportRedirect)
        }
    }
};
