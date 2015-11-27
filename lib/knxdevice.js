/**
 * The re-integrated knxdevice is alive again.
 * This handles everything on the device level
 */

//requires**************************************************************************************************************
var ServiceKNX = require('./service-knx');

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
	if (config.name) {
		this.name = config.DeviceName;
	}
	if (config.uuid_base){
		this.uuid_base = config.UUIDBase;
	}
}
/**
 * Default routine for handling the "identify" request from homekit
 */
KNXDevice.prototype.identify= function(callback) {
	this.log("["+ this.name +"]:Identify requested!");
	callback(); // success
},
/**
 * Assembles the Services Array for one device
 * @returns {Array}
 */
KNXDevice.prototype.getServices() {
	
	// has to return an array of HomeKit Services

	var accessoryServices = []; // for homeKit
	this.services = []; // for KNXDevice Objects (to keep)

	var informationService = new globs.Service.AccessoryInformation();
	informationService
	.setCharacteristic(globs.Characteristic.Manufacturer, this.config.Manufacturer || "Opensource Community")
	.setCharacteristic(globs.Characteristic.Model, this.config.Model || "KNX Universal Device by snowdd1")
	.setCharacteristic(globs.Characteristic.SerialNumber, this.config.SerialNumber || "Booted " + (new Date).toLocaleString());
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
		if (!configService.ServiceType && !configService.ServiceName) {
			this.globs.log("[ERROR] must specify 'ServiceType' and 'ServiceName' properties for each service in knx_config.json. ");
			throw new Error("Must specify 'ServiceType' and 'ServiceName' properties for each service in knx_config.json.");
		}
		this.globs.log("Preparing Service: #" + int + " with name "+ configService.ServiceName+" of ServiceType "+configService.ServiceType);
		
		// find out if it is a known Service from the HomeKit types
		
		// is there an object like
		if (this.globs.Service[configService.ServiceType]) {
			// is it a function?
			if (typeof this.globs.Service[configService.ServiceType] === 'function') {
				// better.
				// sanity check: does it have a prperty called 'characteristics' - then it is most certainly the right type
				if (this.globs.Service[configService.ServiceType].characteristics) {
					// ok, we assume it's about right!
					
					// create new service
					var myKNXService = new ServiceKNX(configService.ServiceName, configService, this.globs);  // Service.ContactSensor(config.name,config.name);
					if (myKNXService.loadServiceData()) {
						// everything went fine!
						this.globs.info("KNX Service created")
						this.services.push(myKNXService);
					} else {
						this.globs.info("Something went wrong")
					}
					
					
				}else {
					this.globs.log("[ERROR] cannot create service: #" + int + " of ServiceType "+configService.ServiceType + " (no valid properties)");
					throw new Error("Must specify VALID 'ServiceType' property for each service in knx_config.json.");
					// bail out, its defect
				}
			}else {
				this.globs.log("[ERROR] cannot create service: #" + int + " of ServiceType "+configService.ServiceType + " (wrong type)");
				throw new Error("Must specify VALID 'ServiceType' property for each service in knx_config.json.");
				// bail out, its defect
			}
			
		} else {
			this.globs.log("[ERROR] cannot create service: #" + int + " of ServiceType "+configService.ServiceType + " (not found)");
			throw new Error("Must specify VALID 'ServiceType' property for each service in knx_config.json.");
			// bail out, its defect
		}
			

	}
}


//exports **************************************************************************************************************

module.exports = KNXDevice;