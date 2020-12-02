/* jshint esversion: 6, strict: true, node: true */
/**
 * Everything that deals with receiving telegrams from the bus.
 * Uses callbacks to notify listeners.
 */
'use strict';

var globs;
var knx = require('knx');
var knxd = require('eibd');

//array of registered addresses and their callbacks
var subscriptions = []; 
//check variable to avoid running two listeners
var running; 

function groupsocketlisten(opts, callback) {
	var conn = knxd.Connection();
	conn.socketRemote(opts, function(err) {
		if (err) {
			// a fatal error occurred
			globs.log("FATAL: knxd or eibd not reachable");
			throw new Error("Cannot reach knxd or eibd service, please check installation and knx_config.json");
		}
		conn.openGroupSocket(0, callback);
		// in case of connection loss:
		conn.on('close', function() {
			running = false;
			startMonitor(opts);
		});
	});
}


var registerSingleGA = function registerSingleGA (groupAddress, dpt, callback) {
	globs.debug("INFO registerSingleGA "+ groupAddress);
	if (!(!globs.knxconnection) || globs.knxconnection === 'knxjs') {
		var dp = new knx.Datapoint({ ga: groupAddress, dpt: dpt, autoread: true });
		dp.on('event', function (event, value) {
			if (value != undefined) {
				callback(value, undefined, undefined);
			}
		});
		subscriptions.push(dp);
	} else {
		subscriptions.push({address: groupAddress, callback: callback });
	}
};

/**
 * public knxmonitor.startMonitor()
 * starts listening for telegrams on KNX bus
 * @param {object} opts - Object of \{host: name-ip, port: port-num\}  KNX parameters
 * 
 */ 
var startMonitor = function startMonitor(opts) {  // using { host: name-ip, port: port-num } options object
	if (!running) {
		running = true;
	} else {
		globs.debug("<< knxd socket listener already running >>");
		return null;
	}

	if(!(!globs.knxconnection) || globs.knxconnection==='knxjs') {
		// using knxjs
		var connection = knx.Connection({
			handlers: {
				connected: function() {
					globs.debug('Connected!');
					for (var i = 0; i < subscriptions.length; i++) {
						subscriptions[i].bind(connection);
					}
				}
			}
		});
	} else {
		// using knxd
		globs.debug(">>> knxd groupsocketlisten starting <<<");	
		groupsocketlisten(opts, function(parser) {
			//globs.debug("knxfunctions.read: in callback parser");
			parser.on('write', function(src, dest, type, val){
				// search the registered group addresses
				//globs.debug('recv: Write from '+src+' to '+dest+': '+val+' ['+type+'], listeners:' + subscriptions.length);
				for (var i = 0; i < subscriptions.length; i++) {
					// iterate through all registered addresses
					if (subscriptions[i].address === dest) {
						// found one, notify
						//globs.debug('HIT: Write from '+src+' to '+dest+': '+val+' ['+type+']');
						subscriptions[i].lastValue = {val: val, src: src, dest: dest, date: Date()};
						subscriptions[i].callback(val, src, dest);
					}
				}
			});

			parser.on('response', function(src, dest, type, val) {
				// search the registered group addresses
	//			globs.debug('recv: resp from '+src+' to '+dest+': '+val+' ['+type+']');
				for (var i = 0; i < subscriptions.length; i++) {
					// iterate through all registered addresses
					if (subscriptions[i].address === dest) {
						// found one, notify
	//					globs.debug('HIT: Response from '+src+' to '+dest+': '+val+' ['+type+']');
						subscriptions[i].lastValue = {val: val, src: src, dest: dest, date: Date()};
						subscriptions[i].callback(val, src, dest);
					}
				}

			});
		}); // groupsocketlisten parser
	}
}; //startMonitor


/**
 *  public registerGA(groupAdresses[], dpt, callback(value))
 *  remember to bind your callback to .this if properties of your calling objects are required. 
 *  @param {Array|String} groupAddresses -  (Array of) string(s) for group addresses	
 *  @param {function(val, src, dest)} callback -  function(value, src, dest) called when a value is sent on the bus
 *  	
 */
var registerGA = function (groupAddresses, dpt, callback) {
	// check if the groupAddresses is an array
	if (groupAddresses.constructor.toString().indexOf("Array") > -1) {
		// handle multiple addresses
		for (var i = 0; i < groupAddresses.length; i++) {
			if (groupAddresses[i] && groupAddresses[i].match(/(\d*\/\d*\/\d*)/)) { // do not bind empty addresses or invalid addresses
				// clean the addresses
				registerSingleGA (groupAddresses[i].match(/(\d*\/\d*\/\d*)/)[0], dpt, callback );
			}
		}
	} else {
		// it's only one
		if (groupAddresses.match(/(\d*\/\d*\/\d*)/)) {
			registerSingleGA (groupAddresses.match(/(\d*\/\d*\/\d*)/)[0], dpt, callback);
		}
	}
//	globs.debug("listeners now: " + subscriptions.length);
};

var setGlobs = function(globsObject) {
	globs = globsObject;
};

module.exports.setGlobs = setGlobs;
module.exports.registerGA = registerGA;
module.exports.startMonitor = startMonitor;
