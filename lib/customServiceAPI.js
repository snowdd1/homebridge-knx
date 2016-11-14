'use strict';
var HandlerPattern = require('./addins/handlerpattern.js');
var KNXAccess = require('./knxaccess.js');
var iterate = require('./iterate.js');

/**
 * @classdesc represents the API to be used for knx service add-ins
 */
class customServiceAPI  {
	/**
	 * creates an API object for custom handler
	 * 
	 * @param {ServiceKNX} serviceKNX - back reference to the managed service
	 * @param {function} handler
	 * @private
	 */
	constructor (serviceKNX, handlerName){
		serviceKNX.globs.info("customServiceAPI.constructor(service, "+handlerName+")");
		var Handler = new require('./addins/'+handlerName+'.js');
		this.handler = new Handler(this);
		// FIXME: doesnt work
		if (this.handler instanceof HandlerPattern) {
			// everything fine
			serviceKNX.globs.info('HandlerPattern instatiated!');
		} else {
			throw (new Error('HANDLER CONFIGURATION ERROR').message='Error in ' + handlerName + ' - not InstanceOf HandlerPattern().');
		}
		
		this.serviceKNX = serviceKNX; 
		this.handlerName=handlerName;
		/**
		 * List of characteristis handled by this API
		 * 
		 * @type {characteristicKNX[named]}
		 */  
		this.characteristicsList={}; // create a local characteristics list
		this.charValueList = {}; // later stores the values of the characteristics/fields
	}

	/**
	 * Adds a new characteristic to the API instance.
	 * 
	 * @param {CharacteristicKNX} characteristicKNX - The characteristic to be added
	 */
	addCharacteristic(characteristicKNX) {
		this.serviceKNX.globs.info(this.handlerName+': Adding Characteristic ' + characteristicKNX.name);
		this.characteristicsList[characteristicKNX.name]= characteristicKNX;
		this.charValueList[characteristicKNX.name]= null;
	}

	/**
	 * Adds an KNX-Object to the API instance
	 * 
	 * @param {string} name - unique name
	 * @param {string[]} setGroupAddresses - List of set Addresses
	 * @param {string[]} listenGroupAddresses - List of set Addresses
	 */
	addPseudoCharacteristic(name, setGroupAddresses, listenGroupAddresses, dptype) {
		this.serviceKNX.globs.info(this.handlerName+': Adding PseudoCharacteristic ' + name);
		if (this.characteristicsList[name]) {
			// name already given in that service
			throw (new Error('CONFIGURATION ERROR').message='Duplicate Type "'+ name+ '" service '+this.serviceKNX.name+ ' in knx_config.json');
		}
		this.characteristicsList[name]= {
			name: name,
		};
		this.charValueList[name]= null;
		this.characteristicsList[name].setGroupAddressList = [];
		this.characteristicsList[name].listenGroupAddressList = [];
		this.characteristicsList[name].pseudo=true;
		if (setGroupAddresses) {
			setGroupAddresses = [].concat(setGroupAddresses);
			for (var isga = 0; isga < setGroupAddresses.length; isga++) {
				var thisGA = setGroupAddresses[isga];
				this.characteristicsList[name].setGroupAddressList.push({address: thisGA, reverse: false, dptype: dptype});

			}
		}
		this.characteristicsList[name].listenGroupAddressList = [];
		if (listenGroupAddresses) {
			listenGroupAddresses = [].concat(listenGroupAddresses);
			for (var isga = 0; isga < listenGroupAddresses.length; isga++) {
				var thisGA = listenGroupAddresses[isga];
				this.characteristicsList[name].listenGroupAddressList.push({address: thisGA, reverse: false, dptype: dptype});
				this.serviceKNX.globs.knxmonitor.registerGA(thisGA, function(val, src, dest, type) {
					this.knxbusEventCatcher (name, val, src, dest, type);
				}.bind(this));	
			}
			// bind to KNX bus events

		}
	}
	/**
	 * Sets a homekit value for a local characteristic
	 * 
	 * @param {string} field - The name of the characteristic, like "On" for lightbulb power
	 * @param {primitive} value - the value for the characteristic, dependent on the characteristic's type
	 */
	setValue (field, value) {
		var chrKNX;
		this.serviceKNX.globs.info(this.handlerName + "->customServiceAPI.setValue("+field+","+value+")");
		// get the characteristic
		if (!this.characteristicsList[field]) {
			throw (new Error('HANDLER CONFIGURATION ERROR').message='Error in ' + this.handlerName + '. Field '+ field + ' does not exist');
		} else {
			chrKNX = this.characteristicsList[field];
		}
		if (!chrKNX.pseudo) {
			// push to HomeKit
			KNXAccess.writeValueHK(value, chrKNX, undefined, false);
			// Store value locally
			this.charValueList[chrKNX.name]=value;
		} else {
			throw (new Error('HANDLER CONFIGURATION ERROR').message='Error in ' + this.handlerName + '. Field '+ field + ' is no HomeKit object.');
		}
	}

