'use strict';

var _ = require('underscore');
var _s = require('underscore.string');
var Q = require('q');
var HttpServer = require('./httpServer');

var co_body = require('co-body');
var co_busboy = require('co-busboy');
var compose = require('koa-compose');

var validation = require('./validation');

var koa = require('koa');
var router = require('koa-router');

var __fs = require('fs');
var fs = {
    readdir: Q.nfbind(__fs.readdir),
    stat: Q.nfbind(__fs.stat)
};

var responseContentTypes = require('./responseContentTypes');

module.exports = Koalesce;

function* Koalesce (config, logInfo, logWarning, logError) {
    this.config = config;
    
    this._logInfoFunc = logInfo;
    this._logWarningFunc = logWarning;
    this._logErrorFunc = logError;

    validation.validateConfiguration(config);

    yield* this._loadStores();
    yield* this._loadControllers();

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
    if ( this._logErrorFunc ) {
        this._logErrorFunc.apply(this, arguments);
    } else {
        console.log.apply(this, arguments);
    }
};

Koalesce.prototype._loadStores = function* () {
    this._logInfo('Loading stores');

    this.stores = {};

    for ( let storeName in this.config.stores ) {
        this._logInfo('-- Loading store:', storeName);
        let storeConfig = this.config.stores[storeName];
        let storeFilePath = this.config.basePath + '/' + storeConfig.file;
        this.stores[storeFilePath] = {
            config: storeConfig,
            instance: require(storeFilePath)
        };
    }
};

Koalesce.prototype._loadControllers = function* () {
    let config = this.config;

    this._logInfo('Loading controllers');

    this.controllers = {};

    for ( let i = 0 ; i < config.controllerPaths.length ; i++ ) {
        let path = config.basePath + '/' + config.controllerPaths[i];

        let files = yield fs.readdir(path);
        for ( let fileIndex in files ) {
            let file = files[fileIndex];
            let filePath = path + '/' + file;
            let fileStat = yield fs.stat(filePath);
            let name = config.controllerPaths[i] + '.' + file;

            if ( fileStat.isFile() ) {
                this._logInfo('-- Loading controller \'' + filePath + '\'');

                let controller = {
                    name: name,
                    path: path,
                    file: file,
                    filePath: filePath,
                };

                try {
                    controller.instance = require(filePath);
                } catch ( err ) {
                    this._logError('Koalesce: Controller \'' + filePath +'\' contains an error.', err);
                    continue;
                }

                let errors = validation.validateController(filePath, controller.instance);

                this.controllers[name] = controller;

                let middleware = [];
                middleware = middleware.concat(this.config.middleware.routeAgnostic);
                middleware = middleware.concat(this.config.middleware.routeAware);

                if ( controller.middleware ) {
                    middleware = middleware.concat(controller.middleware);
                }

                controller._resolvedMiddleware = middleware;

                if ( controller.instance.routes ) {
                    for ( let routeName in controller.instance.routes ) {
                        let route = controller.instance.routes[routeName];
                        let routeMiddleware = middleware.slice();

                        if ( route.middleware ) {
                            routeMiddleware = routeMiddleware.concat(route.middleware);
                            // chop off object from route middleware
                        }

                        route._composedMetadata = this._routeComposeMetadata(routeMiddleware, route);
                        route.getMetadata = function* () {
                            let context = {};
                            context.route = route;
                            yield* route._composedMetadata.call(context);
                            delete context.route;
                            return context;
                        };

                        route._resolvedMiddleware = routeMiddleware;
                    }
                }
            }
        }
    }
};

Koalesce.prototype._routeComposeMetadata = function (middleware, route) {
    let metadataFuncs = [];

    for ( let i = 0 ; i < middleware.length ; i++ ) {
        if ( middleware[i].metadata ) {
            metadataFuncs.push(middleware[i].metadata);
        }
    }

    if ( route.metadata ) {
        metadataFuncs.push(route.metadata);
    }

    return compose(metadataFuncs);
}

Koalesce.prototype._printRoutes = function* () {
    let Table = require('cli-table');
    let table = new Table({
        head: ['Controller', 'Method', 'Request', 'Response', 'URL'],
        colWidths: [20, 10, 10, 10, 62],
        //colWidths: [16, 8, 6, 6, 44],
        chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' }
    });

    let config = this.config;

    for ( let controllerPath in this.controllers ) {
        let file = this.controllers[controllerPath].file;
        let controller = this.controllers[controllerPath].instance;

        for ( let routeName in controller.routes ) {
            let route = controller.routes[routeName];
            table.push([file, route.method, route.requestContentType || '-', route.responseContentType, route.url]);
        }
    }

    console.log(table.toString());
};

Koalesce.prototype.start = function* () {
    this._initializeBodyParser();
    this._initializeMiddleware();
    this._initializeRouter();
    yield* this._initializeStores();
    yield* this._initializeControllers();
    yield* this._initializeEndpoints();
};

Koalesce.prototype._initializeStores = function* () {
    this._logInfo('Initializing stores');

    for ( let storeName in this.stores ) {
        let store = this.stores[storeName];
        this._logInfo('-- Initializing store:', storeName);
        if ( store.instance.initialize ) {
            yield* store.instance.initialize(store.config);
        }
    }
};

Koalesce.prototype._initializeControllers = function* () {
    let config = this.config;

    this._logInfo('Initializing controllers');

    for ( var pathName in this.controllers ) {
        let controller = this.controllers[pathName];

        let dependencies = this._buildDependencies(controller.instance.dependencies || [], 'controller \'' + controller.filePath + '\'');

        for ( let routeName in controller.instance.routes ) {
            let route = controller.instance.routes[routeName];
            this._initializeRoute(controller.file, controller.instance, dependencies, routeName, route);
        }
    }
};

