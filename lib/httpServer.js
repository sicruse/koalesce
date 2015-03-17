'use strict';

var Q = require('q');
var fs = require('fs');

function HttpServer (handler, port, https) {
    this.handler = handler;
    this.port = port;
    
    if ( https ) {
        let httpsData = {
            key: fs.readFileSync(https.privateKeyFile),
            cert: fs.readFileSync(https.certificateFile)
        };
        this.server = require('https').createServer(httpsData, handler);
    } else {
        this.server = require('http').createServer(handler);        
    }
}

HttpServer.prototype.start = function () {
    let deferred = Q.defer();
    let server = this.server;

    let errorFunction = function (err) {
        server.removeListener('error', errorFunction);
        deferred.reject(err);
    };
    this.server.on('error', errorFunction);

    let listeningFunction = function () {
        server.removeListener('listening', listeningFunction);
        deferred.resolve();
    };
    server.on('listening', listeningFunction);

    if ( this.hostname ) {
        server.listen(this.port, this.hostname);
    } else {
        server.listen(this.port);
    }

    return deferred.promise;
};

module.exports = HttpServer;