	/**
	 * Returns a local characteristic's value
	 * 
	 * @param {string} field - The name of the characteristic, like "On" for lightbulb power
	 * @return {primitive} - Dependent on the charceristic's type
	 */
	getValue (field) {
		var chrKNX;
		this.serviceKNX.globs.info(this.handlerName + "->customServiceAPI.getValue("+field+")");
		// get the characteristic
		if (!this.characteristicsList[field]) {
			throw (new Error('HANDLER CONFIGURATION ERROR').message='Error in ' + this.handlerName + '. Field '+ field + ' does not exist');
		} else {
			chrKNX = this.characteristicsList[field];
		}
		if (!chrKNX.pseudo) {
			this.serviceKNX.globs.info("Returning HomeKitValue");
			var v = chrKNX.getHomekitCharacteristic().value;
			this.serviceKNX.globs.info("Returning HomeKitValue of " + v);
			return v;
		} else {
			this.serviceKNX.globs.info("Returning Pseudo characteristic value of "+ this.charValueList[field]);
			return this.charValueList[field];
		}
	}

	/**
	 * Writes a value to the KNX bus. Requires a "Set" address in the characteristic
	 * 
	 * @param {string} field - The name of the characteristic, like "On" for lightbulb power
	 * @param {primitive} value - The value to be sent.
	 * @param {string} dptype - Data Point Type like "DPT5" for 1 byte 0..255, "DPT5.001" for automatic conversion from
	 *        decimal 0..100 to 0..255 or "DPT1" for boolean
	 */
	knxWrite (field, value, dptype) {
		/** @type {CharacteristicKNX} */
		var chrKNX;
		this.serviceKNX.globs.info(this.handlerName + "->customServiceAPI.knxWrite("+field+","+value+","+dptype+")");

		// get the characteristic
		//iterate(this.characteristicsList);
		if (!this.characteristicsList[field]) {
			throw (new Error('HANDLER CONFIGURATION ERROR').message='Error in ' + this.handlerName + '. Field '+ field + ' does not exist');
		} else {
			chrKNX = this.characteristicsList[field];
		}
		if (!dptype) {
			// get the DPT of the characteristic
			dptype = chrKNX.getDPT();
		}
		// iterate through all group addresses to be written for that characteristic
		for (var iGA = 0; iGA < chrKNX.setGroupAddressList.length; iGA++) {
			var gaddress = chrKNX.setGroupAddressList[iGA];
			gaddress.dptype=dptype;
			KNXAccess.writeValueKNX(value, gaddress, undefined);
		}

	}

	/**
	 * Returns a characteristic's value from another device/service.
	 * 
	 * @param {string} device - unique name of the device as in the configuration
	 * @param {string} service - unique name of the service as in the configuration
	 * @param {string} field - The name of the characteristic, like "On" for lightbulb power
	 * @return {primitive}
	 */
	getGlobalValue (device, service, field) {
		// var dev = globs.devices[index].name
		var myDevice, myService, thatService, thatChar;
		for (var iDevice = 0; iDevice < this.service.globs.devices.length; iDevice++) {
			var thatDevice = this.service.globs.devices[iDevice];
			if (thatDevice.name===device) {
				myDevice = thatDevice;
			}
		}
		if (!myDevice) {
			this.service.globs.log("ERROR in custom handler ");
			throw (new Error("ERROR in custom handler").message="Device "+device+ " not found.");
		}
		for (var iService = 0; iService < myDevice.services.length; iService++) {
			thatService = myDevice.services[iService];
			if (thatService.name===service) {
				myService = thatService;
			}
		}
		if (!myService) {
			this.service.globs.log("ERROR in custom handler ");
			throw (new Error("ERROR in custom handler").message="Service "+device+ " not found in Device "+ device+".");
		}
		if (myService.handler==='Default') {		
			for (var iCHars = 0; iCHars < myService.myCharacteristics.length; iCHars++) {
				thatChar = myService.myCharacteristics[iCHars];
				if (thatChar.name===field) {
					return thatChar.getHomekitCharacteristic().getValue();
				}
			}
		}
		else {
			// get the value from customServiceAPI
			return myService.customServiceAPI.getValue(field);
		}

	}

