var _ = require('underscore');

module.exports = (function () {
    var options = {};

    function* middleware (next) {
        try {
            yield next;
        } catch ( error ) {
            // submit tracking data to tracker
            console.log('error', error);

            if ( options.rethrow ) {
                throw error;
            }
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
            var session = require('koa-session');
            

            this.configure(options);
            return middleware;
        }
    };
}).call(this);

