/*
 * The representation of a homekit service for use with homebridge-knx. A Service has
 * 
 * a name (unique) 
 * a subtype (can be identical to name, unique in the parent device) 
 * a HK service (for persistence:
 * reference to homekit type) one or more characteristics
 * 
 */
'use strict';
var CharacteristicKNX = require('./characteristic-knx');
var iterate = require('./iterate');
var CustomServiceAPI = require('./customServiceAPI');

class ServiceKNX {

	/**
	 * Represents a complete service object
	 * 
	 * @class
	 * @constructor
	 * @param {knxdevice~KNXDevice} device - The Device this service to associated with
	 * @param {ConfigObject} config - The part of the config for the Service
	 * @param {Object} globs - global style object
	 * @property {Service} serviceHK - the bound HomeKit Service
	 */
	constructor (device, config, globs) {
		/** @type {string} */
		this.name = config.ServiceName;
		/** @type {KNXDevice} */
		this.device = device; // back ref
		this.config = config;
		this.globs = globs;
		this.hap = globs.hap;
		/** @type {hap_Services} */
		this.Services = globs.Service;
		/** @type {function} */
		this.log = globs.log;
		this.myCharacteristics = [];
		this.globs.info("Service constructor called");

		// try to validate the parameters
		if (this.globs.Service[config.ServiceType]) {
			this.globs.info("ServiceType defined");
			// is it a function?
			if (typeof this.globs.Service[config.ServiceType] === 'function') {
				this.globs.info("ServiceType known as function");

				// ok, we assume it's about right!
				//this.globs.info("ServiceType has characteristics");
				// create new service
				this.failed = !this.loadServiceData(device.getPlatformAccessory()); //plugin-2: we need to find the existing services later


			} else {
				this.globs.log("[ERROR] cannot create service of ServiceType " + config.ServiceType + " (wrong type)");
				this.failed = true;
				throw new Error("Must specify VALID 'ServiceType' property for each service in knx_config.json.");
				// bail out, it's defect
			}

		} else {
			this.globs.log("[ERROR] cannot create service of ServiceType " + config.ServiceType + " (not found)");
			this.failed = true;
			throw new Error("Must specify VALID 'ServiceType' property for each service in knx_config.json.");
			// bail out, it's defect
		}

	}

	/**
	 * Loads the data from the config Initialize the HK Service type
	 * 
	 * @param {platformAccessory} platformAccessory a new or restored homekit accessory (instance of platformAccessory)
	 * 
	 * @returns {boolean} success
	 */
	loadServiceData (platformAccessory) {
		/** @type {boolean} */
		var newService;
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


		// if the accessory was created by homebridge plugin-2 version, we do not have to create a new service but to get the right service!!

		// this.serviceHK = new this.Services[this.config.ServiceType](this.name, this.name);
		// plugin-2:
		// if it is a restored service, it should already be in the homekit object.

		// search
		if (!this.config.subtype) {
			// seems to be new, generate a subtype string
			// upon creation of a new service, generate a unique and unchangeable subtype for that!
			this.globs.info('Creating new subtype ID');
			this.config.subtype = 'SUB_' + this.globs.API.hap.uuid.generate('KNX' + Math.random() + Math.random() + Math.random());
		}

		// try to find it.
		/** @type {Service} */
		this.serviceHK = platformAccessory.getServiceByUUIDAndSubType(this.Services[this.config.ServiceType], this.config.subtype); //we use the constructor instead of the UUID string.


		if (!this.serviceHK) {
			// it's a new one, didn't find it
			this.globs.info('Did not find restored service for: ' + this.name);
			newService = true;
			// upon creation of a new service, generate a unique and unchangeable subtype for that!
			/**
			 * Homekit Service
			 * 
			 * @type {service}
			 */
			this.serviceHK = new this.Services[this.config.ServiceType](this.name, this.config.subtype);
			this.globs.info('Created service: ' + this.name);
		} else {
			newService = false;
			this.globs.info('Found restored service: ' + this.name);
		}

		/** @type {string} */
		this.serviceType = this.config.ServiceType;

		/** @type {string} */
		this.description = this.config.Description;

		/** @type {string} */
		this.handler = this.config.Handler || "Default";
		if (this.config.Handler) {
			// create an API object
			this.customServiceAPI = new CustomServiceAPI(this, this.config.Handler);
		}

		// we need to establish the characteristics and the mappers
		// for each characteristic in config

		if (this.config.Characteristics) {
			this.globs.info("Preparing Characteristics: " + this.config.Characteristics.length);
			for (var i1 = 0; i1 < this.config.Characteristics.length; i1++) {
				this.globs.info(this.config.Characteristics[i1].Type);
				this.globs.info("Adding characteristic...");
				// see characteristic-knx.js
				this.myCharacteristics.push(new CharacteristicKNX(this, this.config.Characteristics[i1], this.globs));
			}
		}
		if (this.config.KNXObjects) {
			this.globs.info("Preparing KNXObjects: " + this.config.KNXObjects.length);
			if (this.customServiceAPI) {
				for (var iObj = 0; iObj < this.config.KNXObjects.length; iObj++) {
					var thatObject = this.config.KNXObjects[iObj];
					if (!thatObject.Type) {
						throw new Error("Must specify 'KNXObjects' property 'Type' for '+ this.name +' in knx_config.json.");
					}if (!thatObject.DPT) {
						throw new Error("Must specify 'KNXObjects' property 'DPT' for '+ thatObject.Type +' in knx_config.json.");
					}
					this.customServiceAPI.addPseudoCharacteristic(thatObject.Type, thatObject.Set, thatObject.Listen, thatObject.DPT);	
				}

			} else {
				throw new Error("Must not specify 'KNXObjects' property for default service handler in knx_config.json.");
			}
		}

		// if it has a custom handler it can have the following more sections:
		/*
		 *		    "KNXObjects": [
		 				{
							"Type:":"ShutterMove"
							"Listen": "1/2/1",
							"DPT":"DPT1"
						}
					],
					"KNXReadRequests": [
						"1/2/4",
						"1/3/2"
					],
					"LocalConstants": [
						"SomeVariable": "SomeTextValue",
						"OtherBlinds": number
					]
		 */
		// KNX-Objects look just like characteristics, except they don't have a homekit side
		// for use with the customServiceAPI, they need
		// setGroupAddressList[]
		// listenGroupAddressList[]
		// getDPT() function

		// add to the hash map of read addresses
		if (this.config.KNXReadRequests) {
			for (var iRR = 0; iRR < this.config.KNXReadRequests.length; iRR++) {
				this.globs.readRequests[this.config.KNXReadRequests[iRR]] = 1;
			}
		}	

		if (newService) {
			// inject it into HomeKit
			this.globs.info('Adding service to  accessory ' + platformAccessory.displayName + ' for: ' + this.name);
			platformAccessory.addService(this.serviceHK);

		}
		return true;
	}

	/**
	 * return the Service Object for Homekit.
	 */
	getHomeKitService() {
		return this.serviceHK;
	}
}







//exports *****************************************************

/**
 * The representation of a homekit service for use with homebridge-knx. A Service has: a name (unique), a subtype (can
 * be identical to name, unique in the parent device), a HK service (for persistence: reference to homekit type), one or
 * more characteristics
 */
module.exports = ServiceKNX;
