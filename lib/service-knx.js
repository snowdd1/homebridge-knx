/**
 * The representation of a homekit service for use with homebridge-knx.
 * A Service has
 * 
 * a name (unique) 
 * a subtype (can be identical to name, unique in the parent device)
 * a HK service (for persistence: reference to homekit type)
 * one or more characteristics
 * 
 * 
 * 
 * 
 */

var CharacteristicKNX = require('./characteristic-knx');

/**@class
 * @constructor
 * @param {string} name - display name of the service, also used for Siri recognition if supported
 * @param {ConfigObject} config - The part of the config for the Service
 * @param {Object} globs - global style object
 * @property {Service} serviceHK - the bound HomeKit Service
 */
function ServiceKNX(name, config, globs) {
	this.name = name;
	this.config = config;
	this.globs = globs;
	this.hap = globs.hap;
	this.Services = globs.hap.Service;
	this.log = globs.log;
	this.myCharacteristics = [];
	this.globs.info("Service constructor called")
}

/**
 * Loads the data from the config
 * Initialize the HK Service type
 * 
 * @returns {boolean} success 
 */
ServiceKNX.prototype.loadServiceData = function () {

	// the config object hold the meta information for the service, just as before

	// step 1 - get the service type
	if (!config.ServiceType) {
		// failed
		return false;
	}
	// is the ServiceType a know HomeKit type?
	if (!Services[config.ServiceType]) {
		//failed
		return false;
	}
	// initialize the HomeKit object, just with the given name

	 /** @type {Service}  */
	 this.serviceHK = new this.Services[config.ServiceType](name, name);
	 /** @type {string} */
	 this.serviceType = config.ServiceType; 
	
	 /** @type {string} */
	 this.description=config.Description;
	 
	// we need to establish the characteristics and the mappers
	// for each characteristic in config
	 
	if (config.Characteristics) {
		this.globs.info("Preparing Characteristics: " + config.Characteristics.length);
		for (var i1 = 0; i1 < config.Characteristics.length; i1++ ){
			
			this.globs.info(config.Characteristics[i1].type)
			this.globs.info(" No real characteristic perser yet !!!! --> service-knx.js")
			// construction site
			//this.myCharacteristics.push(new CharacteristicKNX(parameters))
			
			// construction site
			
			
		}
		
	}
	return true;
}

/**
 * Saves the data to the config
 * @returns {boolean} success
 */
ServiceKNX.prototype.saveServiceData = function () {

	return true;
}

// exports *****************************************************
module.exports = ServiceKNX;

