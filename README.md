# Koalesce (v0.1.14)

The koalesce module is a router and middleware manager for the koa middleware framework. It extends koa by allowing the addition of middleware on a per-controller or per-route basis. One of the concepts driving the design of koalesce is an attempt to keep each route self-contained: all of the information specific for a route is kept in a single place on a single controller. 

Of course, this means there's not a routes file. For convenience: routes lists are still available by running 'grunt routes', or by using the inspector controller included with the starter kit. (Simply point your browser at http://yourApp:port/index.html?/inspector)



### Features

 - __loads controllers automatically__ and uses [koa-router](https://github.com/alexmingoia/koa-router) for route matching
 - __controller-level middleware__: middleware added to a controller that is run on all routes for that controller
 - __route-level middleware__: middleware that can be added to an individual route (makes for convenient reuse)
 - __self-documenting routes__: information about routes can be viewed using the inspector controller included. (Routes can also be listed using '__grunt routes__'.)
 - __route aware middleware__: the route is attached as this.route for all 'routeAware' middleware, meaning middleware can know specifics of the route before the actual route handler is called.
 
The [koalesce-starter](http://github.com/madams5/koalesce-starter) project is a good starting point for using koalesce.

### Configuration Options

- __basePath__ (string) - the working directory of the app
- __controllerPaths__ (array(string)) - a list of directories to load controllers from (does not recurse into subdirectories) 
- __stores__ (object) - configuration information for various data stores
- __endpoints__ (object) - 
  - port (number) - the port number of the endpoint
  - type (string) - 'http' or 'https'
  - privateKeyFile (string) - the filename of the private key file for an 'https' endpoint
  - certificateFile (string) - the filename of the certificate file for an 'https' endpoint

