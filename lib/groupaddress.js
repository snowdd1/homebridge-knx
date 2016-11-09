'use strict'
/**
 * Model for KNX group addresses
 * 
 * @constructor
 * @param {string} gaNumber - The group address in triple layer notation, such as 31/7/255
 * @param {string} name - name of the group address for later reference
 * @param {string} dptype - the KNX telegram specification
 * @param {boolean} readable - are READ requests for that address allowed? defaults to true.
 * @param {boolean} readOnStartup - are READ requests on homebridge startup for that address allowed? defaults to true.
 * @param {boolean} writable - are WRITE commands for that address allowed? defaults to true.
 * @param {string} comment - optional comment of the group address for later reference
 * @param {boolean} reversed - Indicates if Boolean or Percentage values should be counted down instead of up
 */
function GroupAddress(gaNumber, name, dptype, readable, readOnStartup, writable, comment, reversed) {
	this.address = gaNumber;
	this.name = name;

	//todo: This check requires a string, not an object from the list
	this.dptype = (dptype in DPTTypes) ? DPTTypes[dptype] : DPTTypes.DPT1;

	this.readable = (readable !== false);
	this.readOnStartup = (readOnStartup !== false);
	this.writable = (writable !== false);
	this.comment = comment;
	this.reversed = (reversed == true); // the evil twins are right here.
}

/**
 * Validates a string as group Address and returns an explanatory text if wrong, and "OK" if ok.
 * 
 * @param {String} groupAddress - Address as String, such as "31/7/255"
 * @returns {String}
 */
var validateAddressText = function(groupAddress) {
	if (!typeof groupAddress === 'string') {
		return 'ERR Invalid parameter';
	}
	// assume triple notation (0..31) (0..7) (0..255)
	var addressArray = groupAddress.match(/^(([0-9]|[1-9][0-9]{1,2})\/([0-9]|[1-9][0-9]{1,2})\/([0-9]|[1-9][0-9]{1,2}))/)
	if (!addressArray) {
		// no valid structure
		return 'ERR no valid group address structure (31/7/255)';
	}
	if (parseInt(addressArray[2]) > 31) {
		return 'ERR no valid group address structure (31/7/255): first triple exceeds 31';
	}
	if (parseInt(addressArray[3]) > 7) {
		return 'ERR no valid group address structure (31/7/255): second triple exceeds 7';
	}
	if (parseInt(addressArray[4]) > 255) {
		return 'ERR no valid group address structure (31/7/255): third triple exceeds 255';
	}
	return 'OK';
}

/**
 * Validates a string as group Address and returns a boolean result
 * 
 * @param {String} groupAddress
 * @returns {Boolean}
 */
 var validateAddress = function(groupAddress) {
	if (validateAddressText(groupAddress) === 'OK') {
		return true;
	}
	return false;
}


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

var validDPTTypes = {
	DPT1 : "DPT1",
	DPT5 : "DPT5",
	DPT9 : "DPT9",
	DPT1_002 : "DPT1.002",
	DPT1_011 : "DPT1.011",
	DPT5_001 : "DPT5.001"
};

var DPTTypes = {
	DPT1 : {
		type : "DPT1",
		char : "boolean",
		name : "generic 1 bit"
	},
	DPT5 : {
		type : "DPT5",
		char : "int",
		name : "generic 1 byte unsigned integer"
	},
	DPT9 : {
		type : "DPT9",
		char : "float",
		name : "generic 2 bytes float"
	},
	"DPT1.002" : {
		type : "DPT1.002",
		char : "boolean",
		name : "Boolean"
	},
	"DPT1.011" : {
		type : "DPT1.011",
		char : "boolean",
		name : "Status"
	},
	"DPT5.001" : {
		type : "DPT5.001",
		char : "percentage",
		name : "Percentage"
	}
};

module.exports = {
	GroupAddress : GroupAddress,
	DPTTypes : DPTTypes,
	validDPTTypes : validDPTTypes,
	gaComplete: gaComplete,
	validateAddressText: validateAddressText,
	validateAddress: validateAddress
};
