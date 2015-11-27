/**
 * The re-integrated knxdevice is alive again. This handles everything on the device level
 */

//requires**************************************************************************************************************
var ServiceKNX = require('./service-knx');
var iterate = require('./iterate');

/**
 * 
 * @constructor
 * @param {object} globs - Global style object
 * @param {object} config - config section for that device.
 * 
 */
function KNXDevice(globs, config) {
	this.globs = globs;
	this.config = config;
	if (config.DeviceName) {
		this.name = config.DeviceName;
	}
	if (config.uuid_base) {
		this.uuid_base = config.UUIDBase;
	}
}
/**
 * Default routine for handling the "identify" request from homekit
 */
KNXDevice.prototype.identify = function(callback) {
	this.globs.log('info', "[" + this.name + "]:Identify requested!");
	callback(); // success
}
/**
 * Assembles the Services Array for one device
 * 
 * @returns {Array}
 */
KNXDevice.prototype.getServices = function() {

	// has to return an array of HomeKit Services

	var accessoryServices = []; // for homeKit
	this.services = []; // for KNXDevice Objects (to keep)

	var informationService = new this.globs.Service.AccessoryInformation();
	informationService.setCharacteristic(this.globs.Characteristic.Manufacturer, this.config.Manufacturer || "Opensource Community")
	.setCharacteristic(this.globs.Characteristic.Model, this.config.Model || "KNX Universal Device by snowdd1")
	.setCharacteristic(this.globs.Characteristic.SerialNumber,this.config.SerialNumber || "B" + (new Date).toLocaleString());
	accessoryServices.push(informationService);

	//iterate(this.config);
	if (!this.config.Services) {
		this.globs.log("No 'Services' found in device?!");
	}
	var currServices = this.config.Services;
	this.globs.log("Preparing Services: " + currServices.length);
	// go through the config thing and look for services
	for (var int = 0; int < currServices.length; int++) {
		var configService = currServices[int];
		// services need to have type and name properties
		if (!configService.ServiceType && !configService.ServiceName) {
			this.globs.log("[ERROR] must specify 'ServiceType' and 'ServiceName' properties for each service in knx_config.json. ");
			throw new Error("Must specify 'ServiceType' and 'ServiceName' properties for each service in knx_config.json.");
		}
		this.globs.log("Preparing Service: #" + int + " with name [" + configService.ServiceName + "] of ServiceType [" + configService.ServiceType + "]");

		// find out if it is a known Service from the HomeKit types

		var myKNXService = new ServiceKNX(configService.ServiceName, configService, this.globs); // Service.ContactSensor(config.name,config.name);
		if (myKNXService.failed) {
			// something went wrong, could not establish valid service object
			this.glob.log("Couldn't create KNX service.");
		} else {
			// everything went fine!
			this.globs.info("KNX Service created")
			this.services.push(myKNXService);
			accessoryServices.push(myKNXService.getHomeKitService())
		}

	}
	return accessoryServices;
}

//exports **************************************************************************************************************

module.exports = KNXDevice;
