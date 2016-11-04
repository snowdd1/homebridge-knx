'use strict';
/**
 * Everything about characteristics
 */

var iterate = require('./iterate');
var knxAccess = require('./knxaccess.js');

/**
 * CharacteristicKNX is the wrapper for HomeKit charcteristics with everything needed for KNX use
 */
class CharacteristicKNX {
	/**CharacteristicKNX is the wrapper for HomeKit charcteristics with everything needed for KNX use
	 * @constructor
	 * @param {Object} service - The service this characteristic is about to belong to.
	 * @param {Object} config - configuration object structure for that characteristic
	 * @param {Object} globs - global style variable object
	 */
	constructor (service, config, globs) {
		this.config = config;
		this.globs = globs;
		this.log = globs.log;
		globs.info("CharacteristicKNX.Constructor");
		this.service = service;
		this.availableCharacteristics = globs.Characteristic;
		if (!this.config.Type) {
			throw ((new Error("Characteristic with no type ")).message="CONFIG ERROR");
		}
		iterate(this.config);

		if (this.config.Type !== "custom") {
			// normal characteristic
			// check type
			if (!this.availableCharacteristics[this.config.Type]) {
				// failed no such type
				throw ((new Error("Characteristic with unknown type " + this.config.Type)).name="CONFIG ERROR");
			}
			// For elements restored by homebridge plugin-2 version it is required to get the exact characteristic (are unique so no hassle)
			// AFAIK: each service can have each characteristic exactly once
			/**
			 * HomeKit characteristic
			 * 
			 * @type {Characteristic}
			 */
			this.chr = this.service.getHomeKitService().getCharacteristic(this.availableCharacteristics[this.config.Type]);
			if (!this.chr) {
				// it's not default, restored and it's not a defined optional
				this.log("Warning: the characteristic " + this.config.Type + " may break compliance to homekit.");
				this.chr = this.service.getHomeKitService().addCharacteristic(this.availableCharacteristics[this.config.Type]);
			}
			this.name = this.config.Type;
			

		} else {
			// custom characteristic, more data required, such as UUID and name and properties.
			throw {
				name : "CONFIG ERROR",
				message : "Custom characteristic not yet supported"
			};
		}

		/*
		 * TODO add custom property values here
		 * like min and max values
		 */
		// if the characteristic has min and maxValue fields, it is safe to overwrite them with values from the config file
		
		if (this.chr.props.minValue || this.chr.props.maxValue) { // one of them could be 0, but usually not both
			if (this.config.MinValue!=undefined) // evil twin required for comparing with undefined 
			{
				this.chr.props.minValue = this.config.MinValue;
				this.globs.info("Setting minValue to "+ this.config.MinValue);
			}
			if (this.config.MaxValue!=undefined) // evil twin required for comparing with undefined
			{
				this.chr.props.maxValue = this.config.MaxValue;
				this.globs.info("Setting maxValue to "+ this.config.MaxValue);
			}
			
		}
		
		
		// if the characteristic is writable (that is, from homekit to the KNX bus) AND we have a Set section in the config...
		if (this.chr.props.perms.indexOf(this.globs.Characteristic.Perms.WRITE) > -1) {
			if (this.config.Set) {
				// add the group addresses to the set-ga list
				// register the default handler

				if (!Array.isArray(this.config.Set)) {
					// make it an array nevertheless
					this.config.Set = [].concat(this.config.Set);
				}
				/** @type {object[]}*/
				this.setGroupAddressList = [];

				// copy the addresses after validation
				// for each address, make an object {address: string, reverse: boolean}
				//iterate(this.config.Set); //DEBUG
				
				for (var isetga = 0; isetga < this.config.Set.length; isetga++) {
					var cGA = this.config.Set[isetga];
					if (knxAccess.validateAddressText(cGA)==='OK') {
						this.setGroupAddressList.push({
							/** @type {string} */
							address: cGA, 
							reverse: (this.config.Reverse===true),
							dptype: this.getDPT()
						});
					} else {
						// scream!
						this.globs.log(knxAccess.validateAddressText(cGA));
						throw (new Error("CONFIG ERROR").message='Invald group Address: '+ cGA);
					}
				} // for

				//Default handler, writes KNX values to "Set" section only
				if (this.service.handler === "Default") {
					// bind the knx write handler to the set event
					this.getHomekitCharacteristic().on("set", this.defaultUpdateKNXValue.bind(this));
				} 
			}
			if (this.service.handler !== "Default") {
				// the customAPI handler does not need a Set value, can act differently
				this.getHomekitCharacteristic().on("set", function(value, callback, context) {
					this.service.customServiceAPI.homekitEventCatcher (this.name, value, callback, context);
				}.bind(this));

			}
		} // writable
		// if it is readable AND we have a listen section in the config
		if (this.chr.props.perms.indexOf(this.globs.Characteristic.Perms.READ) > -1) {
			if (this.config.Listen) {

				if (!Array.isArray(this.config.Listen)) {
					// make it an array nevertheless
					this.config.Listen = [].concat(this.config.Listen);
				}
				/** @type {object[]}*/
				this.listenGroupAddressList = [];

				// copy the addresses after validation
				// for each address, make an object {address: string, reverse: boolean}

				for (var isetga = 0; isetga < this.config.Listen.length; isetga++) {
					var cGA = this.config.Listen[isetga];
					if (knxAccess.validateAddressText(cGA)==='OK') {
						this.listenGroupAddressList.push({
							/** @type {string} */
							address: cGA, 
							reverse: (this.config.Reverse===true)
						});
					} else {
						// scream!
						this.globs.log(knxAccess.validateAddressText(cGA));
						throw (new Error("CONFIG ERROR").message('Invald group Address: '+ cGA));
					}
				} // for
				//Default handler
				if (this.service.handler === "Default") {

					// bind to bus:
					for (var ibGA = 0; ibGA < this.listenGroupAddressList.length; ibGA++) {
						var cBGA = this.listenGroupAddressList[ibGA];
						this.globs.knxmonitor.registerGA(cBGA.address, function(val, src, dest, type) {
							knxAccess.writeValueHK(val, this, this.getDPT(), cBGA.reverse);
						}.bind(this));
					}
				} else {
					// bind to custom API
					for (var isga = 0; isga < this.listenGroupAddressList.length; isga++) {
						var thisGA = this.listenGroupAddressList[isga];
						
						this.globs.knxmonitor.registerGA(thisGA.address, function(val, src, dest, type) {
							this.service.customServiceAPI.knxbusEventCatcher (this.name, val, src, dest, type);
						}.bind(this));	
					}
					// bind to KNX bus events

				}
			}
		}
		// add to custom charcteristc list 
		if (this.service.handler !== "Default") {
			this.service.customServiceAPI.addCharacteristic(this);
		}

	}

