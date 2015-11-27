'use strict'


var GroupAddress = require('./groupaddress').GroupAddress;
var DPTTypes = require('./groupaddress').DPTTypes;

var KNXAccess = require('./knxaccess');
var iterate = require('./iterate');

iterate(KNXAccess);

var colorOn = "\x1b[30;47m";
var colorOff = "\x1b[0m";

var globals;


/** Loads a groupAddress from the config. If that is not possible, derive it from the homeKit characteristic it is supposed to be bound to.
 * @param {string} ga - Group Address
 * @param {globs} globs - global homebridge-knx object
 * @param {characteristic} characteristic - the characteristic to be bound, for automatic type derivation.
 * @returns {GroupAddress}
 */
var gaComplete = function(address, globs, Characteristic){
	// look for the address in the global group address list
	if (!globs.config.GroupAddresses[address]) {
		globs.log("The Group Address " + address + " is not yet defined. Type testing is not supported. Assuming match to HomeKit type");
		if (Characteristic.props.format === globs.Characteristic.Formats.BOOL) {
			// Boolean
			return new GroupAddress(address, 'automatically generated', DPTTypes.DPT1, true, true, true, 'INITIAL')
		} else if (Characteristic.props.format === globs.Characteristic.Formats.INT || Characteristic.props.format === globs.Characteristic.Formats.UINT8) {
			if (Characteristic.props.unit === globs.Characteristic.Units.PERCENTAGE) {
				// percentage
				return new GroupAddress(address, 'automatically generated', DPTTypes['DPT5.001'], true, true, true, 'INITIAL');
			} else {
				// integer (assuming 1 byte)
				return new GroupAddress(address, 'automatically generated', DPTTypes.DPT5, true, true, true, 'INITIAL');
			}

		} else if (Characteristic.props.format === globs.Characteristic.Formats.FLOAT) {
			return new GroupAddress(address, 'automatically generated', DPTTypes.DPT9, true, true, true, 'INITIAL')
		}
	} else {
		return new GroupAddress(address, globs.config.GroupAddresses[address].name, globs.config.GroupAddresses[address].dptype,
				globs.config.GroupAddresses[address].readable, globs.config.GroupAddresses[address].readOnStartup,
				globs.config.GroupAddresses[address].writable, globs.config.GroupAddresses[address].comment);

	}
}


/***********************************************************************************************************************
 * The Mapper Idea
 * 
 * Bisher registrieren die Characteristica die Adressen selbst beim Busmonitor. Mit dem Mapper dazwischen müsste der
 * Mapper über die Wertänderungen auf dem Bus informiert werden, dieser berechnet dann einen HomeKit-Wert und dieser
 * wird an das Characteristikum zurückgemeldet.
 * 
 * Jeder Mapper kann auf HK-Seite nur einen Wert ausspucken, der erste Treffer erzeugt den Wert und gibt ihn zurück
 */

/**
 * @param {CharcteristicKNX] chrKNX - the characteristic to be bound to that mapper
 * @param {Object} config - the configuration object for that mapper, must contain 'Type' and 'Data' fields
 * @param {object} globs - KNX global variables
 */
function ToKNXMapper(chrKNX, config, globs) {
	this.config = config;
	globs.info("ToKNXMapper.Constructor");
	globals = globs;

	if (this.config.Type === 'Mapper-Single') {
		this.mapper = new _SingleKNXMapper(chrKNX, config, globs);
	}
}

/**
 * @param {CharcteristicKNX] chrKNX - the characteristic to be bound to that mapper
 * @param {Object} config - the configuration object for that mapper, must contain 'Type' and 'Data' fields
 * @param {object} globs - KNX global variables
 */
function _SingleKNXMapper(chrKNX, config,  globs) {
	globals = globs;
	this.address = config.Data;
	this.groupAddress = gaComplete(this.address, globs, chrKNX.getHomekitCharacteristic());
	// now we have a reliable groupAddress Object.
	// bind it to the set event.
	chrKNX.getHomekitCharacteristic().on("set", this.update.bind(this));
}

_SingleKNXMapper.prototype.update = function(value, callback, context) {
	// is the bus to be sent to the bus, or originating there?
	if (context === 'fromKNXBus') { // from the bus, ignore!
		if (callback) {
			callback();
		}
		return;
	}
	writeValueKNX(value, this.groupAddress, callback);
	// done
}

