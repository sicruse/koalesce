var _ = require('underscore');
var _s = require('underscore.string');
var Q = require('q');

var co_body = require('madams5-co-body');
var co_busboy = require('co-busboy');
var compose = require('koa-compose');

var validation = require('./validation');

var koa = require('koa');
var router = require('koa-router');

var __fs = require('fs');
var fs = {
    readdir: Q.nfbind(__fs.readdir)
};

var responseContentTypes = require('./responseContentTypes');

module.exports = Koalesce;

function* Koalesce (config, logInfo, logWarning, logError) {
    this.config = config;
    
    this._logInfoFunc = logInfo;
    this._logWarningFunc = logWarning;
    this._logErrorFunc = logError;

    validation.validateConfiguration(config);

    if ( process.argv.length > 2 ) {
        switch ( process.argv[2] ) {
            case 'routes': 
                yield* this._printRoutes();
                process.exit(0);
            break;
        }
    }

    this.app = koa();

    return this;
}

Koalesce.prototype._logInfo = function () {
    if ( this._logInfoFunc ) {
        this._logInfoFunc.apply(this, arguments);
    } else {
        console.log.apply(this, arguments);
    }
};

Koalesce.prototype._logWarning = function () {
    if ( this._logWarningFunc ) {
        this._logWarningFunc.apply(this, arguments);
    } else {
        console.log.apply(this, arguments);
    }
};

Koalesce.prototype._logError = function () {
    console.log(this._logErrorFunc);
    if ( this._logErrorFunc ) {
        this._logErrorFunc.apply(this, arguments);
    } else {
        console.log.apply(this, arguments);
    }
};

Koalesce.prototype._printRoutes = function* () {
    var Table = require('cli-table');
    var table = new Table({
        head: ['Controller', 'Action', 'Request', 'Response', 'URL'],
        colWidths: [15, 10, 10, 10, 35],
        //colWidths: [16, 8, 6, 6, 44],
        chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' }
    })

    var config = this.config;

    for ( var i = 0 ; i < config.controllerPaths.length ; i++ ) {
        var path = config.basePath + '/' + config.controllerPaths[i];

        var files = yield fs.readdir(path);
        for ( var fileIndex in files ) {
            var file = files[fileIndex];

            var controller;
            try {
                controller = require(path + '/' + file);
            } catch ( err ) {
                this._logError('Koalesce: Controller \'' + file +'\' contains an error.', err);
                continue;
            }

            if ( !controller.routes ) {
                this._logError('Koalesce: Controller \'' + file + '\' is missing field \'routes\'.');
                continue;
            }

            for ( var routeName in controller.routes ) {
                var route = controller.routes[routeName];
                table.push([file, route.action, route.requestContentType || '-', route.responseContentType, route.url]);
            }
        }
    }

    console.log(table.toString());
};

Koalesce.prototype.start = function* () {
    this._loadStores();
    this._loadMiddleware();
    this._loadBodyParser();
    this._createRouter();
    yield* this._loadControllers();
    this._createEndpoints();
};

Koalesce.prototype._loadStores = function () {
    this._logInfo('Loading stores');

    for ( var storeName in this.config.stores ) {
        this._logInfo('-- Loading store:', storeName);
        var storeConfig = this.config.stores[storeName];
        var storeFile = this.config.basePath + '/' + storeConfig.file;
        var store = require(storeFile);
        if ( store.initialize ) {
            store.initialize(storeConfig);
        }
    }
}

Koalesce.prototype._loadMiddleware = function () {
    this._logInfo('Loading middleware');

    var app = this.app;
    
    this._routeAgnosticMiddleware = this._loadMiddlewareSet(this.config.middleware.routeAgnostic); 
    _.each(this._routeAgnosticMiddleware, function (middleware) { app.use(middleware); });
    this._routeAwareMiddleware = this._loadMiddlewareSet(this.config.middleware.routeAware);
};

Koalesce.prototype._loadMiddlewareSet = function (middleware) {
    var result = [];

    for ( var middlewareIndex in middleware ) {
        var object = middleware[middlewareIndex];

        if ( !object.name ) {
            this._logWarning('Koalesce(config): Middleware entry #' + middlewareIndex + ' is missing field \'name\'.');
            continue;
        }

        this._logInfo('-- Loading middleware:', object.name);

        if ( !object.object ) {
            this._logWarning('Koalesce(config): Middleware \'' + object.name + '\' is missing field \'object\'.');
            continue;
        }

        // check if it's a generator function or array of generator functions
        try {
            if ( Array.isArray(object.object) ) {
                for ( var i = 0 ; i < object.object.length ; i++ ) {
                    result.push(object.object[i]);
                }
            } else { // it's a generator function
                result.push(object.object);
            }
        } catch (err) {
            this._logError('Koalesce: Error loading middleware \'' + object.name + '\'.', err);
        }
    }

    return result;
};

