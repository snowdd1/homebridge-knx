/*****
 * Platform shim for use with nfarina's homebridge plugin system 
 * This is the version for plugin support
 * ******************************************************************************************** 
 * 
ALL NEW VERSION WITH OWN PERSISTENCE LAYER (file based, anyhow)
 */


'use strict';
//var types = require("HAP-NodeJS/accessories/types.js"); // is not to be used any more
var knxd = require('eibd');
var Hapi = require('hapi');

var Service, Characteristic; // passed default objects from hap-nodejs

var globs = {}; // the storage for cross module data pooling;


/**
 * KNXPlatform
 * 
 * @constructor
 * @param {function} log - logging function for console etc. out
 * @param {object} config - configuration object from global config.json
 */
function KNXPlatform(log, config){
	this.log = log;
	this.Old_config = config;

}

/**
 * Registers the plugin with homebridge. Will be called by homebridge if found in directory structure and package.json
 * is right This function needs to be exported.
 * 
 * @param {object} homebridgeAPI - The API Object made available by homebridge. Contains the HAP type library e.g.
 * 
 */
function registry(homebridgeAPI) {
	//console.log("HERE: hombridge-knx/index.js/registry()");
	Service = homebridgeAPI.hap.Service;
	Characteristic = homebridgeAPI.hap.Characteristic;
	globs.Service = Service;
	globs.Characteristic = Characteristic;
	globs.API = homebridgeAPI;
	homebridgeAPI.registerPlatform("homebridge-knx", "KNX", KNXPlatform); //update signature for homebridge 0.2.0
}

module.exports = registry;


/**
 * The accessories method is invoked by homebridge after calling the constructor. It is supposed to return an array of accessories as parameter of the callback
 * @param {function(array)} callback - the callback to invoke after finishing fetching accessories.
 */
KNXPlatform.prototype.accessories = function(callback) {
	this.log("Fetching KNX devices.");
	var that = this;

	/* our own config file */
	var userOpts = require('./lib/user').User;
	this.config = userOpts.loadConfig();
	
	/* we should have now:
	 * - knxd_ip
	 * - knxd_port
	 * - GroupAddresses object
	 * - Devices Object
	
	
	*/
	
	if (!this.config.GroupAddresses){
		this.config.GroupAddresses = [];
	}
	
	
	// iterate through all devices the platform my offer
	// for each device, create an accessory

	// read accessories from file !!!!!
	var foundAccessories = this.config.Devices || []; 


	//create array of accessories
	globs.devices = [];

	for (var int = 0; int < foundAccessories.length; int++) {
		this.log("parsing acc " + int + " of " + foundAccessories.length);
		// instantiate and push to array

		this.log("push new device "+foundAccessories[int].name);
		// push knxd connection setting to each device from platform
		
		
		
		var accConstructor = require('./lib/knxdevice.js');
		
		var acc = new accConstructor(globs,foundAccessories[int]);
		
		this.log("created "+acc.name+" accessory");	
		globs.devices.push(acc);
	}	
	// if done, return the array to callback function
	this.log("returning "+globs.devices.length+" accessories");
	callback(globs.devices);
}





/***********************************************************************************************************************
 * this section replaces the knxdevice.js file
 */


//var Service = require("HAP-NodeJS").Service;
//var Characteristic = require("HAP-NodeJS").Characteristic;
//var knxd = require("eibd");
//var knxd_registerGA = require('./KNX.js').registerGA;
//var knxd_startMonitor = require('./KNX.js').startMonitor;

var milliTimeout = 300; // used to block responses while swiping

var colorOn = "\x1b[30;47m";
var colorOff = "\x1b[0m";


/***********************************************************************************************************************
 * DEBUGGER FUNCTION ONLY
 */

