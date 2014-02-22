var passport = require('koa-passport');
//var Joi = require('joi');
//var Exception = require('../helpers/exception');

var passportRedirect = {
    successRedirect: '/app',
    failureRedirect: '/logout'
};

module.exports = {

    dependencies : {
        Auth: 'helpers/auth',
        Users: 'models/users'
    },

    // runs in order before any route on this controller
    middleware : [
        {
            name: 'controllerMiddleware',
            object: function* (next) {
                console.log('controllerMiddleware start');
                this.test1 = 1234;
                yield next;
                console.log('controllerMiddleware end');
            }
        },
        {
            name: 'req-translate',
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
            url: '/auth/facebook',
            action: 'GET',
            handler: passport.authenticate('facebook')
        },
        authTwitter: {
            url: '/auth/twitter',
            action: 'GET',
            handler: passport.authenticate('twitter')

        },
        authTwitterCallback: {
            url: '/auth/twitter/callback',
            action: 'GET',
            responseContentType: 'html',
            handler: passport.authenticate('twitter', passportRedirect)
        },
        authGoogle: {
            url: '/auth/google',
            action: 'GET',
            responseContentType: 'html',
            handler: function* () {
                console.log('beginning authentication');
                yield passport.authenticate('google');
            }
        },
        authGoogleCallback: {
            url: '/auth/google/callback',
            action: 'GET',
            responseContentType: 'html',
            handler: function* () {
                console.log('handling callback');
                yield passport.authenticate('google', passportRedirect);
            }
        }
    }
};
