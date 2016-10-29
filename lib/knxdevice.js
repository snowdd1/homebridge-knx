/**
 * The re-integrated knxdevice is alive again. This handles everything on the device level
 */
'use strict';
//requires**************************************************************************************************************
var ServiceKNX = require('./service-knx');
var iterate = require('./iterate');


//changes for plugin-2: the KNXDevice is not the accessory itself, it only creates an platformAccessory instance and holds it.

/**
 * @classdesc KNXDevice represents an KNX accessory, containing a homekit accessory.
 */
class KNXDevice {
	/**
	 * 
	 * Creates a KNXDevice
	 * @param {object} globs - Global style object
	 * @param {object} config - config section for that device as Object (not JSON string).
	 * @param {API.platformAccessory} platformAccessory optional: if the accessory was restored by homebridge, it is passed for implementation here
	 * @return {KNXDevice}
	 */
	constructor (globs, config, platformAccessory) {
		/** @type {globsObject} */ 
		this.globs = globs;
		/** @type {object} config - config section for that device as Object (not JSON string). */
		this.config = config;
		var accessoryServices = []; // for homeKit
		/** @type {ServiceKNX[]} */
		this.services = []; // for KNXDevice Objects (to keep)
		/** @type {platformAccessory}  */
		this.platformAccessory = undefined;
		
		if (config.DeviceName) {
			/** @type {string} */
			this.name = config.DeviceName;
		}
		if (!config.UUID) {
			// default to name UNSAFE! --> create a random UUID base
			this.uuid_base = 'KNX-' + Math.random() + Math.random() + Math.random() + '_device';
			this.config.UUID = globs.API.hap.uuid.generate(this.uuid_base); // save for later reuse!
			this.UUID = this.config.UUID; // for finding
		}
		// plugin-2 Accessory: If the accessory was restored by homebridge, we already have an instance
		if (platformAccessory) {
			this.platformAccessory = platformAccessory;
			this.platformAccessory.existing = true;
			globs.debug('Reused platformAccessory instance: ' + this.platformAccessory.displayName);
	
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
			//this.platformAccessory.context.TEST = 'Context-KNX' + Math.random() + Math.random() + Math.random();
			this.platformAccessory.existing = false;
			globs.debug('Created new platformAccessory instance: ' + this.platformAccessory.displayName);
		}
	
		//plugin-2
		/******************  
		 *  The services are immediately prepared, and not waited for getServices() to be called
		 */ 
		
	
	
		var informationService = this.platformAccessory.getService(this.globs.Service.AccessoryInformation); //plugin-2
		informationService.setCharacteristic(this.globs.Characteristic.Manufacturer, this.config.Manufacturer || "Opensource Community")
			.setCharacteristic(this.globs.Characteristic.Model, this.config.Model || "KNX Universal Device by snowdd1")
			.setCharacteristic(this.globs.Characteristic.SerialNumber,this.config.SerialNumber || "Build-" + (new Date()).toLocaleString());
		accessoryServices.push(informationService);
		this.platformAccessory.on('identify', function(paired, callback) {
			    this.globs.log(this.platformAccessory.displayName, "Identify!!!");
			    callback();
			  }.bind(this));
		//iterate(this.config);
		if (!this.config.Services) {
			this.globs.log("warn","No 'Services' found in device?!");
		}
		/** @type {ServiceConfig[]}*/
		var currServices = this.config.Services;
		this.globs.debug("Preparing Services: " + currServices.length);
		// go through the config thing and look for services
		for (var int = 0; int < currServices.length; int++) {
			var configService = currServices[int];
			// services need to have type and name properties
			if (!configService.ServiceType && !configService.ServiceName) {
				this.globs.errorlog("[ERROR] must specify 'ServiceType' and 'ServiceName' properties for each service in knx_config.json. ");
				throw new Error("Must specify 'ServiceType' and 'ServiceName' properties for each service in knx_config.json.");
			}
			this.globs.debug("Preparing Service: #" + int + " with name [" + configService.ServiceName + "] of ServiceType [" + configService.ServiceType + "]");
	
			// find out if it is a known Service from the HomeKit types
	
			var myKNXService = new ServiceKNX(this, configService, this.globs); // Service.ContactSensor(config.name,config.name);
			if (myKNXService.failed) {
				// something went wrong, could not establish valid service object
				this.glob.errorlog("homebridge-knx couldn't create KNX service:" + configService.ServiceName);
			} else {
				// everything went fine!
				this.globs.debug("KNX Service created");
				this.services.push(myKNXService);
				accessoryServices.push(myKNXService.getHomeKitService());
			} // if-else
	
		} //for
		// if everything setup properly, we can inject it into homekit (if it wasn't existing before)
		if (!this.platformAccessory.existing) {
			globs.info('registering new Accessory ' + this.platformAccessory.displayName + ' with homebridge');
			globs.API.registerPlatformAccessories("homebridge-knx", "KNX", [this.platformAccessory]);
		} // if
		// otherwise we were fine before.
		this.platformAccessory.updateReachability(true);
	} // constructor
	
	/**
	 * Returns the inner homebridge PlatformAccessory member of the KNXDevice
	 */
	getPlatformAccessory () {
		return this.platformAccessory;
	}
	
	/**
	 * Searches in returns a ServiceKNX object within the KNXDevice
	 * @param {string} name - The service Name to search for
	 * @returns {ServiceKNX}
	 */
	getServiceByName (name) {
		for (var iSrv = 0; iSrv < this.services.length; iSrv++) {
			var cSrv = this.services[iSrv];
			if (name===cSrv.name) {return cSrv;}
		}
		return undefined;
	}
}

// exports **************************************************************************************************************

module.exports = KNXDevice;
