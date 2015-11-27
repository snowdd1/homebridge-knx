/**
 * The re-integrated knx device is alive again.
 * This handles everything on the device level
 */

//requires**************************************************************************************************************

/**
 * 
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
 * Assembles the Services Array for one device
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
	if (!this.config.Services){
		this.globs.log("No 'Services' found in device?!");
	}
	var currServices = this.config.services;
	this.globs.log("Preparing Services: " + currServices.length);
	// go through the config thing and look for services
	for (var int = 0; int < currServices.length; int++) {
		var configService = currServices[int];
		// services need to have type and name properties
		if (!configService.type && !configService.name) {
			this.globs.log("[ERROR] must specify 'type' and 'name' properties for each service in config.json. KNX platform section fault ");
			throw new Error("Must specify 'type' and 'name' properties for each service in config.json");
		}
		this.log("Preparing Service: " + int + " of type "+configService.type);
		switch (configService.type) {
	
	
	
	
}


//exports **************************************************************************************************************

module.exports = KNXDevice;