/**
 * Establishes a link between changes on the KNX bus and HomeKit. Depending on the passed mapper Type (config.Type) a
 * different mapper will be created.
 * 
 * @param {CharcteristicKNX] chrKNX - the characteristic to be bound to that mapper
 * @param {Object} config - the configuration object for that mapper, must contain 'Type' and 'Data' fields
 * @param {object} globs - KNX global variables
 * 
 */
function ToHKMapper(chrKNX,  config, globs) {
	this.config = config;
	globals = globs;
	globs.info("ToHKMapper.Constructor");
iterate(config);
	if (this.config.Type === 'Mapper-Single') {
		this.mapper = new _SingleHKMapper(chrKNX, config, globs);
	}
}
/**
 * The Single Mapper binds one KNX address events to one home kit characteristic.
 */
function _SingleHKMapper(chrKNX, config, globs){
	globs.info("_SingleHKMapper.Constructor");
	globals = globs;
	this.address = config.Data;
	this.groupAddress = gaComplete(this.address, globs, chrKNX.getHomekitCharacteristic())
	this.chrKNX = chrKNX;
	// now we have a reliable groupAddress Object.
	// establish a callback in the listener list of the group monitor
	globs.knxmonitor.registerGA(this.groupAddress.address, function(val, src, dest, type){
		// here the value change event from the BUS has happened, and we want it to write it to Homekit (characteristic.setValue())
		globs.info("in callback within _SingleHKMapper()");
		// in a single mapper we trust the configured DPT in the group address, if it was not derived from Homekit type
		if (this.groupAddress.comment!=='INITIAL') {
			type = this.groupAddress.dptype.type;
		} 
		writeValueHK(val, this.chrKNX, type, this.groupAddress.reversed)
	}.bind(this));
}

module.exports = {
	ToKNXMapper : ToKNXMapper
}

/**
 * Writes a to the bus, using the safe KNXAccess.setXXX methods according to groupAddress.dptype.type
 * 
 * @param {number} value - the new value
 * @param {GroupAddress} groupAddress Object
 * @param {function} callback - the callback to be called upon completion
 */
function writeValueKNX(value, groupAddress, callback) {
	/* depending on the DPT of the target address we haver to convert the value. As with the possible mappings the dpt could be different for mapping results, we do it at runtime, and do not do the decision at init time.
	*/
	KNXAccess.setGlobs(globals);
	var setGA = groupAddress.address;
	var setReverse = groupAddress.reversed;
	
	iterate(groupAddress);
	
	switch (groupAddress.dptype.char) {
	case "boolean":
		KNXAccess.setBooleanState(value, callback,  setGA, setReverse); //NEW
		break;
	case "percentage":
		KNXAccess.setPercentage(value, callback,  setGA, setReverse);
		break;
	case "float":
		KNXAccess.setFloat(value, callback,  setGA);
		break;
	case "int":
		KNXAccess.setInt(value, callback,  setGA);
		break;
	default: {
		globals.log(colorOn + "[ERROR] unknown type passed: [" + valueType+"]"+ colorOff);
		throw new Error("[ERROR] unknown type passed");
		}
	} 
	
}

/**
 * Writes a value to a HomeKit characteristic, depending on the compatibility of the characteristic and the value
 * 
 * @param {number} val - the value to be written to HK
 * @param {CharacteristicKNX} chrKNX
 * @param {String} type - the DPT of the value received, if received directly from the bus. null or undefined if mapped
 *        using values.
 */
