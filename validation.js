var _ = require('underscore');
var Q = require('q');

var fs = require('fs');

var responseContentTypes = require('./responseContentTypes');

function validateMiddleware (middleware) {
    var errors = [];

    for ( var i = 0 ; i < middleware.length ; i++ ) {
        var middlewareDescriptor = config.middleware.routeAgnostic[i];

        if ( !middlewareDescriptor.hasOwnProperty('name') ) {
            errors.push("Configuration setting 'middleware' contains a hash missing the 'name' field.");
        }

        if ( !middlewareDescriptor.hasOwnProperty('object') ) {
            errors.push("Configuration setting 'middleware' contains a hash missing the 'object' field.");
        }

        if ( typeof middlewareDescriptor.object !== 'function' ) {
            errors.push("Configuration setting 'middleware' contains a hash '" + middlewareDescriptor.name + "' whose object is not a function.");
        } else {
            if ( !_s.startsWith(middlewareDescriptor.object.toString(), 'function*') ) {
                errors.push("Configuration setting 'middleware' contains a hash '" + middlewareDescriptor.name + "' whose object is not a generator function.");
            }
        }
    }

    return errors;
}       

module.exports = {
    validateConfiguration: function (config) {
        _.defaults(config, { 
            basePath: __dirname,
            controllerPaths: ['controllers'],
            bodyLimits: {
                json: '1mb',
                form: '1mb',
                text: '1mb',
                file: '5mb'
            },
            stores: {},
            middleware: {
                routeAgnostic: [],
                routeAware: []
            },
            endpoints: [ { port: 4000, type: 'http' } ]
        });

        var errors = [];

        if ( typeof config.basePath !== 'string' ) {
            errors.push("Configuration setting 'basePath' must be a string.");
        }

        var basePathStats = fs.statSync(config.basePath); // Sync is okay, we're just initializing
        if ( !basePathStats.isDirectory() ) {
            errors.push("Configuration setting 'basePath' must be a valid directory.");
        }

        if ( !Array.isArray(config.controllerPaths) ) {
            errors.push("Configuration setting 'controllerPaths' must be an array.");
        }

        for ( var i = 0 ; i < config.controllerPaths.length ; i++ ) {
            var controllerPath = config.controllerPaths[i];
            var controllerPathStats = fs.statSync(controllerPath);
            if ( !controllerPathStats.isDirectory() ) {
                errors.push("Configuration setting 'controllerPaths' contains path '" + controllerPath + "' that does not exist.");
            }
        }

        if ( typeof config.bodyLimits !== 'object' ) {
            errors.push("Configuration setting 'bodyLimits' must be a hash.");
        }

        var bodyLimitsKeys = ['json', 'form', 'text', 'file'];

        for ( var i = 0 ; i < bodyLimitsKeys.length ; i++ ) {
            var bodyLimitsKey = bodyLimitsKeys[i];
            if ( !config.bodyLimits.hasOwnProperty(bodyLimitsKey) ) {
                errors.push("Configuration setting 'bodyLimits' is missing key '" + bodyLimitsKey + "'.");
            }
        }

        if ( typeof config.stores !== 'object' ) {
            errors.push("Configuration setting 'stores' must be a hash.");
        } else {
            for ( var storeName in config.stores ) {
                var store = config.stores[storeName];
                if ( !store.file ) {
                    errors.push("Configuration setting 'stores' must contain a string field 'file'.");
                }
            }
        }

        if ( typeof config.middleware !== 'object' ) {
            errors.push("Configuration setting 'middleware' must be a hash.");

            if ( !Array.isArray(config.middleware.routeAgnostic) ) {
                errors.push("Configuration setting 'middleware.routeAgnostic' must be an array.");
            } else {
                errors.concat(validateMiddleware(config.middleware.routeAgnostic));
            }

            if ( !Array.isArray(config.middleware.routeAware) ) {
                errors.push("Configuration setting 'middleware.routeAware' must be an array.");
            } else {
                errors.concat(validateMiddleware(config.middleware.routeAware));
            }
        }

        if ( !Array.isArray(config.endpoints) ) {
            errors.push("Configuration setting 'endpoints' must be an array.");
        }

        for ( var i = 0 ; i < config.endpoints.length ; i++ )
        {
            var endpoint = config.endpoints[i];

            if ( !typeof endpoint === 'object' ) {
                errors.push("Configuration setting 'endpoints' must contain only object types.");
            } else {
                if ( !endpoint.hasOwnProperty('port') ) {
                    errors.push("Configuration setting 'endpoints' entry must be an object that has a port field.");
                }
                if ( !endpoint.hasOwnProperty('type') ) {
                    errors.push("Configuration setting 'endpoints' entry must be an object that has a type field of 'http' or 'https'.");
                }            
            }
        }

        if ( errors.length > 0 ) {
            throw errors;
        }
    },

    validateRoute: function (file, routeName, route) {
        var errors = [];

        _.defaults(route, {
            action: 'GET',
            responseContentType: 'html'
        });

        if ( !route.url ) {
            errors.push('Koalesce: Controller \'' + file + '\' is missing a url for a path in \'' + routeName + '\'.');
        }

        if ( !route.handler ) {
            errors.push('Koalesce: Controller \'' + file + '\' is missing a handler for \'' + routeName + '\'.');
        }

        if ( !responseContentTypes[route.responseContentType] ) {
            errors.push('Koalesce: Controller \'' + file + '\' has an unknown response type of \'' + route.responseContentType + '\' for the \'' + route.url + '\' path in \'' + routeName + '\'.');
        }

        if ( errors.length > 0 ) {
            throw errors;
        }
    }
};