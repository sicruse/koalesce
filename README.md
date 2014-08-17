# Koalesce (v0.1.11)

The koalesce module is a router and middleware manager for the koa middleware framework. It extends koa by allowing the addition of middleware on a per-controller or per-route basis. The initial idea behind koalesce was to preserve the concept of code proximity: everything that goes together conceptually should go together in code. Therefore, each route object contains all of the information required to completely handle a route from validation through the actual handler.

Of course, this means there's no routes file. For convenience: routes lists are still available by running 'grunt routes', or by using the inspector controller included with the starter kit. (Simply point your browser at http://yourApp:port/index.html?/inspector)



### Features

 - __loads controllers automatically__ and uses [koa-router](https://github.com/alexmingoia/koa-router) for route matching
 - __controller-level middleware__: middleware added to a controller that is run on all routes for that controller
 - __route-level middleware__: middleware that can be added to an individual route (makes for convenient reuse)
 - __self-documenting routes__: information about routes can be viewed using the inspector controller included. (Routes can also be listed using '__grunt routes__'.) 
 
The [koalesce-starter](http://github.com/madams5/koalesce-starter) project is a good starting point for using koalesce.