function writeValueHK(val, chrKNX, type, reverse) {
	// switch depending on the value type to be written
	var characteristic = chrKNX.getHomeKitCharacteristic();
	
	switch (characteristic.props.format) {
	/*
	 * // Known HomeKit formats
Characteristic.Formats = {
  BOOL: 'bool',
  INT: 'int',
  FLOAT: 'float',
  STRING: 'string',
  ARRAY: 'array', // unconfirmed
  DICTIONARY: 'dictionary', // unconfirmed
  UINT8: 'uint8',
  UINT16: 'uint16',
  UINT32: 'uint32',
  UINT64: 'uint64',
  DATA: 'data', // unconfirmed
  TLV8: 'tlv8'
}
	 */
	case globals.Characteristic.Formats.BOOL: 
		// boolean is good for any trueish expression from value
		characteristic.setValue(val ? (reverse ? 0:1) : (reverse ? 1:0), undefined, 'fromKNXBus');
		break;
	case globals.Characteristic.Formats.INT:
		// to an INT we can assume that the min and max values are set, or a list of allowed values is supplied
		globals.log('info', "["+ this.name +"]:[" + characteristic.displayName+ "]: Received value from bus:"+val+ " for " +dest+ " from "+src+" of type "+type+ " for " + characteristic.displayName);
		if (characteristic.props.minValue===undefined && characteristic.props.maxValue === undefined) {
			// no min or max defined, we use the safeSet() function to check for a list of allowed values
			characteristic.setValue(safeSet(characteristic, val), undefined, 'fromKNXBus');
		} else {
			
			// we have a defined range. If it's a percentage, we want to convert the bus value to the spectrum
			if (characteristic.props.unit=globals.Characteristic.Units.PERCENTAGE) {
				if (type === 'DPT5' || type === 'DPT5.001') {
					val = Math.round(( reverse ? (255-val):val)/255*100);
				}
				// if the sending types are different, assume decimal percentage value (100=100%)
			}
			if (val>=(characteristic.props.minValue || 0) && val<=(characteristic.props.maxValue || 255)) {
			// it's in range
			characteristic.setValue(val, undefined, 'fromKNXBus') 
			} else {
				globs.log('error', "["+ this.name +"]:[" + characteristic.displayName+ "]: Value %s out of bounds %s...%s ",val, (characteristic.props.minValue || 0), (characteristic.props.maxValue || 255));
			}
		};
		break;
	case globals.Characteristic.Formats.FLOAT:
		globals.log('info', "["+ this.name +"]:[" + characteristic.displayName+ "]: Received value from bus:"+val+ " for " +dest+ " from "+src+" of type "+type+ " for " + characteristic.displayName);
		
		// If it's a percentage, we want to convert the bus value to the spectrum
		if (characteristic.props.unit=globals.Characteristic.Units.PERCENTAGE) {
			if (type === 'DPT5' || type === 'DPT5.001') {
				val = Math.round(( reverse ? (255-val):val)/255*100);
			}
			// if the sending types are different, assume decimal percentage value (100=100%)
		}
		
		
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
			characteristic.setValue(hk_value, undefined, 'fromKNXBus'); 
		} else {
			this.log("["+ this.name +"]:[" + characteristic.displayName+ "]: Value %s out of bounds %s...%s ",hk_value, characteristic.props.minValue, characteristic.props.maxValue);
		}
		break;
	default:
		break;
	}
	
	
	
	
	
}

//function to avoid out of bounds for fixed-value characteristics
//for float types this is already managed by hap-nodeJS itself
//returns a value that can be safely used in 
var safeSet = function(char, value) {
	console.log("DEBUG: entered safeSet");
	//iterate(char);
	if (char.props.format==="uint8" || char.props.format==="int"  ) {
		console.log("DEBUG: format ok");
		// fixed-value formats use unsigned integer AFAIK
		if (!char.hasOwnProperty("validValues")) {
			console.log("DEBUG: establishing safe values");
			// we need to find those first
			// find the prototype
			var displayName = char.displayName;
			if (Characteristic.hasOwnProperty(displayName.replace(/ /g,''))) {
				var chartype = displayName.replace(/ /g,'');
				console.log("DEBUG: chartype " + chartype);
				for (var name in Characteristic[chartype]) {
					//console.log("DEBUG: chartype.name " + name);
					if (Characteristic[chartype].hasOwnProperty(name)){
						console.log("DEBUG: typeof chartype.name " + typeof Characteristic[chartype][name]);
						if (typeof Characteristic[chartype][name] === 'number' ) {
							// add it to the array
							if (char.hasOwnProperty("validValues")){
								char.validValues = char.validValues.concat(Characteristic[chartype][name]);
								console.log("DEBUG: following: length " + char.validValues.length);
							} else {
								char.validValues = [Characteristic[chartype][name]];
								console.log("DEBUG: 1st: length " + char.validValues.length);
							}
						}
					}
				}
			}
			console.log("DEBUG: " + char.displayName + " has now validValue of "+ char.validValues );
		}
		// compare value to allowed values
		if (char.hasOwnProperty("validValues")) {
			//do the check
			if (char.validValues.indexOf(value)<0) { 
				// didn't find
				console.log("DEBUG: " + char.displayName + " has validValue of "+ char.validValues );
				console.log("DEBUG: " + char.displayName + " ERROR illegal value "+ value );
				value =  char.validValues[0]; // default to first one
				console.log("DEBUG: " + char.displayName + " ERROR returned instead "+ value );
			}
		}
		
	} else {
		console.log("DEBUG: " + char.props.format + "!== uint8");
	}
	return value;
};

module.exports.ToKNXMapper = ToKNXMapper;
module.exports.ToHKMapper = ToHKMapper;
