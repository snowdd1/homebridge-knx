/*****
 * Platform shim for use with nfarina's homebridge plugin system 
 * This is the version for plugin support
 * ******************************************************************************************** 
 * 
ALL NEW VERSION WITH OWN PERSISTENCE LAYER (file based, anyhow)

Changes for Plugin-2.0 PR for testing!
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
function KNXPlatform(log, config, newAPI){
	var that = this;
	this.log = log;
	this.Old_config = config;

	// new API for creating accessory and such.
	globs.newAPI = newAPI; 
	/**
	 * Talkative Info spitting thingy. 
	 * @param {string} comment
	 * 
	 */
	globs.info = function(comment) {
		that.log('info', "[INFO] " + comment);
	}

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
	globs.Hapi = Hapi; // web server
	KNXAccess.setGlobs(globs); // init link for module;
	knxmonitor.startMonitor({host: globs.knxd_ip, port: globs.knxd_port});
	// start the configuration server
	require('./configserver/bin/www.js').initialize(globs);

	// plugin-2 system: wait for the homebridge to finish restoring the accessories from its own persistence layer.
	if (newAPI) {
		newAPI.on('didFinishLaunching', function () {
			globs.info('homebridge event didFinishLaunching');
			this.configure()
		}.bind(this));
	}

}

/**
 * Registers the plugin with homebridge. Will be called by homebridge if found in directory structure and package.json
 * is right This function needs to be exported.
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


/**
 * With plugin-2 system
 * Accessories are re-created by the homebridge itself, but without all the event functions etc.
 *
 * We need to re-connect all our accessories to the right functions
 */

KNXPlatform.prototype.configure = function() {
	globs.info('Configuration starts');
	// homebridge has now finished restoring the accessories from its persistence layer.
	// Now we need to get their implementation back to them
	
	globs.info('We think homebridge has restored '+ globs.restoredAccessories.length + ' accessories.')

	
	/**************** read the config the first time 
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
			// Instanciate and pass the existing platformAccessory
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
	globs.info('We have read '+ globs.devices.length + ' devices from file.')

	//now we need to store our updated config file to disk, or else all that is in vain next startup!
	globs.info('Saving config file!');
	userOpts.storeConfig();
	
}

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
}


/**** Handler will be invoked when user try to config your plugin
 *    Callback can be cached and invoke when necessary
 */
KNXPlatform.prototype.configurationRequestHandler = function(context, request, callback) {
	console.log("Context: ", JSON.stringify(context));
	console.log("Request: ", JSON.stringify(request));

//	Check the request response
	if (request && request.response && request.response.inputs && request.response.inputs.name) {
		this.addAccessory(request.response.inputs.name);

		// Invoke callback with config will let homebridge save the new config into config.json
		// Callback = function(response, type, replace, config)
		// set "type" to platform if the plugin is trying to modify platforms section
		// set "replace" to true will let homebridge replace existing config in config.json
		// "config" is the data platform trying to save
		callback(null, "platform", true, {"platform":"KNXPlatform", "TEST":"asafas"});
		return;
	}

//	- UI Type: Input
//	Can be used to request input from user
//	User response can be retrieved from request.response.inputs next time
//	when configurationRequestHandler being invoked

//	var respDict = {
//	"type": "Interface",
//	"interface": "input",
//	"title": "Login",
//	"items": [
//	{
//	"id": "user",
//	"title": "Username",
//	"placeholder": "jappleseed"
//	}, 
//	{
//	"id": "pw",
//	"title": "Password",
//	"secure": true
//	}
//	]
//	}

//	- UI Type: List
//	Can be used to ask user to select something from the list
//	User response can be retrieved from request.response.selections next time
//	when configurationRequestHandler being invoked

//	var respDict = {
//	"type": "Interface",
//	"interface": "list",
//	"title": "Select Something",
//	"allowMultipleSelection": true,
//	"items": [
//	"A","B","C"
//	]
//	}

//	- UI Type: Instruction
//	Can be used to ask user to do something (other than text input)
//	Hero image is base64 encoded image data. Not really sure the maximum length HomeKit allows.

	var respDict = {
			"type": "Interface",
			"interface": "instruction",
			"title": "Almost There",
			"detail": "Please press the button on the bridge to finish the setup.",
			"heroImage": "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",
			"showActivityIndicator": true,
			// "showNextButton": true,
			// "buttonText": "Login in browser",
			// "actionURL": "https://google.com"
	}

//	Plugin can set context to allow it track setup process
	context.ts = "Hello";

//	invoke callback to update setup UI
	callback(respDict);
}
