var winston = require('winston');

module.exports = {
    basePath: __dirname,
    controllerPaths: ['controllers'],
    bodyLimits: {
        json: '1mb',
        form: '1mb',
        text: '1mb',
        file: '5mb'
    },
    middleware: [
        {
            name: 'winston-logging',
            object: require('./middleware/winstonLogger').middleware({
                transports: [
                    new (winston.transports.Console)(),
                    //new (winston.transports.File)({ filename: 'dev.log' })
                ]
            })
        },
        {
            name: 'error-tracking',
            object: require('./middleware/errorTracking').middleware({
                rethrow: false
            })
        },
        {
            name: 'html-error-pages',
            object: require('./middleware/htmlErrorPages').middleware({
                404: 'static/404.html',
                500: 'static/500.html',
                rethrow: true
            })
        },
        {
            name: 'json-error-objects',
            object: require('./middleware/jsonErrorObjects').middleware({
                rethrow: true
            })
        },
        {
            name: 'handlebars', 
            object: require('koa-hbs').middleware({ 
                viewPath: __dirname + '/views/'
            })
        }
    ],
    endpoints: [
        { port: 4002, type: 'http' },
        //{ port: 4001, type: 'https' }
    ]
};