	/**
	 * Returns a local constant's value. Local constants are stored in the service's sub-section "LocalConstants" and
	 * can be used to store referenced services and referenced devices for use with getGlobalValue()
	 * 
	 * @param {string} field - The name of the constant
	 * @return {primitive} - Dependent on the constant's type
	 */
	getLocalConstant (field) {
		var lc = this.serviceKNX.config.LocalConstants;
		if (lc) {
			return lc[field];
		}
	}
	
	/**
	 * Get a characteristics property. Used for getting the minValue or maxValue or stepValue properties from 
	 * the homekit characteristic, which might be overwritten by values in the knx_config.json file. Watch out,
	 * these use the hap-nodejs-syntax, not the knx_config-syntax. 
	 * 
	 * @param {string} field - The name of the characteristic
	 * @param {string} property - The name of the property
	 * @return {
	 *   format: <one of Characteristic.Formats>,
	 *   unit: <one of Characteristic.Units>,
	 *   minValue: <minimum value for numeric characteristics>,
	 *   maxValue: <maximum value for numeric characteristics>,
	 *   minStep: <smallest allowed increment for numeric characteristics>,
	 *   perms: array of [Characteristic.Perms] like [Characteristic.Perms.READ, Characteristic.Perms.WRITE]
	 * } 
	 * 
	 */
	getProperty (field, property) {
		var chrKNX;
		this.serviceKNX.globs.info(this.handlerName + "->customServiceAPI.getProperty("+field+", " + property +")");
		// get the characteristic
		if (!this.characteristicsList[field]) {
			throw (new Error('HANDLER CONFIGURATION ERROR').message='Error in ' + this.handlerName + '. Field '+ field + ' does not exist');
		} else {
			chrKNX = this.characteristicsList[field];
		}
		if (!chrKNX.pseudo) {
			// it's a true homekit characteristic
			/** @type {propsObject} */
			var p = chrKNX.getHomekitCharacteristic().props;
			if (p.hasOwnProperty(property)) {
				return p[property];	
			}
			return undefined;
		} else {
			// it's an invented one (KNXObject)
			this.serviceKNX.globs.info("Returning UNDEFINED for pseudo characteristic property "+ property);
			return undefined;
		}
	}
	
	
	

	/**
	 * homekitEventCatcher is bound to homebridge events
	 * 
	 * @private
	 */
	homekitEventCatcher (characteristicName, value, callback, context) {
		if (context==='fromKNXBus') {
			// done, call callback
			if (callback) { 
				callback();
			}
		} else {
			if (typeof this.handler.onHKValueChange==='function') {
				// implementation looks good
				if (callback) {callback();}
				this.handler.onHKValueChange(characteristicName, this.charValueList[characteristicName], value);
				this.charValueList[characteristicName]=value;
			} else if (callback) {
				callback();
			}
		}
			
	}

	/**
	 * knxbusEventCatcher(characteristicName, value globs.knxmonitor.registerGA(this.groupAddress.address,
	 * this.update.bind(this)); update = function(val, src, dest, type)
	 * @private
	 */
	knxbusEventCatcher (characteristicName, val, src, dest, type) {
		var oldValue = this.charValueList[characteristicName];
		this.handler.onKNXValueChange(characteristicName, oldValue, val);
		// in case of non-characteristic save the value locally:
		if (this.characteristicsList[characteristicName].pseudo) {
			this.charValueList[characteristicName] = val;
		}
	}
}
module.exports=customServiceAPI;