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
 * @param {Object} hap - Homekit Application HAP-nodeJS-Services-Object
 * @param {function} log - Logging function
 * @property {Service} serviceHK - the bound HomeKit Service
 */
function ServiceKNX(name, config, hap, log) {
	this.name = name;
	this.config = config;
	this.hap = hap;
	this.Services = hap.Service;
	this.log = log;
	this.myCharacteristics = [];

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
	 this.serviceHK = new Services[config.ServiceType](name, name);
	 /** @type {string} */
	 this.serviceType = config.ServiceType; 
	
	 /** @type {string} */
	 this.description=config.Description;
	 
	// we need to establish the characteristics and the mappers
	// for each characteristic in config
	 
	if (config.Characteristics) {
		this.log("Preparing Characteristics: " + config.Characteristics.length);
		for (var i1 = 0; i1 < config.Characteristics.length; i1++ ){
			this.myCharacteristics.push(new CharacteristicKNX())
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
