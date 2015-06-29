'use strict';

var _ = require('lodash');
var Q = require('q');
var HttpServer = require('./httpServer');

var AppRootPath = require('app-root-path');
var isGeneratorFunction = require('is-generator-function');
var compose = require('koa-compose');

var Logging = require('./logging');
var validation = require('./validation');

var koa = require('koa');
var Router = require('koa-router');

var __fs = require('fs');
var fs = {
    readdir: Q.nfbind(__fs.readdir),
    stat: Q.nfbind(__fs.stat)
};

function isFunction (fn) {
    return fn instanceof Function && !isGeneratorFunction(fn);
}

function* Koalesce (config, logInfo, logWarning, logError) {
    this.log = new Logging(logInfo, logWarning, logError);

    if ( !config ) {
        config = {};
    }
    config.basePath = AppRootPath.path;
    config.basePath = '/vagrant';

    yield* validation.validatePreProcessedConfiguration(config);
    yield* this._prepareConfig(config);
    yield* validation.validatePostProcessedConfiguration(config);

    this.config = config;
    
    yield* this._loadMiddleware();
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
    this.router = new Router();

    return this;
}

Koalesce.prototype._prepareConfig = function* (config) {
    function prepare (middlewareSet) {
        _.each(middlewareSet, function (middleware, middlewareIndex) {
            if ( middleware.module ) {
                _.extend(middleware, middleware.module);
                middleware.isModule = true;
                delete middleware.module;                
            }
        });
    }

    prepare(config.middleware.middleware);
    prepare(config.middleware.routeAwareMiddleware);
}

Koalesce.prototype._prepareMetadataFunc = function (route) {
    return function* () {
        let context = {};
        context.route = route;
        yield* route._composedMetadata.call(context);
        delete context.route;
        return context;
    };
};

Koalesce.prototype._loadMiddleware = function* () {
    this.log.info('Loading middleware');

    this._middlewareConfig = yield* this._loadMiddlewareSet(this.config.middleware.middleware);
    this._routeAwareMiddlewareConfig = yield* this._loadMiddlewareSet(this.config.middleware.routeAwareMiddleware);
};

Koalesce.prototype._loadMiddlewareSet = function* (middleware) {
    for ( let middlewareIndex in middleware ) {
        let object = middleware[middlewareIndex];

        this.log.info('-- Loading middleware:', object.name ? object.name : object.module.name);
    }

    return middleware;
};

Koalesce.prototype._loadController = function* (name, path, file, filePath) {
    this.log.info('-- Loading controller \'' + filePath + '\'');

    let controller = {
        name: name,
        path: path,
        file: file,
        filePath: filePath,
    };

    try {
        controller.instance = require(filePath);
    } catch ( err ) {
        this.log.error('Koalesce: Controller \'' + filePath + '\' contains an error.', err.stack);
        this.log.error('Koalesce: Controller \'' + filePath + '\' load aborted.');

        return;
    }

    let errors = yield* validation.validateController(controller.instance);

    if ( errors ) {
        this.log.error('Koalesce: Controller \'' + filePath + '\' has errors.');
        for ( let i = 0 ; i < errors.details.length ; i++ ) {
            let error = errors.details[i];
            this.log.error('  ' + error.message + ' for ' + error.path);
            this.log.error(error.stack);
        }  
        this.log.error('Koalesce: Controller \'' + filePath + '\' load aborted.');

        return;
    }

    this.controllers[name] = controller;

    let middleware = [];
    middleware = middleware.concat(this.config.middleware.middleware);
    middleware = middleware.concat(this.config.middleware.routeAwareMiddleware);

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
            }

            route._composedMetadata = this._routeComposeMetadata(routeMiddleware, route);
            route.getMetadata = this._prepareMetadataFunc(route);

            route._resolvedMiddleware = routeMiddleware;
        }
    }
};

