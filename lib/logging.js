'use strict';

function Logging (logInfo, logWarning, logError) {
	this._logInfoFunc = logInfo;
	this._logWarningFunc = logWarning;
	this._logErrorFunc = logError;
}

Logging.prototype.info = function () {
    if ( this._logInfoFunc ) {
        this._logInfoFunc.apply(this, arguments);
    } else {
        console.log.apply(this, arguments);
    }
};

Logging.prototype.warn = function () {
    if ( this._logWarningFunc ) {
        this._logWarningFunc.apply(this, arguments);
    } else {
        console.log.apply(this, arguments);
    }
};

Logging.prototype.error = function () {
    if ( this._logErrorFunc ) {
        this._logErrorFunc.apply(this, arguments);
    } else {
        console.log.apply(this, arguments);
    }
};

module.exports = Logging;