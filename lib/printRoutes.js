'use strict';

function* print (controllers) {
    let Table = require('cli-table');
    let table = new Table({
        head: ['Controller', 'Method', 'Request', 'Response', 'URL'],
        colWidths: [20, 10, 10, 10, 62],
        //colWidths: [16, 8, 6, 6, 44],
        chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' }
    });

    for ( let controllerPath in controllers ) {
        let file = controllers[controllerPath].file;
        let controller = controllers[controllerPath].instance;

        for ( let routeName in controller.routes ) {
            let route = controller.routes[routeName];
            table.push([file, route.method, route.requestContentType || '-', route.responseContentType || '-', route.url]);
        }
    }

    console.log(table.toString());
};

module.exports = {
	print: print
};

