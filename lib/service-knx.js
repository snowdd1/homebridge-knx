/**
 * The representation of a homekit service for use with homebridge-knx. A Service has
 * 
 * a name (unique) a subtype (can be identical to name, unique in the parent device) a HK service (for persistence:
 * reference to homekit type) one or more characteristics
 * 
 * 
 * 
 * 
 */

var CharacteristicKNX = require('./characteristic-knx');
var iterate = require('./iterate');

/**
 * @class
 * @constructor
 * @param {KNXDevice} device - The Device this service to associated with
 * @param {ConfigObject} config - The part of the config for the Service
 * @param {Object} globs - global style object
 * @property {Service} serviceHK - the bound HomeKit Service
 */
function ServiceKNX(device, config, globs) {
	this.name = config.ServiceName;
	this.device = device; // back ref
	this.config = config;
	this.globs = globs;
	this.hap = globs.hap;
	this.Services = globs.Service;
	this.log = globs.log;
	this.myCharacteristics = [];
	this.globs.info("Service constructor called")

	// try to validate the parameters
	if (this.globs.Service[config.ServiceType]) {
		this.globs.info("ServiceType defined");
		// is it a function?
		if (typeof this.globs.Service[config.ServiceType] === 'function') {
			this.globs.info("ServiceType known as function");

			// ok, we assume it's about right!
			this.globs.info("ServiceType has characteristics");
			// create new service
			this.failed = !this.loadServiceData();
			

		} else {
			this.globs.log("[ERROR] cannot create service: #" + int + " of ServiceType " + config.ServiceType + " (wrong type)");
			this.failed = true;
			throw new Error("Must specify VALID 'ServiceType' property for each service in knx_config.json.");
			// bail out, it's defect
		}

	} else {
		this.globs.log("[ERROR] cannot create service: #" + int + " of ServiceType " + config.ServiceType + " (not found)");
		this.failed = true;
		throw new Error("Must specify VALID 'ServiceType' property for each service in knx_config.json.");
		// bail out, it's defect
	}

}

/**
 * Loads the data from the config Initialize the HK Service type
 * 
 * @returns {boolean} success
 */
ServiceKNX.prototype.loadServiceData = function() {

	// the config object hold the meta information for the service, just as before

	// step 1 - get the service type
	if (!this.config.ServiceType) {
		// failed
		this.globs.info("has no service type");
		return false;
	}
	// is the ServiceType a know HomeKit type?
	if (!this.Services[this.config.ServiceType]) {
		//failed
		this.globs.info("not a known homekit service type - customs are not yet supported");
		return false;
	}
	// initialize the HomeKit object, just with the given name

	/** @type {Service} */
	this.serviceHK = new this.Services[this.config.ServiceType](this.name, this.name);
	/** @type {string} */
	this.serviceType = this.config.ServiceType;

	/** @type {string} */
	this.description = this.config.Description;

	// we need to establish the characteristics and the mappers
	// for each characteristic in config

	if (this.config.Characteristics) {
		this.globs.info("Preparing Characteristics: " + this.config.Characteristics.length);
		for (var i1 = 0; i1 < this.config.Characteristics.length; i1++) {
			this.globs.info(this.config.Characteristics[i1].Type)
			this.globs.info("Adding characteristic...")
			// construction site
			this.myCharacteristics.push(new CharacteristicKNX(this, this.config.Characteristics[i1], this.globs))

			// construction site
		}
	}
	return true;
}

/**
 * return the Service Object for Homekit.
 */
ServiceKNX.prototype.getHomeKitService = function() {
	return this.serviceHK;
}

/**
 * Saves the data to the config
 * 
 * @returns {boolean} success
 */
ServiceKNX.prototype.saveServiceData = function() {

	return true;
}

// exports *****************************************************
module.exports = ServiceKNX;
