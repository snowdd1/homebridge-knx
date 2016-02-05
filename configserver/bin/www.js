
/**
 * Module dependencies.
 */

var app = require('../app'); //returns the express app, not the node module app
var debug = require('debug')('knx-configserver:server');
var http = require('http');
var server;

var initialize = function (globs) {

	/**
	 * Set the storage option right
	 * 
	 */
	debug("Setting the global objects for the web server. =========================================")
	app.setStorage(globs.config, globs.API);
	/**
	 * Get port from environment and store in Express.
	 */

	var port = normalizePort(process.env.PORT || '3001');
	app.set('port', port);

	/**
	 * Create HTTP server.
	 */
	console.log("www.js: CREATE HTTP Serv");
	server = http.createServer(app);

	/**
	 * Listen on provided port, on all network interfaces.
	 */	

	server.listen(port);
	server.on('error', onError);
	server.on('listening', onListening);
	console.log("www.js: DONE");
}
module.exports.initialize = initialize;

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
	var port = parseInt(val, 10);

	if (isNaN(port)) {
		// named pipe
		return val;
	}

	if (port >= 0) {
		// port number
		return port;
	}

	return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
	if (error.syscall !== 'listen') {
		throw error;
	}

	var bind = typeof port === 'string'
		? 'Pipe ' + port
				: 'Port ' + port;

	// handle specific listen errors with friendly messages
	switch (error.code) {
	case 'EACCES':
		console.error(bind + ' requires elevated privileges');
		process.exit(1);
		break;
	case 'EADDRINUSE':
		console.error(bind + ' is already in use');
		process.exit(1);
		break;
	default:
		throw error;
	}
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
	var addr = server.address();
	var bind = typeof addr === 'string'
		? 'pipe ' + addr
				: 'port ' + addr.port;
	debug('Listening on ' + bind);
}
