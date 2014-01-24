var _ = require('underscore');
var Q = require('q');

var co_body = require('madams5-co-body');
var co_busboy = require('co-busboy');
var compose = require('koa-compose');

var __fs = require('fs');
var fs = {
    readdir: Q.nfbind(__fs.readdir)
};

var koa = require('koa');
var router = require('koa-router');
var app = koa();

function assert (value, error) {
	if ( !value ) {
		throw new Error(error);
	}
}

var responseTypes = {
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
                typeof context.response.body == 'object',
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
}

function loadMiddleware (middleware) {
    var middlewareFunctions = [];

	for ( var middlewareIndex in middleware ) {
		var object = middleware[middlewareIndex];

		if ( !object.name ) {
			console.log('Koalesce(config): Middleware entry #' + middlewareIndex + ' is missing field \'name\'.');
			continue;
		}

		console.log('-- Loading middleware:', object.name);

		if ( !object.object ) {
			console.log('Koalesce(config): Middleware \'' + object.name + '\' is missing field \'object\'.');
			continue;
		}

		try {
            middlewareFunctions.push(object.object);
		} catch (err) {
			console.log('Koalesce: Error loading middleware \'' + object.name + '\'.');
			console.log(err);
		}
	}

    return middlewareFunctions;
}

function loadDependencies (basePath, list) {
    var dependencies = {};

    for ( var dependencyName in list ) {
    	try {
	        var dependencyValue = list[dependencyName];
	        if ( typeof dependencyValue  == 'string' ) {
	            dependencies[dependencyName] = require(basePath + '/' + dependencyValue);
	        } else if ( typeof dependencyValue == 'object' && dependencyValue.path !== null ) {
	            dependencies[dependencyName] = require(basePath + '/' + dependencyValue.path);
	            if ( dependency[dependencyName].filter ) {
	                dependencies[dependencyName] = dependencyValue.filter(dependencies[dependencyName]);
	            }
	        } else {
	            dependencies[dependencyName] = dependencyValue;
	        }
	    } catch ( err ) {
	    	console.log('Koalesce: Could not resolve dependency.');
	    	console.log(err);
	    }
    }

    return dependencies;
}

const CONTROLLER_DIRECTORY_NAME = 'controllers';

function* loadControllers (basePath, globalMiddleware) {
	var path = basePath + '/' + CONTROLLER_DIRECTORY_NAME;

    var files = yield fs.readdir(path);
    for ( var fileIndex in files ) {
    	var file = files[fileIndex];

    	console.log('-- Loading controller \'' + file + '\'');
    	var controller;

    	try {
    		controller = require(path + '/' + file);
    	} catch ( err ) {
    		console.log('Koalesce: Controller \'' + file +'\' contains an error.');
    		console.log(err);
    		continue;
    	}

    	if ( !controller.requests ) {
    		console.log('Koalesce: Controller \'' + file + '\' is missing field \'requests\'.');
    		continue;
    	}

    	var dependencies = loadDependencies(basePath, controller.dependencies || []);

        for ( var requestName in controller.requests ) {
        	var request = controller.requests[requestName];
			processControllerPath(globalMiddleware, file, controller, requestName, request);
        }
    }
}

