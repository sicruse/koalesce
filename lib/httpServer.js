'use strict';

var Q = require('q');
var fs = require('fs');

function fsReadFileIfExistsSync (filename) {
    if ( fs.exists(filename) ) {
        return fs.readFileSync(filename);
    } else {
        return undefined;
    }
}

function HttpServer (handler, port, https) {
    this.handler = handler;
    this.port = port;
    
    if ( https ) {
        let httpsData = {
            // allow overriding of any of this in config
            key: fsReadFileIfExistsSync(https.keyFile),
            cert: fsReadFileIfExistsSync(https.certificateFile),
            ca: fsReadFileIfExistsSync(https.certificateAuthorityFile),
            ciphers: [ // include/exclude recommended ciphers by default (fixes node v0.12)
                "ECDHE-RSA-AES256-SHA384",
                "DHE-RSA-AES256-SHA384",
                "ECDHE-RSA-AES256-SHA256",
                "DHE-RSA-AES256-SHA256",
                "ECDHE-RSA-AES128-SHA256",
                "DHE-RSA-AES128-SHA256",
                "HIGH",
                "!aNULL",
                "!eNULL",
                "!EXPORT",
                "!DES",
                "!RC4",
                "!MD5",
                "!PSK",
                "!SRP",
                "!CAMELLIA"
            ].join(':'),
            honorCipherOrder: true
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
