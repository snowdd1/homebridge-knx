/**
 * The re-integrated knxdevice is alive again. This handles everything on the device level
 */

//requires**************************************************************************************************************
var ServiceKNX = require('./service-knx');
var iterate = require('./iterate');


//changes for plugin-2: the KNXDevice is not the accessory itself, it only creates an platformAccessory instance and holds it.


/**
 * 
 * @constructor
 * @param {object} globs - Global style object
 * @param {object} config - config section for that device.
 * @param {API.platformAccessory] platformAccessory optional: if the accessory was restored by homebridge, it is passed for implementation here
 * 
 */
function KNXDevice(globs, config, platformAccessory) {
	this.globs = globs;
	this.config = config;
	if (config.DeviceName) {
		this.name = config.DeviceName;
	}
	if (config.UUID) {
		this.config.UUID = config.UUID; // ???
	} else {
		// default to name UNSAFE! --> create a random UUID base
		this.uuid_base = 'KNX-' + Math.random() + Math.random() + Math.random() + '_device';
		this.config.UUID = globs.API.hap.uuid.generate(this.uuid_base); // save for later reuse!
	}
	// plugin-2 Accessory: If the accessory was restored by homebridge, we already have an instance
	if (platformAccessory) {
		this.platformAccessory = platformAccessory;
		this.platformAccessory.existing = true;
		globs.info('Reused platformAccessory instance: ' + this.platformAccessory.displayName);
		
		// spit out the context value for debugging
		globs.info('Iterating the passed context object:');
		iterate(this.platformAccessory.context);
		globs.info('Iterating the passed context object END');

	} else {
		// create a new platformAccessory
		//   generate a context for reference on restarts
		this.platformAccessory = new globs.API.platformAccessory(
				this.name, // displayName property 
				(this.config.UUID), // UUID property - must not change later on 
				((config.HKCategory) ? globs.API.hap.Accessory.Categories[config.HKCategory] : undefined) // Category if present in in the config  
		);
		//this.platformAccessory.context.ID = this.config.context;
		// Test context:
		this.platformAccessory.context.TEST = 'Context-KNX' + Math.random() + Math.random() + Math.random();
		this.platformAccessory.existing = false;
		globs.info('Created new platformAccessory instance: ' + this.platformAccessory.displayName);
	}

	//plugin-2
	/******************  
	 *  The services are immediately prepared, and not waited for getServices() to be called
	 */ 
	
	var accessoryServices = []; // for homeKit
	this.services = []; // for KNXDevice Objects (to keep)

	var informationService = this.platformAccessory.getService(this.globs.Service.AccessoryInformation); //plugin-2
	informationService.setCharacteristic(this.globs.Characteristic.Manufacturer, this.config.Manufacturer || "Opensource Community")
	.setCharacteristic(this.globs.Characteristic.Model, this.config.Model || "KNX Universal Device by snowdd1")
	.setCharacteristic(this.globs.Characteristic.SerialNumber,this.config.SerialNumber || "Build-" + (new Date()).toLocaleString());
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

		var myKNXService = new ServiceKNX(this, configService, this.globs); // Service.ContactSensor(config.name,config.name);
		if (myKNXService.failed) {
			// something went wrong, could not establish valid service object
			this.glob.log("Couldn't create KNX service.");
		} else {
			// everything went fine!
			this.globs.info("KNX Service created");
			this.services.push(myKNXService);
			accessoryServices.push(myKNXService.getHomeKitService())
		}

	}
	// if everything setup properly, we can inject it into homekit (if it wasn't existing before)
	if (!this.platformAccessory.existing) {
		globs.info('registering new Accessory ' + this.platformAccessory.displayName + ' with homebridge');
		globs.API.registerPlatformAccessories("homebridge-knx", "KNX", [this.platformAccessory]);
	}
	// otherwise we were fine before.
}

KNXDevice.prototype.getPlatformAccessory = function () {
	return this.platformAccessory;
};

//exports **************************************************************************************************************

module.exports = KNXDevice;