// 
// request = {
//   string url
//   string requestType - http request type ('GET','POST',etc.)
//   string responseType - ('html','json','file','text') defaults to 'html'
//   array injectors (optional)
//   function* handler
// }
function processControllerPath (globalMiddleware, file, controller, requestName, request) {
	if ( !request.url ) {
		console.log('Koalesce: Controller \'' + file + '\' is missing a url for a path in \'' + requestName + '\'.');
		return;
	}

	if ( !request.handler ) {
		console.log('Koalesce: Controller \'' + file + '\' is missing a handler for \'' + requestName + '\'.');
		return;
	}

	if ( !request.requestType ) {
		requestType = 'GET';
	}

	if ( !request.responseType ) {
		responseType = 'html';
	}

	if ( !responseTypes[request.responseType] ) {
		console.log('Koalesce: Controller \'' + file + '\' has an unknown response type of \'' + request.responseType + '\' for the \'' + request.url + '\' path in \'' + requestName + '\'.');
        return;
	}

	console.log('-- Creating route', request.requestType, request.url, '\tresponseType:', request.responseType);

    var callStack = [function* (next) {
        responseTypes[request.responseType].bindType(this);
        yield next;
    }];
    callStack = callStack.concat(globalMiddleware);

    // compose all middleware for routes
    if ( controller.middleware ) {
        callStack = callStack.concat(
            _.map(controller.middleware, function (middleware) {
                return middleware.object;
            })
        );
        if ( request.middleware ) {
            callStack = callStack.concat(
                _.map(request.middleware, function (middleware) {
                    return middleware.object;
                })
            );
        }
    }

    callStack.push(function* (next) {
        yield next;
        responseTypes[request.responseType].verify(this);
    });
    callStack.push(request.handler);

    app[request.requestType.toLowerCase()](request.url, compose(callStack));
}

function createEndpoints (endpoints) {

	for ( var endpointIndex in endpoints ) {
		var endpoint = endpoints[endpointIndex];

		console.log('-- Creating endpoint', endpoint);

		if ( !endpoint.port || !endpoint.type ) {
			console.log('Koalesce(config): Endpoint entry #' + endpointIndex + ' is missing a valid port or type field.');
			continue;
		}

		try {
			if ( endpoint.type == 'http' ) {
				require('http').createServer(app.callback()).listen(endpoint.port);
			} else if ( endpoint.type == 'https' ) {
				require('https').createServer(app.callback()).listen(endpoint.port);
			} else {
				console.log('Koalesce(config): Endpoint of type \'' + endpoint.type + '\' is not valid.');
			}
		} catch ( err ) {
			console.log('Koalesce: Endpoint ' + endpoint.type + ':' + endpoint.port + ' could not be created:', err);
		}
	}
}

function loadBodyParser (limits) {
	_.defaults(limits, {
		json: '1mb',
		form: '1mb',
		text: '1mb',
		file: '1mb',
	});

	return function* (next) {
		var contentType = this.request.header['content-type'];

		var opts = {
			encoding: this.request.header['content-encoding'] || 'utf8',
			length: this.request.header['content-length']
		}

		if ( contentType == 'application/json' ) {
			opts.limit = limits.json;
			this.request.body = yield co_body.json(this, opts);
		} else if ( contentType == 'application/x-www-form-urlencoded' ) {
			opts.limit = limits.form;
			this.request.body = yield co_body.form(this, opts);
		} else if ( contentType == 'text/plain' ) {
			opts.limit = limits.text;
			this.request.body = yield co_body.text(this, opts);
		} else if ( contentType == 'form/multipart' ) {
			var parts = co_busboy(this);
			this.request.body = {};
			this.request.body.fields = parts.fields;
			this.request.body.files = [];

			var part;
			while ( part = yield parts ) {
				this.request.body.files.push(part);
			}
		} else {
			console.log('Koalesce: Invalid content type \'' + contentType + '\'.');
			this.status = 415;
			this.body = 'Unsupported or missing content-type';
			return;
		}

		yield next;
	};
}

function* initialize (config) {
	_.defaults(config, { 
		basePath: '.',
		limits: {},
		middleware: [],
		endpoints: [ { port: 4000, type: 'http' } ]
	});

	console.log('Loading middleware');
	var middlewareFunctions = loadMiddleware(config.middleware);

	console.log('Loading body parser');
	middlewareFunctions.push(loadBodyParser(config.limits));

    console.log('Creating router');
    app.use(router(app));

	console.log('Binding controllers');
	yield Q.async(loadControllers)(config.basePath, middlewareFunctions);

	console.log('Creating endpoints');
	createEndpoints(config.endpoints);;

	// models
	// views
};

var koalesce = function (config) {
	Q.async(initialize)(config).fail(function (err) {
		console.log('Error Initializing Koalesce');
		console.log(err);
	});
};

module.exports = koalesce;
