#Koalesce FAQ

- Why have you spread routes all over in the controllers? I like my routes all in one file.
  - There

- The middleware configuration object is a little messy: There's a double-require for modules w/ metadata, and metadata is not instance dependent.
  - Yes, both of these are issues I'd like to fix. I haven't really settled on a solution yet because I'd like it to fulfill 2 criteria:
      1. Koa middleware can be specified in the same way as koalesce middleware.
      2. Koalesce middlware can be easily used as koa middleware.
  - The issue is, standard koa middleware returns a `function*` from it's initialize (or middleware) function. 
     

