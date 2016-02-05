/*****
 * Platform shim for use with nfarina's homebridge plugin system 
 * This is the version for plugin support
 * ******************************************************************************************** 
 * 
ALL NEW VERSION WITH OWN PERSISTENCE LAYER (file based, anyhow)
 */


'use strict';

var knxd = require('eibd');
var Hapi = require('hapi');
var accConstructor = require('./lib/knxdevice.js');
var userOpts = require('./lib/user').User;

var Service, Characteristic; // passed default objects from hap-nodejs
var globs = {}; // the storage for cross module data pooling;
var iterate = require('./lib/iterate');
var knxmonitor = require('./lib/knxmonitor');
var KNXAccess = require("./lib/knxaccess");

/**
 * KNXPlatform
 * 
 * @constructor
 * @param {function} log - logging function for console etc. out
 * @param {object} config - configuration object from global config.json
 */
function KNXPlatform(log, config){
	var that = this;
	this.log = log;
	this.Old_config = config;
	/**
	 * Talkative Info spitting thingy. 
	 * @param {string} comment
	 * 
	 */
	globs.info = function(comment) {
		that.log('info', "[INFO] " + comment);
	}
	
	/* our own config file */
	
	this.config = userOpts.loadConfig();
	globs.config = this.config;
	
	/* we should have now:
	 * - knxd_ip
	 * - knxd_port
	 * - GroupAddresses object
	 * - Devices Object
	*/
	globs.knxd_ip = this.config.knxd_ip;
	globs.knxd_port = this.config.knxd_port || 6720;
	globs.log = log;
	globs.knxmonitor = knxmonitor;
	globs.Hapi = Hapi;
	KNXAccess.setGlobs(globs); // init link for module;
	knxmonitor.startMonitor({host: globs.knxd_ip, port: globs.knxd_port});
	// start the configuration server
	require('./configserver/bin/www.js').initialize(globs)
	
}

/**
 * Registers the plugin with homebridge. Will be called by homebridge if found in directory structure and package.json
 * is right This function needs to be exported.
 * 
 * @param {object} homebridgeAPI - The API Object made available by homebridge. Contains the HAP type library e.g.
 * 
 */
function registry(homebridgeAPI) {
	//console.log("HERE: hombridge-knx/index.js/registry()");
	Service = homebridgeAPI.hap.Service;
	Characteristic = homebridgeAPI.hap.Characteristic;
	globs.Service = Service;
	globs.Characteristic = Characteristic;
	globs.API = homebridgeAPI;
	homebridgeAPI.registerPlatform("homebridge-knx", "KNX", KNXPlatform); //update signature for homebridge 0.2.0
}

module.exports = registry;


/**
 * The accessories method is invoked by homebridge after calling the constructor. It is supposed to return an array of accessories as parameter of the callback
 * @param {function(array)} callback - the callback to invoke after finishing fetching accessories.
 */
KNXPlatform.prototype.accessories = function(callback) {
	this.log("Fetching KNX devices.");
	var that = this;

	if (!this.config.GroupAddresses){
		this.config.GroupAddresses = [];
	}
	
	
	// iterate through all devices the platform my offer
	// for each device, create an accessory

	// read accessories from file !!!!!
	var foundAccessories = this.config.Devices || []; 


	//create array of accessories
	globs.devices = [];

	for (var int = 0; int < foundAccessories.length; int++) {
		this.log("parsing acc " + int+1 + " of " + foundAccessories.length);
		// instantiate and push to array

		globs.info("push new device ["+foundAccessories[int].DeviceName+"]");
		// push knxd connection setting to each device from platform

		var acc = new accConstructor(globs,foundAccessories[int]);
		
		this.log("created ["+acc.name+"] accessory");	
		globs.devices.push(acc);
	}	
	// if done, return the array to callback function
	this.log("returning "+globs.devices.length+" accessories");
	callback(globs.devices);
}




