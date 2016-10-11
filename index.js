/*
 * Platform shim for use with nfarina's homebridge plugin system 
 * This is the version for plugin support
 * ******************************************************************************************** 
 * 
ALL NEW VERSION WITH OWN PERSISTENCE LAYER (file based, anyhow)
ECMA-Script 2015 (6.0) Language

 */


'use strict';

var knxd = require('eibd');
//var Hapi = require('hapi');
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
function KNXPlatform(log, config, newAPI){
	var that = this;
	this.log = log;
	//this.Old_config = config;

	// new API for creating accessory and such.
	globs.newAPI = newAPI; 
	/**
	 * Talkative Info spitting thingy. 
	 * @param {string} comment
	 * 
	 */
	globs.info = function(comment) {
		that.log('info', "[INFO] " + comment);
	};

	/* our own config file */

	globs.info("Trying to load user settings");
	globs.info(userOpts.configPath());
	this.config = userOpts.loadConfig();
	globs.config = this.config;
	globs.restoredAccessories = []; //plugin-2

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
	/** To store all unique read requests @type {string[]} */
	globs.readRequests = {}; 
	
	KNXAccess.setGlobs(globs); // init link for module;
	knxmonitor.startMonitor({host: globs.knxd_ip, port: globs.knxd_port});

	// plugin-2 system: wait for the homebridge to finish restoring the accessories from its own persistence layer.
	if (newAPI) {
		newAPI.on('didFinishLaunching', function () {
			globs.info('homebridge event didFinishLaunching');
			this.configure();
		}.bind(this)
		);
	}

}

/**
 * Registers the plugin with homebridge. Will be called by homebridge if found in directory structure and package.json
 * is right 
 * This function needs to be exported.
 * 
 * @param {object} homebridgeAPI - The API Object made available by homebridge. Contains the HAP type library e.g.
 * 
 */
function registry(homebridgeAPI) {
	console.log("homebridge API version: " + homebridgeAPI.version);
	Service = homebridgeAPI.hap.Service;
	Characteristic = homebridgeAPI.hap.Characteristic;
	globs.Service = Service;
	globs.Characteristic = Characteristic;
	globs.API = homebridgeAPI;

	// third parameter dynamic = true
	homebridgeAPI.registerPlatform("homebridge-knx", "KNX", KNXPlatform, true); //update signature for plugin-2
	//homebridgeAPI.registerPlatform("homebridge-knx", "KNX", KNXPlatform, false); //update signature 
}

module.exports = registry;


//Function invoked when homebridge tries to restore cached accessory
//Developer can configure accessory at here (like setup event handler)
//Update current value

/**
* configureAccessory() is invoked for each accessory homebridge restores from its persistence layer.
* The restored accessory has all the homekit properties, but none of the implementation at this point of time.
* This happens before the didFinishLaunching event.
* 
* @param {platformAccessory} accessory  
*/
KNXPlatform.prototype.configureAccessory = function(accessory) {
	console.log("Plugin - Configure Accessory: " + accessory.displayName);

	// set the accessory to reachable if plugin can currently process the accessory
	// otherwise set to false and update the reachability later by invoking 
	// accessory.updateReachability()
	accessory.updateReachability(false);

	// collect the accessories 
	globs.restoredAccessories.push(accessory);
};


/**
 * With plugin-2 system, accessories are re-created by the homebridge itself, 
 * but without all the event functions etc.
 *
 * We need to re-connect all our accessories to the right functions
 * 
 * This is my event handler for the "didFinishLaunching" event of the newAPI
 */

KNXPlatform.prototype.configure = function() {
	globs.info('Configuration starts');
	// homebridge has now finished restoring the accessories from its persistence layer.
	// Now we need to get their implementation back to them
	
	globs.info('We think homebridge has restored '+ globs.restoredAccessories.length + ' accessories.');

	
	/* *************** read the config the first time 
	 * 
	 */
	if (!this.config.GroupAddresses){
		this.config.GroupAddresses = [];
	}


	// iterate through all devices the platform my offer
	// for each device, create an accessory

	// read accessories from file !!!!!
	var foundAccessories = this.config.Devices || []; 


	//create array of accessories
	/** @type {lib/knxdevice.js~knxDevice[]} */
	globs.devices = [];

	for (var int = 0; int < foundAccessories.length; int++) {
		var currAcc = foundAccessories[int];
		this.log("Reading from config: Device/Accessory " + (int+1) + " of " + foundAccessories.length);
		
		globs.info("Match device ["+currAcc.DeviceName+"]");
		
		//match them to the restored accessories:
		var matchAcc = getAccessoryByUUID(globs.restoredAccessories, currAcc.UUID); 
		if (matchAcc) {
			// we found one
			globs.info('Matched an accessory: ' + currAcc.DeviceName + ' === ' + matchAcc.displayName);
			// Instantiate and pass the existing platformAccessory
			globs.devices.push(new accConstructor(globs,foundAccessories[int],matchAcc));
		} else {
			// this one is new
			globs.info('New accessory found: ' + currAcc.DeviceName);
			globs.devices.push(new accConstructor(globs,foundAccessories[int]));
		}
		// do not construct here: var acc = new accConstructor(globs,foundAccessories[int]);

		this.log("Done with ["+currAcc.DeviceName+"] accessory");	
	}	
	
	
	
	// now the globs.devices contains an array of working accessories, that are not yet passed to homebridge
	globs.info('We have read '+ globs.devices.length + ' devices from file.');

	//now we need to store our updated config file to disk, or else all that is in vain next startup!
	globs.info('Saving config file!');
	userOpts.storeConfig();
	
	// we're done, now issue the startup read requests to the bus
	require('./lib/knxaccess.js').knxreadhash(globs.readRequests);
};

/** returns an accessory from an array of accessories if the context property is matched, or undefined.
 *  @param {hap-nodejs/lib/platformAccessory[]} accessories The array of accessories.
 *  @param {Object} context The context object (presumably a string) to be matched. 
 *  @return {hap-nodejs/lib/platformAccessory} or undefined
 *  
 */
function getAccessoryByUUID(accessories, uuid) {
	globs.info('--compare----------------');
	for (var ina = 0; ina < accessories.length; ina++) {
		var thisAcc = accessories[ina];
		globs.info('Comparing ' + thisAcc.UUID + ' === ' + uuid + ' ==>' + (thisAcc.UUID === uuid) );
		//console.log(thisAcc); // spit it out
		if (thisAcc.UUID === uuid) {
			globs.info('---------------done---');
			return thisAcc;
		}
	}
	// nothing found:
	globs.info('-----none----------return-undefined--');
	return undefined;
}

/**
 * Search the globs object's devices[] array for an knxDevice with name 'name'
 */
globs.getDeviceByName = function(name) {
	for (var idevice = 0; idevice < globs.devices.length; idevice++) {
		var oDevice = globs.devices[idevice];
		if (oDevice.name===name) {return oDevice;}
	}
	return undefined;
};