//inspects an object and prints its properties (also inherited properties) 
var iterate = function nextIteration(myObject, path){
	// this function iterates over all properties of an object and print them to the console
	// when finding objects it goes one level  deeper
	var name;
	if (!path){ 
		console.log("---iterating--------------------");
	}
	for (name in myObject) {
		if (typeof myObject[name] !== 'function') {
			if (typeof myObject[name] !== 'object' ) {
				console.log((path  || "") + name + ': ' + myObject[name]);
			} else {
				nextIteration(myObject[name], path ? path + name + "." : name + ".");
			}
		} else {
			console.log((path  || "") + name + ': (function)' );
		}
	}
	if (!path) {
		console.log("================================");
	}
};






KNXDevice.prototype = {



/**
 * Registering routines
 * 
 */
		// boolean: get 0 or 1 from the bus, write boolean
		knxregister_bool: function(addresses, characteristic) {
			this.log("knx registering BOOLEAN " + addresses);
			registerGA(addresses, function(val, src, dest, type, reverse){
				this.log("[" +this.name + "]: Received value from bus:"+val+ " for " +dest+ " from "+src+" of type "+type + " for " + characteristic.displayName);
				characteristic.setValue(val ? (reverse ? 0:1) : (reverse ? 1:0), undefined, 'fromKNXBus');
			}.bind(this));
		},

		// percentage: get 0..255 from the bus, write 0..100 to characteristic
		knxregister_percent: function(addresses, characteristic) {
			this.log("knx registering PERCENT " + addresses);
			registerGA(addresses, function(val, src, dest, type, reverse){
				this.log("[" +this.name + "]: Received value from bus:"+val+ " for " +dest+ " from "+src+" of type "+type+ " for " + characteristic.displayName);
				if (type !== "DPT5") {
					this.log("[ERROR] Received value cannot be a percentage value");
				} else {
					characteristic.setValue(Math.round(( reverse ? (255-val):val)/255*100), undefined, 'fromKNXBus');
				}
			}.bind(this));
		},
		// float
		knxregister_float: function(addresses, characteristic) {
			// update for props refactor https://github.com/KhaosT/HAP-NodeJS/commit/1d84d128d1513beedcafc24d2c07d98185563243#diff-cb84de3a1478a38b2cf8388d709f1c1cR50
			
			var validValue = true;
			var hk_value = 0.0;
			this.log("["+ this.name +"]:[" + characteristic.displayName+ "]:knx registering FLOAT " + addresses);
			registerGA(addresses, function(val, src, dest, type, reverse){
				this.log("["+ this.name +"]:[" + characteristic.displayName+ "]: Received value from bus:"+val+ " for " +dest+ " from "+src+" of type "+type+ " for " + characteristic.displayName);
				// make hk_value compliant to properties
				if (characteristic.props.minStep) {
					// quantize
					hk_value = Math.round(val/characteristic.props.minStep)/(1/characteristic.props.minStep);	
				} else {
					hk_value = val;
				}
				// range check
				validValue = true; // assume validity at beginning
				if (characteristic.props.minValue) {
					validValue = validValue && (hk_value>=characteristic.props.minValue);
				}
				if (characteristic.props.maxValue) {
					validValue = validValue && (hk_value<=characteristic.props.maxValue);
				}
				if (validValue) {
					characteristic.setValue(hk_value, undefined, 'fromKNXBus'); // 1 decimal for HomeKit
				} else {
					this.log("["+ this.name +"]:[" + characteristic.displayName+ "]: Value %s out of bounds %s...%s ",hk_value, characteristic.props.minValue, characteristic.props.maxValue);
				}
			}.bind(this));
		},
		//integer
		knxregister_int: function(addresses, characteristic) {
			this.log("["+ this.name +"]:[" + characteristic.displayName+ "]:knx registering INT " + addresses);
			registerGA(addresses, function(val, src, dest, type, reverse){
				this.log("["+ this.name +"]:[" + characteristic.displayName+ "]: Received value from bus:"+val+ " for " +dest+ " from "+src+" of type "+type+ " for " + characteristic.displayName);
				if (val>=(characteristic.props.minValue || 0) && val<=(characteristic.props.maxValue || 255)) {
					// use the safe setter
					characteristic.setValue(safeSet(characteristic, reverse ? (255-val):val), undefined, 'fromKNXBus'); 
				} else {
					this.log("["+ this.name +"]:[" + characteristic.displayName+ "]: Value %s out of bounds %s...%s ",val, (characteristic.props.minValue || 0), (characteristic.props.maxValue || 255));
				}
			}.bind(this));
		},
		knxregister_HVAC: function(addresses, characteristic) {
			this.log("["+ this.name +"]:[" + characteristic.displayName+ "]:knx registering HVAC " + addresses);
			registerGA(addresses, function(val, src, dest, type){
				this.log("["+ this.name +"]:[" + characteristic.displayName+ "]:Received value from bus:"+val+ " for " +dest+ " from "+src+" of type "+type+ " for " + characteristic.displayName);
				var HAPvalue = 0;
				switch (val){
				case 0: 
					HAPvalue = 1;
					break;
				case 1: 
					HAPvalue = 1;
					break;
				case 2: 
					HAPvalue = 1;
					break;
				case 3: 
					HAPvalue = 1;
					break;
				case 4: 
					HAPvalue = 0;
					break;
				default:
					HAPvalue = 0;
				}
				characteristic.setValue(HAPvalue, undefined, 'fromKNXBus');
			}.bind(this));
		},
		/**
		 * KNX HVAC (heating, ventilation, and air conditioning) types do not really match to homekit types: // 0 = Auto //
		 * 1 = Comfort // 2 = Standby // 3 = Night // 4 = Freezing/Heat Protection // 5 – 255 = not allowed” // The
		 * value property of TargetHeatingCoolingState must be one of the following: //
		 * Characteristic.TargetHeatingCoolingState.OFF = 0; // Characteristic.TargetHeatingCoolingState.HEAT = 1; //
		 * Characteristic.TargetHeatingCoolingState.COOL = 2; // Characteristic.TargetHeatingCoolingState.AUTO = 3; AUTO
		 * (3) is not allowed as return type from devices!
		 */
		// undefined, has to match!
		knxregister: function(addresses, characteristic) {
			this.log("["+ this.name +"]:[" + characteristic.displayName+ "]:knx registering " + addresses);
			registerGA(addresses, function(val, src, dest, type){
				this.log("["+ this.name +"]:[" + characteristic.displayName+ "]:Received value from bus:"+val+ " for " +dest+ " from "+src+" of type "+type+ " for " + characteristic.displayName);
				characteristic.setValue(val, undefined, 'fromKNXBus');
			}.bind(this));
		},



/**
 * identify dummy
 * 
 */
		identify: function(callback) {
			this.log("["+ this.name +"]:Identify requested!");
			callback(); // success
		},
/**
 * bindCharacteristic initializes callbacks for 'set' events (from HK) and for KNX bus reads (to HK)
 */
		bindCharacteristic: function(myService, characteristicType, valueType, config, defaultValue) {
			var myCharacteristic = myService.getCharacteristic(characteristicType);
			var setGA = "";
			var setReverse = false;
			if (myCharacteristic === undefined) {
				throw new Error("unknown characteristics cannot be bound");
			}
			if (defaultValue) {
				myCharacteristic.setValue(defaultValue);
			}
			if (config.Set) {
				// can write
				// extract address and Reverse flag
				setGA = config.Set.match(/\d*\/\d*\/\d*/);
				if (setGA===null) {
					this.log(colorOn + "["+ this.name +"]:["+myCharacteristic.displayName+"] Error in group adress: ["+ config.Set +"] "+colorOff);
					throw new Error("EINVGROUPADRESS - Invalid group address given");
				} else {
					setGA=setGA[0]; // first element of returned array is the group address
				}
					
				setReverse = config.Set.match(/\d*\/\d*\/\d*(R)/) ? true:false;
				

			}
			if ([config.Set].concat(config.Listen || []).length>0) {
				//this.log("Binding LISTEN");
				// can read
				switch (valueType) {
				case "Bool":
					this.knxregister_bool([config.Set].concat(config.Listen || []), myCharacteristic);
					break;				
				case "Percent":
					this.knxregister_percent([config.Set].concat(config.Listen || []), myCharacteristic);
					break;
				case "Float":
					this.knxregister_float([config.Set].concat(config.Listen || []), myCharacteristic);
					break;
				case "Int":
					this.knxregister_int([config.Set].concat(config.Listen || []), myCharacteristic);
					break;
				case "HVAC":
					this.knxregister_HVAC([config.Set].concat(config.Listen || []), myCharacteristic);
					break;
				default:
					this.log(colorOn+ "[ERROR] unknown type passed: ["+valueType+"]"+colorOff);
					throw new Error("[ERROR] unknown type passed");
				} 
				this.log("["+ this.name +"]:["+myCharacteristic.displayName+"]: Issuing read requests on the KNX bus...");
				this.knxreadarray([config.Set].concat(config.Listen || []));
			}
			return myCharacteristic; // for chaining or whatsoever
		},
/**
 * function getXXXXXXXService(config) returns a configured service object to the caller (accessory/device)
 * 
 * @param config pass a configuration array parsed from config.json specifically for this service
 * 
 */
		getContactSenserService: function(config) {
//			Characteristic.ContactSensorState.CONTACT_DETECTED = 0;
//			Characteristic.ContactSensorState.CONTACT_NOT_DETECTED = 1;
			
			// some sanity checks 
			if (config.type !== "ContactSensor") {
				this.log("[ERROR] ContactSensor Service for non 'ContactSensor' service called");
				return undefined;
			}
			if (!config.name) {
				this.log("[ERROR] ContactSensor Service without 'name' property called");
				return undefined;
			}
			
			var myService = new Service.ContactSensor(config.name,config.name);
			if (config.ContactSensorState) {
				this.log("["+ this.name +"]:ContactSensor ContactSensorState characteristic enabled");
				this.bindCharacteristic(myService, Characteristic.ContactSensorState, "Bool", config.ContactSensorState);
			} else if (config.ContactSensorStateContact1) {
				this.log(colorOn+ "[ERROR] outdated type passed: [ContactSensorStateContact1]"+colorOff);
				throw new Error("[ERROR] outdated type passed");
			} 
			//optionals
			if (config.StatusActive) {
				this.log("["+ this.name +"]:ContactSensor StatusActive characteristic enabled");
				myService.addCharacteristic(Characteristic.StatusActive);
				this.bindCharacteristic(myService, Characteristic.StatusActive, "Bool", config.StatusActive);
			} 
			if (config.StatusFault) {
				this.log("["+ this.name +"]:ContactSensor StatusFault characteristic enabled");
				myService.addCharacteristic(Characteristic.StatusFault);
				this.bindCharacteristic(myService, Characteristic.StatusFault, "Bool", config.StatusFault);
			} 
			if (config.StatusTampered) {
				this.log("["+ this.name +"]:ContactSensor StatusTampered characteristic enabled");
				myService.addCharacteristic(Characteristic.StatusTampered);
				this.bindCharacteristic(myService, Characteristic.StatusTampered, "Bool", config.StatusTampered);
			} 
			if (config.StatusLowBattery) {
				this.log("["+ this.name +"]:ContactSensor StatusLowBattery characteristic enabled");
				myService.addCharacteristic(Characteristic.StatusLowBattery);
				this.bindCharacteristic(myService, Characteristic.StatusLowBattery, "Bool", config.StatusLowBattery);
			} 
			return myService;
		},		
		
		getTemperatureSensorService: function(config) {

			// some sanity checks 
			if (config.type !== "TemperatureSensor") {
				this.log("[ERROR] TemperatureSensor Service for non 'TemperatureSensor' service called");
				return undefined;
			}
			if (!config.name) {
				this.log("[ERROR] TemperatureSensor Service without 'name' property called");
				return undefined;
			}
			var myService = new Service.TemperatureSensor(config.name,config.name);
			// CurrentTemperature)
			// props update for https://github.com/KhaosT/HAP-NodeJS/commit/1d84d128d1513beedcafc24d2c07d98185563243#diff-cb84de3a1478a38b2cf8388d709f1c1cR108
			if (config.CurrentTemperature) {
				this.log("["+ this.name +"]:TemperatureSensor CurrentTemperature characteristic enabled");
				myService.getCharacteristic(Characteristic.CurrentTemperature).setProps({
					minValue: config.CurrentTemperature.minValue || -40,
					maxValue: config.CurrentTemperature.maxValue || 60
				}); // °C by default
				this.bindCharacteristic(myService, Characteristic.CurrentTemperature, "Float", config.CurrentTemperature);
			} 

			return myService;
		},		
				
		
		
	
		
/* assemble the device ***************************************************************************************************/
		getServices: function() {

			// you can OPTIONALLY create an information service if you wish to override
			// the default values for things like serial number, model, etc.

			var accessoryServices = [];

			var informationService = new Service.AccessoryInformation();

			informationService
			.setCharacteristic(Characteristic.Manufacturer, "Opensource Community")
			.setCharacteristic(Characteristic.Model, "KNX Universal Device")
			.setCharacteristic(Characteristic.SerialNumber, "Version 1.1.4");

			accessoryServices.push(informationService);

			//iterate(this.config);

			if (!this.config.services){
				this.log("No services found in accessory?!");
			}
			var currServices = this.config.services;
			this.log("Preparing Services: " + currServices.length);
			// go through the config thing and look for services
			for (var int = 0; int < currServices.length; int++) {
				var configService = currServices[int];
				// services need to have type and name properties
				if (!configService.type && !configService.name) {
					this.log("[ERROR] must specify 'type' and 'name' properties for each service in config.json. KNX platform section fault ");
					throw new Error("Must specify 'type' and 'name' properties for each service in config.json");
				}
				this.log("Preparing Service: " + int + " of type "+configService.type);
				switch (configService.type) {
				case "ContactSensor":
					accessoryServices.push(this.getContactSenserService(configService));
					break;				
				case "GarageDoorOpener":
					accessoryServices.push(this.getGarageDoorOpenerService(configService));
					break;
				case "Lightbulb":
					accessoryServices.push(this.getLightbulbService(configService));
					break;
				case "LightSensor":
					accessoryServices.push(this.getLightSensorService(configService));
					break;
				case "LockMechanism":
					accessoryServices.push(this.getLockMechanismService(configService));
					break;
				case "MotionSensor":
					accessoryServices.push(this.getMotionSensorService(configService));
					break;	
				case "Switch":
					accessoryServices.push(this.getSwitchService(configService));
					break;					
				case "TemperatureSensor":
					accessoryServices.push(this.getTemperatureSensorService(configService));
					break;
				case "Thermostat":
					accessoryServices.push(this.getThermostatService(configService));
					break;
				case "Window":
					accessoryServices.push(this.getWindowService(configService));
					break;
				case "WindowCovering":
					accessoryServices.push(this.getWindowCoveringService(configService));
					break;
				default:
					this.log("[ERROR] unknown 'type' property of ["+configService.type+"] for service ["+ configService.name + "] in config.json. KNX platform section fault ");
				    throw new Error("[ERROR] unknown 'type' property of ["+configService.type+"] for service '"+ configService.name + "' in config.json. KNX platform section fault ");
				}
			}
			// start listening for events on the bus (if not started yet - will prevent itself)
			startMonitor({ host: this.knxd_ip, port: this.knxd_port });
			return accessoryServices;
		}
};
