var winston = require('winston');

module.exports = (function () {
    var options = {};
    var logger;

    function* middleware (next) {
        this.logger = logger;
        yield next;
    }

    return {
        configure: function (newOptions) {
            options = newOptions;
            logger = new winston.Logger(options);
        },
        middleware: function (newOptions) {
            this.configure(newOptions);
            return middleware;
        }
    };
}).call(this);