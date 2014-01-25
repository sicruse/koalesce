var Q = require('q');
var _ = require('underscore');

var __fs = require('fs');
var fs = {
    readFile: Q.nfbind(__fs.readFile)
};

module.exports = (function () {
    var options = {};

    function* middleware (next) {
        if ( this.route.responseContentType == 'html' ) {
            try {
                yield next;

                if ( options[this.response.status] ) {
                    var filename = options[this.response.status];
                    this.response.body = yield fs.readFile(filename);   
                }
            } catch ( error ) {
                this.response.status = error.status ? error.status : 500;
                renderErrorStatus.call(this, error);
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

