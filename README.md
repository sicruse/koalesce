# Koalesce

  The koalesce package is a router/middleware manager for the koa middleware framework. It includes built-in middleware to handle parsing of some of the basic request and response types. 

## Installation

```
$ npm install koalesce
```

  Koalesce requires koa, which must be running __node 0.11.9__ or higher for generator support. node(1) must be run with the `--harmony` flag.

## config.js

  The configuration file has these options available:

- basePath: the path to the executing directory
- bodyLimits: limits on the body sizes for each of the supported post types
- controllerPaths: a list of paths for the locations of controllers
- middleware: The middleware configuration field is an array of (name, object) middleware tuples. They are used as middleware in order, any middleware can be used that returns a generator: function* (next).
- endpoints: The endpoints field takes a value of the form { port: 1234, type: 'http'}. Port can be any valid port number, type can be 'http' or 'https'.

## Example Directory Structure

  Below is the directory structure we've used for most of the projects that are using koalesce. The controller path(s) are configurable, and koalesce doesn't depend on any of the other paths.

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

