var Joi = require('joi');
var Exception = require('../helpers/exception');

module.exports = {

    // runs in order before any route on this controller
    middleware : [
        {
            name: 'testMid1',
            object: function* (next) {
                console.log('controller1 start');
                this.test1 = 1234;
                yield next;
                console.log('controller1 end');
            }
        }
    ],

    routes : {
        create: {
            url: '/sample',
            action: 'POST',
            requestContentType: 'json',
            responseContentType: 'html',
            middleware: [ // [optional] runs in order before this specific route
                { 
                    name: 'route1', 
                    object: function* (next) {
                        console.log('route1 start');
                        yield next;
                        console.log('route1 end');
                    }
                },
                {
                    name: 'route2',
                    object: function* (next) {
                        console.log('route2 start');
                        yield next;
                        console.log('route2 end');
                    }
                }
            ], 
            handler: function* () {
                console.log('create', this.test1);
                yield this.render('main', { title: "testing" });
            }
        },
        retrieve: {
            url:'/sample/:id',
            action: 'GET',
            responseContentType: 'json',
            handler: function* () {
                console.log('retrieve', this.params.id);
                this.body = {};
            }
        },
        update: {
            url: '/sample/:id',
            action: 'PUT',
            responseContentType: 'json',
            handler: function* () {
                throw new Exception(500, 'Internal Server Error Message');
                console.log('update', this.params.id, this.request.body);
                this.body = {};
            }
        },
        delete: {
            url: '/sample/:id', 
            action: 'DELETE',
            responseContentType: 'html',
            middleware: [
                {
                    name: 'validate argument',
                    object: require('../middleware/validateArgument').middleware({
                        username: Joi.string().alphanum().min(3).max(30).required(),
                        password: Joi.string().regex(/[a-zA-Z0-9]{3,30}/),
                        birthyear: Joi.number().integer().min(1900).max(2013),
                        email: Joi.string().email()
                    })
                }
            ],
            handler: function* () {
                throw new Exception(500, 'Internal Server Error Message');
                console.log('delete', this.id);
                this.body = {};
            }
        }
    }
}
