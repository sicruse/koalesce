
module.exports = new HtmlErrorPages();

function HtmlErrorPages() {
	if ( !(this instanceof HtmlErrorPages) ) {
		return new HtmlErrorPages();
	}

	// instance variables here
}

function configure (options) {
	this.path404Html = '/static/404.html',
	this.path500Html = '/static/500.html'
	this.path500Text = '/static/500.txt'
}

function handleError (context, error) {
	if ( this.response.type == 'application/json' ) {
		this.response.status = 500;
		this.response.body = { Error: error };
	} else if ( this.response.type == 'text/html' ) {
		this.response.body = fs.readFile(this.path500Html);
	} else if ( this.response.type == 'text/plain' ) {
		this.response.body = fs.readFile(this.path500Text);
	}
}

HtmlErrorPages.prototype.middleware = function(options) {
	configure(options);

	return function* (next) {
		try {
			yield next;
		} catch ( error ) {
			handleError(this, error);
		}
	}
}