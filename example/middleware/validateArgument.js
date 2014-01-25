var Joi = require('joi');
var Exception = require('../helpers/exception');

module.exports = (function () {
    var schema = {};

    function* middleware (next) {
        if ( this.query.hasOwnProperty('describe') ) {
            // override the response type here
            this.response.type = 'application/json';
            this.response.status = 200;
            this.body = Joi.object(schema).describe();
        } else {
            var err = Joi.validate(this.request.body, schema);
            if ( err ) {
                throw new Exception(400, 'Bad Request: ' + err);
            }
            yield next;
        }
    }

    return {
        configure: function (newSchema) {
            schema = newSchema;
        },
        middleware: function (newSchema) {
            this.configure(newSchema);
            return middleware;
        }
    };
}).call(this);

