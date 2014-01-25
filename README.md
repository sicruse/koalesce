# Koalesce

  The koalesce package is a router/middleware manager for the koa middleware framework. It extends koa by incorporating controller-based routes and allowing multiple levels of middleware to be attached at various points. It includes built-in middleware to handle parsing of some of the basic request and response types. 

  The power of attached middleware is through the 'this' object. Data can be gathered and attached by each piece of middleware as the request passes through or post-processed as the request makes it's way back out.

  There are 3 different middleware attach points for koalesce, the first being at a global level. These are defined as middleware in the koalesce configuration and are run for every route processed by the app. Examples of top level middleware might be retrieving a session if it exists and attaching it to the 'this' object to be used by subsequent middleware or the route handler.

  Attaching middleware to a controller runs that middleware for every route on the controller. [Fill in examples for controller middleware.]

  The final attach point is on the route itself. Middleware on a route runs only for that route. Middleware can then be shared between specific routes: logic can be separated into a middleware module and included on any route it's needed. [Fill in examples for route-specific middleware.]

  Koalesce is being actively developed and used in our current koa projects. 

## Features

### Built-in:

  - controller level routing using koa-router(https://github.com/alexmingoia/koa-router)for route matching
  - parsing requests with Content-Type 'appliction/json' and placing the resulting object in this.request.body
  - file upload using co-busboy(https://github.com/cojs/busboy)
  - dependency injection for simple unit tests
  - response validation: making sure the response body matches the route response type

### Potential Middleware: (included in example)

  - error tracking using m-error-tracking(https://github.com/madams5/m-error-tracking)
  - html error pages by response status using m-html-error-pages(https://github.com/madams5/m-html-error-pages)
  - json error objects using m-json-error-objects(https://github.com/madams5/m-json-error-objects)
  - handlebars templating using koa-hbs(https://github.com/jwilm/koa-hbs/)
  - logging
  - route argument validation using joi(https://github.com/spumko/joi)


## Installation

```
$ npm install koalesce
```

  Koalesce requires koa, which must be running __node 0.11.9__ or higher for generator support. node(1) must be run with the `--harmony` flag.

## Usage 

  The koalesce example (found in the example subdirectory) can be copied and customized. 'app.js' is currently set up to run out of the example directory. When used as a module, the app.js file changes to:

```
var koalesce = require('koalesce');
var config = require('./config.js');
var app = koalesce(config);
```

## config.js

  The configuration file has these options available:

- basePath: the path to the executing directory
- bodyLimits: limits on the body sizes for each of the supported post types
- controllerPaths: a list of paths for the locations of controllers
- middleware: The middleware configuration field is an array of (name, object) middleware tuples. They are used as middleware in order, any middleware can be used that returns a generator: function* (next).
- endpoints: The endpoints field takes a value of the form { port: 1234, type: 'http'}. Port can be any valid port number, type can be 'http' or 'https'.

## Sample config.js

```
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
```

## Example Directory Structure

  Below is the directory structure we've used for most of the projects using koalesce. The controller path(s) are configurable and koalesce doesn't depend on any of the other paths.

```
  /controllers - each file in the controllers directory is processed for routes
  /middleware - referenced from config.js 
  /models - mongoose models
  /static - static html pages
  /views - handlebars templates
  /tests - unit & functional tests
```

## Controller Routes

  Koalesce uses koa-router(https://github.com/alexmingoia/koa-router) to handle its routes. 

## TODO

- Write unit and functional tests for routes and middleware
- Move current middleware files into separate modules
- Allow the 'https' option for endpoints
- Add a command line option to list the current available routes?
- Add node-convict for configuration
- Add toobusy to middleware
- Add grunt(or gear), tests, coverage to example 