	/**
	 * getHomekitCharacteristic extracts the Homekit-Characteristic object from the KNX wrapper object.
	 * 
	 * @returns {Characteristic}
	 */
	getHomekitCharacteristic() {
		return this.chr;
	}

	/**
	 * get the KNX dpt of the characteristic. Assume based on homekit characteristic type or take from config (has
	 * precedence)
	 * 
	 * @returns {string}
	 */
	getDPT() {
//		this.log("getDPT() for " + this.chr.displayName + ", config says " + this.config.DPT + ", format says " + this.chr.props.format);
		if (this.config.DPT) {
			return this.config.DPT;
		} else {
			if (this.chr.props.format === this.globs.Characteristic.Formats.BOOL) {
				// found boolean, assume DPT1
				return "DPT1";
			}
			if (this.chr.props.format === this.globs.Characteristic.Formats.INT) {
				// found INT, assume DPT5, unless props.unit is Units.PERCENTAGE
				if (this.chr.props.unit === this.globs.Characteristic.Units.PERCENTAGE) {
					return "DPT5.001";
				} else {
					return "DPT5";
				}
			}
			if (this.chr.props.format === this.globs.Characteristic.Formats.UINT8) {
				// found INT, assume DPT5
				return "DPT5";
			}
			if (this.chr.props.format === this.globs.Characteristic.Formats.PERCENTAGE) {
				// found PERC, assume DPT5.001
				return "DPT5.001";
			}
			if (this.chr.props.format === this.globs.Characteristic.Formats.FLOAT) {
				// found FLOAT, assume DPT9
				return "DPT9";
			}
		}
		return undefined; // unknown type
	}

	/**
	 * The default handler for characteristic updates to the KNX bus if no special service handler is used. Writes to
	 * one address or an array of addresses. Uses DPT settings from getDPT(). Can be directly registered as event
	 * handler of characteristic change
	 * 
	 * @param {number} value
	 * @param {function} callback from homebridge to be called upon completion
	 * @param {string} context
	 */
	defaultUpdateKNXValue(value, callback, context) {
		// is the value to be sent to the bus, or originating there?
		if (context === 'fromKNXBus') { // from the bus, ignore!
			if (callback) {
				try {
					callback();
				} catch (e) {
					this.globs.log('Caught error '+ e + ' when calling homebridg callback.');
				}
			}
			return;
		}

		for (var int2 = 0; int2 < this.setGroupAddressList.length; int2++) {
			iterate(this.setGroupAddressList[int2]); // DEBUG
			knxAccess.writeValueKNX(value, this.setGroupAddressList[int2], callback);
		}

		// done
	}
}

module.exports = CharacteristicKNX;
