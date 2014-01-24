var Q = require('q');
var _ = require('underscore');

var __fs = require('fs');
var fs = {
	readFile: Q.nfbind(__fs.readFile)
};

module.exports = (function () {
    var path404Html;
    var path500Html;
    var path500Text;

	function* middleware (next) {
		try {
			yield next;
		} catch ( error ) {
			console.log('error', error);

			if ( this.response.type === 'application/json' ) {
				this.response.status = error.status ? error.status : 500;
				this.response.body = { error: error.toString(), trace: error.stack };
			} else if ( this.response.type === 'text/html' ) {
				this.response.body = yield fs.readFile('./static/500.html');
			} else if ( this.response.type === 'text/plain' ) {
				this.response.body = yield fs.readFile(this.path500Text);
			}
		}
	}

    return {
		configure: function (options) {
			if ( !options ) {
				options = {};
			}
			
	    	_.defaults(options, { 
	            path404Html: 'static/404.html',
	            path500Html: 'static/500.html',
	            path500Text: 'static/500.txt' 
	    	});

	    	path404Html = options.path404Html;
	    	path500Html = options.path500Html;
	    	path500Text = options.path500Text;
	    },
	    middleware: function (options) {
	    	this.configure(options);
			return middleware;
	    }
	};
}).call(this);