Koalesce.prototype._loadControllers = function* () {
    let config = this.config;

    this.log.info('Loading controllers');

    this.controllers = {};

    for ( let i = 0 ; i < config.controllerPaths.length ; i++ ) {
        let path = config.basePath + '/' + config.controllerPaths[i];

        let files = yield fs.readdir(path);
        for ( let fileIndex in files ) {
            let file = files[fileIndex];
            let filePath = path + '/' + file;
            let fileStat = yield fs.stat(filePath);
            let name = config.controllerPaths[i] + '/' + file;

            if ( fileStat.isFile() ) {
                yield* this._loadController(name, path, file, filePath);
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
};

Koalesce.prototype._printRoutes = function* () {
    let Table = require('cli-table');
    let table = new Table({
        head: ['Controller', 'Method', 'Request', 'Response', 'URL'],
        colWidths: [20, 10, 10, 10, 62],
        //colWidths: [16, 8, 6, 6, 44],
        chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' }
    });

    for ( let controllerPath in this.controllers ) {
        let file = this.controllers[controllerPath].file;
        let controller = this.controllers[controllerPath].instance;

        for ( let routeName in controller.routes ) {
            let route = controller.routes[routeName];
            table.push([file, route.method, route.requestContentType || '-', route.responseContentType || '-', route.url]);
        }
    }

    console.log(table.toString());
};

Koalesce.prototype.start = function* () {
    this._initializeMiddleware();
    this._initializeRouter();
    yield* this._initializeControllers();
    yield* this._initializeEndpoints();
};

Koalesce.prototype._initializeControllers = function* () {
    this.log.info('Initializing controllers');

    for ( var pathName in this.controllers ) {
        let controller = this.controllers[pathName];

        if ( controller.instance.initializer ) {
            yield* controller.instance.initializer();
        }

        for ( let routeName in controller.instance.routes ) {
            let route = controller.instance.routes[routeName];
            this._initializeRoute(controller.file, controller.instance, routeName, route);
        }
    }
};

Koalesce.prototype._initializeRoute = function (file, controller, routeName, route) {
    this.log.info('-- Initializing route', route.method, route.url);

    let controllers = this.controllers;

    let callStack = [function* (next) {
        this.controllers = controllers;
        let krRoute = this.route;
        this.route = route;
        this.route.krRoute = krRoute;
        yield* next;
    }];

    callStack = callStack.concat(this._routeAwareMiddleware);

    // compose all middleware for routes
    if ( controller.middleware ) {
        callStack = callStack.concat(
            _.map(controller.middleware, function (middleware) {
                return middleware.middleware;
            })
        );
    }

    if ( route.middleware ) {
        callStack = callStack.concat(
            _.map(route.middleware, function (middleware) {
                return middleware.middleware;
            })
        );
    }

    callStack.push(route.handler);

    // verify the call stack

    route.url += this.config.routePrefix || '';
    this.router[route.method.toLowerCase()](route.url, compose(callStack));
};

Koalesce.prototype._initializeMiddleware = function () {
    this.log.info('Initializing middleware');

    let app = this.app;
    
    this._middleware = this._initializeMiddlewareSet(this._middlewareConfig); 
    _.each(this._middleware, function (middleware) { 
        app.use(middleware);
    });
    this._routeAwareMiddleware = this._initializeMiddlewareSet(this._routeAwareMiddlewareConfig);
};

Koalesce.prototype._initializeMiddlewareSet = function (middleware) {
    let result = [];

    for ( let middlewareIndex in middleware ) {
        let object = middleware[middlewareIndex];

        if ( object.environment && !object.environment.match(process.env.NODE_ENV) )  {
            this.log.info('-- Skipping middleware:', object.name);
            continue;
        }

        this.log.info('-- Initializing middleware:', object.name);

        // if it's just a normal function, invoke it
        if ( isFunction(object.middleware) ) {
            object.middleware = object.middleware();
        }

        // check if it's a generator function or array of generator functions
        try {
            if ( Array.isArray(object.middleware) ) {
                for ( let i = 0 ; i < object.middleware.length ; i++ ) {
                    result.push(object.middleware[i]);
                }
            } else { // it's a generator function
                result.push(object.middleware);
            }
        } catch (err) {
            this.log.error('Koalesce: Error loading middleware \'' + object.name + '\'.', err);
        }
    }

    return result;
};

Koalesce.prototype._initializeRouter = function () {
    this.log.info('Initializing router');
    this.app.use(this.router.routes());
    this.app.use(this.router.allowedMethods());
};

Koalesce.prototype._initializeEndpoints = function* () {
    this.log.info('Initializing endpoints');

    for ( let endpointIndex in this.config.endpoints ) {
        let endpoint = this.config.endpoints[endpointIndex];

        this.log.info('-- Initializing endpoint', endpoint);

        if ( !endpoint.port || !endpoint.type ) {
            this.log.error('Koalesce(config): Endpoint entry #' + endpointIndex + ' is missing a valid port or type field.');
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
                    this.log.error('Koalesce(config): Endpoint of type \'' + endpoint.type + '\' is not valid.');
                break;
            }
        } catch ( err ) {
            this.log.error('Koalesce: Endpoint ' + endpoint.type + ':' + endpoint.port + ' could not be created:', err.stack);
        }
    }
};

module.exports = Koalesce;
