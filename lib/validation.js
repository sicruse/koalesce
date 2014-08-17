'use strict';

var _ = require('underscore');
var _s = require('underscore.string');

var fs = require('fs');

function validateMiddleware (middleware) {
    let errors = [];

    for ( let i = 0 ; i < middleware.length ; i++ ) {
        let middlewareDescriptor = middleware[i];

        if ( !middlewareDescriptor.hasOwnProperty('module') ) {
            if ( !middlewareDescriptor.hasOwnProperty('name') ) {
                errors.push("Configuration setting 'middleware' contains a hash missing the 'name' field.");
            }

            if ( !middlewareDescriptor.hasOwnProperty('object') ) {
                errors.push("Configuration setting 'middleware' contains a hash missing the 'object' field.");
            }

            if ( !middlewareDescriptor.hasOwnProperty('middleware') && !middlewareDescriptor.hasOwnProperty('module') ) {
                errors.push("Configuration must have a 'middleware' or 'module' field defined.");
            }

            if ( typeof middlewareDescriptor.middleware !== 'function' ) {
                errors.push("Configuration setting 'middleware' contains a hash '" + middlewareDescriptor.name + "' whose object is not a function.");
            } else {
                if ( !_s.startsWith(middlewareDescriptor.middleware.toString(), 'function*') ) {
                    errors.push("Configuration setting 'middleware' contains a hash '" + middlewareDescriptor.name + "' whose object is not a generator function.");
                }
            }            
        } else {
            if ( typeof middlewareDescriptor.module !== 'function' ) {
                errors.push("Configuration setting 'module' must support the 'name', 'metadata', and 'middleware' fields.");
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
            stores: {},
            middleware: {
                routeAgnostic: [],
                routeAware: []
            },
            endpoints: [ { port: 4000, type: 'http' } ]
        });

        let errors = [];

        if ( typeof config.basePath !== 'string' ) {
            errors.push("Configuration setting 'basePath' must be a string.");
        }

        let basePathStats = fs.statSync(config.basePath); // Sync is okay, we're just initializing
        if ( !basePathStats.isDirectory() ) {
            errors.push("Configuration setting 'basePath' must be a valid directory.");
        }

        if ( !Array.isArray(config.controllerPaths) ) {
            errors.push("Configuration setting 'controllerPaths' must be an array.");
        }

        for ( let i = 0 ; i < config.controllerPaths.length ; i++ ) {
            let controllerPath = config.basePath + '/' + config.controllerPaths[i];
            let controllerPathStats = fs.statSync(controllerPath);
            if ( !controllerPathStats.isDirectory() ) {
                errors.push("Configuration setting 'controllerPaths' contains path '" + controllerPath + "' that does not exist.");
            }
        }

        if ( typeof config.stores !== 'object' ) {
            errors.push("Configuration setting 'stores' must be a hash.");
        } else {
            for ( let storeName in config.stores ) {
                let store = config.stores[storeName];
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

        for ( let i = 0 ; i < config.endpoints.length ; i++ )
        {
            let endpoint = config.endpoints[i];

            if ( typeof endpoint !== 'object' ) {
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

    validateController: function(file, controller) {
        let errors = [];

        if ( !controller.routes ) {
            errors.push('Koalesce: Controller \'' + file + '\' is missing field \'routes\'.');
            return errors;
        }

        if ( typeof controller.routes !== 'object' ) {
            errors.push('Koalesce: Controller \'' + file + '\' \'routes\' field must be an object.');
            return errors;
        }

        for ( let routeName in controller.routes ) {
            let route = controller.routes[routeName];
            errors = errors.concat(this.validateRoute(file, routeName, route));
        }

        return errors;
    }, 

    validateRoute: function (file, routeName, route) {
        let errors = [];

        if ( !route.url ) {
            errors.push('Koalesce: Controller \'' + file + '\' is missing a url for a path in \'' + routeName + '\'.');
        }

        if ( !route.method ) {
            errors.push('Koalesce: Controller \'' + file + '\' is missing a method for a path in \'' + routeName + '\'.');
        }

        if ( !route.handler ) {
            errors.push('Koalesce: Controller \'' + file + '\' is missing a handler for \'' + routeName + '\'.');
        }

        return errors;
    }
};