var mongoose = require('mongoose');

var DB = {};

module.exports = DB;

DB.initialize = function (options) {
	mongoose.connect(options.host)
}