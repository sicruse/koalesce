var StatsD = require('node-statsd').StatsD;
var StatsDClient = new StatsD();

var activeQueries = 0;

function DbStats (name) {
	this.name = name;
}

DbStats.prototype.start = function () {
	this.startTime = new Date().getTime();
	activeQueries += 1;
	StatsDClient.gauge('DB.ActiveQueries', activeQueries);
};

DbStats.prototype.end = function () {
	this.endTime = new Date().getTime();
	activeQueries -= 1;
	StatsDClient.timing('DB.' + this.name, endTime - startTime);
};

module.exports = DbStats;