Koalesce.prototype._loadBodyParser = function () {
    this._logInfo('Loading body parser');

    var limits = this.config.bodyLimits;

    var self = this;

    this.app.use(function* (next) {
        var contentType = this.request.header['content-type'];

        var opts = {
            encoding: this.request.header['content-encoding'] || 'utf8',
            length: this.request.header['content-length']
        }

        if ( this.request.method !== 'GET' ) { 
            if ( _s.startsWith(contentType, 'application/json') ) {
                opts.limit = limits.json;
                this.request.body = yield co_body.json(this, opts);
            } else if ( _s.startsWith(contentType, 'application/x-www-form-urlencoded') ) {
                opts.limit = limits.form;
                this.request.body = yield co_body.form(this, opts);
            } else if ( _s.startsWith(contentType, 'text/plain') ) {
                opts.limit = limits.text;
                this.request.body = yield co_body.text(this, opts);
            } else if ( _s.startsWith(contentType, 'form/multipart') ) {
                var parts = co_busboy(this);
                this.request.body = {};
                this.request.body.fields = parts.fields;
                this.request.body.files = [];

                var part;
                while ( part = yield parts ) {
                    this.request.body.files.push(part);
                }
            } else {
                self._logWarning('Koalesce: Invalid content type \'' + contentType + '\'.');
                this.status = 415;
                this.body = 'Unsupported or missing content-type';
                return;
            }
        }

        yield next;
    });
};

Koalesce.prototype._createRouter = function () {
    var app = this.app;

    this._logInfo('Creating router');
    app.use(router(app));
};

Koalesce.prototype._loadControllers = function* () {
    var config = this.config;

    this._logInfo('Binding controllers');

    var routeAwareMiddleware = this._routeAwareMiddleware;

    for ( var i = 0 ; i < config.controllerPaths.length ; i++ ) {
        var path = config.basePath + '/' + config.controllerPaths[i];

        var files = yield fs.readdir(path);
        for ( var fileIndex in files ) {
            var file = files[fileIndex];

            this._logInfo('-- Loading controller \'' + file + '\'');
            var controller;

            try {
                controller = require(path + '/' + file);
            } catch ( err ) {
                this._logError('Koalesce: Controller \'' + file +'\' contains an error.', err);
                continue;
            }

            if ( !controller.routes ) {
                this._logError('Koalesce: Controller \'' + file + '\' is missing field \'routes\'.');
                continue;
            }

            var dependencies = this._loadDependencies(controller.dependencies || []);

            for ( var routeName in controller.routes ) {
                var route = controller.routes[routeName];
                this._loadRoute(file, controller, dependencies, routeName, route);
            }
        }
    }
}

Koalesce.prototype._loadDependencies = function (list) {
    var dependencies = {};

    for ( var dependencyName in list ) {
        try {
            var dependencyValue = list[dependencyName];
            if ( typeof dependencyValue === 'string' ) {
                dependencies[dependencyName] = require(this.config.basePath + '/' + dependencyValue);
            } else {
                dependencies[dependencyName] = dependencyValue;
            }
        } catch ( err ) {
            this._logError('Koalesce: Could not resolve dependency.', err);
        }
    }

    return dependencies;
};

Koalesce.prototype._loadRoute = function (file, controller, dependencies, routeName, route) {
    validation.validateRoute(file, routeName, route);

    this._logInfo('-- Creating route', route.action, '(' + route.responseContentType + ')', route.url);

    var callStack = [function* (next) {
        this.route = route;
        responseContentTypes[route.responseContentType].bindType(this);
        yield next;
        responseContentTypes[route.responseContentType].validate(this);
    }];

    callStack = callStack.concat(this._routeAwareMiddleware);

    // compose all middleware for routes
    if ( controller.middleware ) {
        callStack = callStack.concat(
            _.map(controller.middleware, function (middleware) {
                return middleware.object;
            })
        );
        if ( route.middleware ) {
            callStack = callStack.concat(
                _.map(route.middleware, function (middleware) {
                    return middleware.object;
                })
            );
        }
    }

    var routeDependencies = this._loadDependencies(route.dependencies || []);

    callStack.push(function* (next) {
        for ( var dependencyName in dependencies ) {
            var dependency = dependencies[dependencyName];
            this[dependencyName] = dependency;
        }
        for ( var dependencyName in routeDependencies ) {
            var dependency = routeDependencies[dependencyName];
            this[dependencyName] = dependency;
        }
        yield next;
    });
    callStack.push(route.handler);

    this.app[route.action.toLowerCase()](route.url, compose(callStack));
};

Koalesce.prototype._createEndpoints = function () {
    this._logInfo('Creating endpoints');

    for ( var endpointIndex in this.config.endpoints ) {
        var endpoint = this.config.endpoints[endpointIndex];

        this._logInfo('-- Creating endpoint', endpoint);

        if ( !endpoint.port || !endpoint.type ) {
            this._logError('Koalesce(config): Endpoint entry #' + endpointIndex + ' is missing a valid port or type field.');
            continue;
        }

        try {
            if ( endpoint.type == 'http' ) {
                require('http').createServer(this.app.callback()).listen(endpoint.port);
            } else if ( endpoint.type == 'https' ) {
                require('https').createServer(this.app.callback()).listen(endpoint.port);
            } else {
                this._logError('Koalesce(config): Endpoint of type \'' + endpoint.type + '\' is not valid.');
            }
        } catch ( err ) {
            this._logError('Koalesce: Endpoint ' + endpoint.type + ':' + endpoint.port + ' could not be created:', err);
        }
    }
};
