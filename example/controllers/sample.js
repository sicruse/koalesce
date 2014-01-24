module.exports = {

    // runs in order before any route on this controller
    middleware : [
        {
            name: 'testMid1',
            object: function* (next) {
                console.log('controller1 start');
                this.test1 = 1234;
                yield next;
                console.log('controller1 end');
            }
        }
    ],

    requests : {
    	create: {
            url: '/sample',
            requestType: 'POST', 
            responseType: 'html',
            middleware: [ // [optional] runs in order before this specific route
                { 
                    name: 'route1', 
                    object: function* (next) {
                        console.log('route1 start');
                        yield next;
                        console.log('route1 end');
                    }
                },
                {
                    name: 'route2',
                    object: function* (next) {
                        console.log('route2 start');
                        yield next;
                        console.log('route2 end');
                    }
                }
            ], 
    	    handler: function* () {
                console.log('create', this.test1);
                yield this.render('main', { title: "testing" });
            }
    	},
        retrieve: {
            url:'/sample/:id',
            requestType: 'GET',
            responseType: 'json',
            handler: function* () {
                console.log('retrieve', this.params.id);
                this.body = {};
            }
        },
        update: {
            url: '/sample/:id',
            requestType: 'PUT',
            responseType: 'json',
            handler: function* () {
                console.log('update', this.params.id, this.request.body);
                this.body = {};
            }
        },
    	delete: {
    	    url: '/sample/:id', 
            requestType: 'DELETE',
            responseType: 'json',
            handler: function* () {
                console.log('delete', this.id);
                this.body = {};
            }
    	}
    }
}
