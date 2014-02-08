module.exports = function test(status, message) {
    var args = [];

    for ( var i = 2 ; i < arguments.length ; i++ ) {
        args.push(arguments[i]);
    }

    return {
        status: status,
        message: message,
        extra: args,
        trace: new Error().stack
    };
};