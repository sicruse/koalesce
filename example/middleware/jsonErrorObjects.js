var _ = require('underscore');

module.exports = (function () {
    var options = {};

    function* middleware (next) {
        if ( this.route.responseType === 'json' ) {
            try {
                yield next;
            } catch ( error ) {
                this.response.status = error.status ? error.status : 500;
                this.response.body = { 
                    error: error.toString, 
                    trace: error.stack,
                    originalBody: this.response.body
                };
                if ( options.rethrow ) {
                    throw error;
                }
            }
        } else {
            yield next;
        }
    }

    return {
        configure: function (newOptions) {
            if ( !newOptions ) {
                newOptions = {};
            } 
            
            _.defaults(newOptions, {
                'rethrow': true
            });

            options = newOptions;   
        },
        middleware: function (options) {
            this.configure(options);
            return middleware;
        }
    };
}).call(this);

