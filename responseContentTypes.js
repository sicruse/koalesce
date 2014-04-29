function assert (value, error) {
    if ( !value ) {
        throw new Error(error);
    }
}

module.exports = {
    'text': {
        bindType: function (context) {
            context.response.type = 'text/plain';
        },
        validate: function (context) {
            var type = typeof context.response.body;
            assert(
                typeof context.response.body == 'string' ||
                Buffer.isBuffer(context.response.body) ||
                context.response.body instanceof Stream,
                'Return type \'text\' must be a string, buffer, or stream.'
            ); 
        }   
    },
    'html': {
        bindType: function (context) {
            context.response.type = 'text/html';
        },
        validate: function (context) {
            assert(
                typeof context.response.body == 'string' ||
                Buffer.isBuffer(context.response.body) ||
                true, //context.response.body instanceof Stream,
                'Return type \'text\' must be a string, buffer, or stream.'
            ); 
        }
    },
    'json': {
        bindType: function (context) {
            context.response.type = 'application/json';
        },
        validate: function (context) {
	    assert(
                context.response.body !== null && typeof context.response.body == 'object',
                'Return type \'json\' must be an object.'
            );
        }
    },
    'file': {
        bindType: function (context) {
            if ( !context.response.type ) {
                context.response.type = 'application/octet-stream';
            }    
        },
        validate: function (context) {
            assert(
                typeof context.response.body == 'string' ||
                Buffer.isBuffer(context.response.body) ||
                context.response.body instanceof Stream,
                'Return type \'text\' must be a string, buffer, or stream.'
            );            
        }
    }
};
