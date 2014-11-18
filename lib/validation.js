'use strict';

var fs = require('fs');

var _ = require('lodash');
var Q = require('q');
var Joi = require('joi');
Joi.qValidate = Q.nfbind(Joi.validate);


var middlewareArrayOrGeneratorFunctionSchema = Joi.alternatives().try(
    Joi.array().includes(Joi.func()).required(),
    Joi.func().required()
).required();

var middlewareTypeSchema = Joi.alternatives().try(
    {
        name: Joi.string().optional(),
        environment: Joi.string().optional(),
        module: Joi.object().keys({
            name: Joi.string().required(),
            middleware: middlewareArrayOrGeneratorFunctionSchema,
            metadata: Joi.func().required()
        }).required()
    },
    {
        name: Joi.string().required(),
        environment: Joi.string().optional(),
        middleware: middlewareArrayOrGeneratorFunctionSchema
    }
);

var middlewareSchema = {
    routeAgnostic: Joi.array().includes(middlewareTypeSchema.required()),
    routeAware: Joi.array().includes(middlewareTypeSchema.required())
};

var configurationSchema = Joi.object().keys({
    basePath: Joi.string().required(),
    controllerPaths: Joi.array().includes(Joi.string()).required(),
    stores: Joi.object().required(),
    middleware: middlewareSchema,
    endpoints: Joi.array().includes(
        Joi.object().keys({
            port: Joi.number().min(0).max(65535),
            type: Joi.string().allow(['http','https']),
            privateKeyFile: Joi.alternatives().when('type', { is: 'https', then: Joi.string().required() }),
            certificateFile: Joi.alternatives().when('type', { is: 'https', then: Joi.string().required() })
       })
    )
}).unknown();

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

module.exports = {
    validateConfiguration: function* (configuration) {
        let result = yield Joi.qValidate(configuration, configurationSchema);
        if ( result.error ) {
            throw result.error;
        }
    },

    validateController: function* (file, controller){
        let result = yield Joi.qValidate(controller, controllerSchema, { abortEarly: false });
        return result.error;
    }
};