Koalesce.prototype._initializeRoute = function (file, controller, dependencies, routeName, route) {
    this._logInfo('-- Initializing route', route.method, '(' + route.responseContentType + ')', route.url);

    let controllers = this.controllers;

    let callStack = [function* (next) {
        this.controllers = controllers;
        this.route = route;
        responseContentTypes[route.responseContentType].bindType(this);
        yield* next;
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
    }

    if ( route.middleware ) {
        callStack = callStack.concat(
            _.map(route.middleware, function (middleware) {
                return middleware.object;
            })
        );
    }

    let routeDependencies = this._buildDependencies(route.dependencies || [], 'route \'' + routeName + '\'.');

    callStack.push(function* (next) {
        for ( let dependencyName in dependencies ) {
            let dependency = dependencies[dependencyName];
            this[dependencyName] = dependency;
        }
        for ( let dependencyName in routeDependencies ) {
            let dependency = routeDependencies[dependencyName];
            this[dependencyName] = dependency;
        }
        yield* next;
    });
    callStack.push(route.handler);

    this.app[route.method.toLowerCase()](route.url, compose(callStack));
};

Koalesce.prototype._buildDependencies = function (list, forWhat) {
    let dependencies = {};

    for ( let dependencyName in list ) {
        try {
            let dependencyValue = list[dependencyName];
            if ( typeof dependencyValue === 'string' ) {
                dependencies[dependencyName] = require(this.config.basePath + '/' + dependencyValue);
            } else {
                dependencies[dependencyName] = dependencyValue;
            }
        } catch ( err ) {
            this._logError('Koalesce: Could not resolve dependency \'' + dependencyName + '\' for ' + forWhat + '.');
        }
    }

    return dependencies;
};

Koalesce.prototype._initializeMiddleware = function () {
    this._logInfo('Initializing middleware');

    let app = this.app;
    
    this._routeAgnosticMiddleware = this._initializeMiddlewareSet(this.config.middleware.routeAgnostic); 
    _.each(this._routeAgnosticMiddleware, function (middleware) { 
        app.use(middleware); 
    });
    this._routeAwareMiddleware = this._initializeMiddlewareSet(this.config.middleware.routeAware);
};

Koalesce.prototype._initializeMiddlewareSet = function (middleware) {
    let result = [];

    for ( let middlewareIndex in middleware ) {
        let object = middleware[middlewareIndex];

        if ( !object.name ) {
            this._logWarning('Koalesce(config): Middleware entry #' + middlewareIndex + ' is missing field \'name\'.');
            continue;
        }

        if ( object.environment && !object.environment.match(process.env.NODE_ENV) )  {
            this._logInfo('-- Skipping middleware:', object.name);
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
                for ( let i = 0 ; i < object.object.length ; i++ ) {
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

Koalesce.prototype._initializeBodyParser = function () {
    this._logInfo('Initializing body parser');

    let limits = this.config.bodyLimits;

    let self = this;

    this.app.use(function* (next) {
        let contentType = this.request.header['content-type'];

        let opts = {
            encoding: this.request.header['content-encoding'] || 'utf8',
            length: this.request.header['content-length']
        }

        if ( contentType ) { 
            if ( _s.startsWith(contentType, 'application/json') ) {
                opts.limit = limits.json;
                try {
                    this.request.body = yield co_body.json(this, opts);
                } catch ( err ) {
                    this.status = 400;
                    this.body = 'Expected json body in request.';
                    self._logWarning('Koalesce: Expected json body in request.');
                    return;
                }
            } else if ( _s.startsWith(contentType, 'application/x-www-form-urlencoded') ) {
                opts.limit = limits.form;
                try {
                    this.request.body = yield co_body.form(this, opts);                    
                } catch ( err ) {
                    this.status = 400;
                    this.body = 'Expected form data in request.';
                    self._logWarning('Koalesce: Expected form data in request.');
                    return;
                }
            } else if ( _s.startsWith(contentType, 'form/multipart') ) {
                let parts = co_busboy(this);
                this.request.body = {};
                this.request.body.fields = parts.fields;
                this.request.body.files = [];

                let part;
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

        yield* next;
    });
};

Koalesce.prototype._initializeRouter = function () {
    this._logInfo('Initialize router');
    this.app.use(router(this.app));
};

Koalesce.prototype._initializeEndpoints = function* () {
    this._logInfo('Initialize endpoints');

    for ( let endpointIndex in this.config.endpoints ) {
        let endpoint = this.config.endpoints[endpointIndex];

        this._logInfo('-- Initializing endpoint', endpoint);

        if ( !endpoint.port || !endpoint.type ) {
            this._logError('Koalesce(config): Endpoint entry #' + endpointIndex + ' is missing a valid port or type field.');
            continue;
        }

        try {
            switch ( endpoint.type ) {
                case 'http': {
                    let server = new HttpServer(this.app.callback(), endpoint.port);
                    yield server.start();
                }
                break;
                case 'https': {
                    let server = new HttpServer(this.app.callback(), endpoint.port, endpoint);
                    yield server.start();
                }
                break;
                default:
                    this._logError('Koalesce(config): Endpoint of type \'' + endpoint.type + '\' is not valid.');
                break;
            }
        } catch ( err ) {
            this._logError('Koalesce: Endpoint ' + endpoint.type + ':' + endpoint.port + ' could not be created:', err.stack);
        }
    }
};



