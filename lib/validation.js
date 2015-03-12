'use strict';

var fs = require('fs');

var _ = require('lodash');
var Q = require('q');
var Joi = require('joi');
Joi.qValidate = Q.nfbind(Joi.validate);

var middlewareArrayOrGeneratorFunctionSchema = Joi.alternatives().try(
    Joi.array().items(Joi.func()).required(),
    Joi.func().required()
).required();

var postProcessedMiddlewareSchema = Joi.object().keys({
    name: Joi.string().required(),
    environment: Joi.string().optional(),
    middleware: middlewareArrayOrGeneratorFunctionSchema
});

var preProcessedMiddlewareSchema = Joi.alternatives().try(
    {
        name: Joi.string().optional(),
        environment: Joi.string().optional(),
        module: Joi.object().keys({
            name: Joi.string().required(),
            middleware: middlewareArrayOrGeneratorFunctionSchema,
            metadata: Joi.func().required()
        }).required()
    },
    postProcessedMiddlewareSchema.required()
);

var preProcessedConfigMiddlewareSchema = {
    middleware: Joi.array().items(preProcessedMiddlewareSchema.required()),
    routeAwareMiddleware: Joi.array().items(preProcessedMiddlewareSchema.required())
};

var postProcessedConfigMiddlewareSchema = {
    middleware: Joi.array().items(postProcessedMiddlewareSchema.required()),
    routeAwareMiddleware: Joi.array().items(postProcessedMiddlewareSchema.required())
};

var configurationSchema = Joi.object().keys({
    basePath: Joi.string().required(),
    controllerPaths: Joi.array().items(Joi.string()).required(),
    stores: Joi.object().required(),
    endpoints: Joi.array().items(
        Joi.object().keys({
            port: Joi.number().min(0).max(65535),
            type: Joi.string().allow(['http','https']),
            privateKeyFile: Joi.alternatives().when('type', { is: 'https', then: Joi.string().required() }),
            certificateFile: Joi.alternatives().when('type', { is: 'https', then: Joi.string().required() })
       })
    )
}).unknown();

function* validatePreProcessedConfiguration (configuration) {
    configurationSchema.middleware = preProcessedConfigMiddlewareSchema;
    let result = yield Joi.qValidate(configuration, configurationSchema);
    if ( result.error ) {
        throw result.error;
    }
}

function* validatePostProcessedConfiguration (configuration) {
    configurationSchema.middleware = postProcessedConfigMiddlewareSchema;
    let result = yield Joi.qValidate(configuration, configurationSchema);
    if ( result.error ) {
        throw result.error;
    }
}

var httpMethods = [
    'GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'CONNECT', 'OPTIONS', 'TRACE'
];

var controllerSchema = Joi.object().keys({
    routes: Joi.object().pattern(/[\s\S]*/, 
        Joi.object({
            url: Joi.string().required(),
            method: Joi.string().allow(httpMethods).required(),
            handler: Joi.func().required()
        }).unknown()
    )
}).unknown();

function* validateController (controller) {
    let result = yield Joi.qValidate(controller, controllerSchema, { abortEarly: false });
    return result.error;
}

module.exports = {
    validatePreProcessedConfiguration: validatePreProcessedConfiguration,
    validatePostProcessedConfiguration: validatePostProcessedConfiguration,
    validateController: validateController
};