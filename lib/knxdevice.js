/**
 * The re-integrated knx device is alive again.
 * This handles everything on the device level
 */

/**
 * @constructor
 * @param {object} globs - Global style object
 * @param {object} config - config section for that device. 
 *  
 */
function KNXDevice(globs, config){
	this.globs = globs;
	this.config = config;
	
}

/**
 * @returns {Array}
 */
KNXDevice.prototype.getServices() {
	
	// has to return an array of HomeKit Services
	// you can OPTIONALLY create an information service if you wish to override
	// the default values for things like serial number, model, etc.

	var accessoryServices = [];

	var informationService = new globs.Service.AccessoryInformation();

	informationService
	.setCharacteristic(globs.Characteristic.Manufacturer, "Opensource Community")
	.setCharacteristic(globs.Characteristic.Model, "KNX Universal Device")
	.setCharacteristic(globs.Characteristic.SerialNumber, "Version 2.0.0");

	accessoryServices.push(informationService);

	//iterate(this.config);
	
	
}