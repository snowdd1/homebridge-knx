'use strict';
var gaComplete = require('./../groupaddress').gaComplete;
var validateAddressText = require('./../groupaddress').validateAddressText;
var KNXAccess = require('./../knxaccess');
var writeValueKNX = KNXAccess.writeValueKNX;
var writeValueHK = KNXAccess.writeValueHK;

var iterate = require('./../iterate');

var globals;

/**
 * Maps a homeKit characteristic to an Array of Group Addresses without value mappings 
 * Attention please: ***** 
 * If you map multiple GA on a writing (Set) characteristic, all of them will be written to! Used for all On/Off types, all
 * percentages, etc., usually for listening to the bus only
 * 
 * @param {CharcteristicKNX] chrKNX - the characteristic to be bound to that mapper
 * @param {Object} config - the configuration object for that mapper, must contain 'Type' and 'Data[]' fields. Data[] is
 *        an array of group address strings.
 * @param {object} globs - KNX global variables
 */
function MultipleKNXMapper(chrKNX, config, globs) {
	globals = globs;
	this.addresslist = config.Data;
	this.groupAddressList = [];

	for (var int = 0; int < config.Data.length; int++) {
		var ga = config.Data[int];
		var res = validateAddressText(ga);
		globals.info(ga + ":" + res);
		if (res === 'OK') {
			this.groupAddressList.push(gaComplete(ga, globs, chrKNX.getHomekitCharacteristic()));
		}
	}

	// now we have a reliable groupAddress Object.
	// bind it to the set event.
	chrKNX.getHomekitCharacteristic().on("set", this.update.bind(this));
}
/**
 * The mapping logic called when a value change in HomeKit has occurred, and a KNX change has to be calculated
 * 
 * @param {number} value
 * @param {function} callback
 * @param {string} context
 */
MultipleKNXMapper.prototype.update = function(value, callback, context) {
	// is the bus to be sent to the bus, or originating there?
	if (context === 'fromKNXBus') { // from the bus, ignore!
		if (callback) {
			callback();
		}
		return;
	}
	for (var int2 = 0; int2 < this.groupAddressList.length; int2++) {
		writeValueKNX(value, this.groupAddressList[int2], callback);
	}

	// done
};

module.exports.MultipleKNXMapper = MultipleKNXMapper;

/**
 * The Multiple Mapper binds an Array of KNX address events to one home kit characteristic. Used for listening to
 * multiple addresses that can control the same device, such as 1/1/1 light x off, 0/0/1 all lights off, etc.
 * 
 * @param {CharcteristicKNX] chrKNX - the characteristic to be bound to that mapper
 * @param {Object} config - the configuration object for that mapper, must contain 'Type' and 'Data[]' fields
 * @param {object} globs - KNX global variables
 * @constructor
 */
function MultipleHKMapper(chrKNX, config, globs) {
	globs.info("MultipleHKMapper.Constructor");
	globals = globs;
	this.addresslist = [];
	this.groupAddressList = {};
	this.groupAddressList.size = 0;

	for (var int = 0; int < config.Data.length; int++) {
		var ga = config.Data[int];
		var res = validateAddressText(ga);
		globals.info(ga + ":" + res);
		if (res = 'OK') {
			this.groupAddressList[ga] = gaComplete(ga, globs, chrKNX.getHomekitCharacteristic());
			this.addresslist.push(ga);
		}
		this.groupAddressList.size = Object.keys(this.groupAddressList)-1; // do not count the size object itself
	}
	this.chrKNX = chrKNX;
	iterate(this.groupAddressList);
	// now we have a reliable groupAddress Object.
	// establish a callback in the listener list of the group monitor
	// register the array!
	globs.knxmonitor.registerGA(this.addresslist, this.update.bind(this));
}
/**
 * The mapping logic called when a value change on the bus has occurred, and the Homekit change has to be calculated
 * 
 * @param {number} val - the value read from the bus
 * @param {string} src - the physical address of the sender (ignored, just for info)
 * @param {string} dest - the group address data has been sent to
 * @param {string} type - the DPT read from the bus (no subtypes)
 */
MultipleHKMapper.prototype.update = function(val, src, dest, type) {
	// here the value change event from the BUS has happened, and we want it to write it to Homekit (characteristic.setValue())
	globals.info("in callback within MultipleHKMapper.update(): " + dest + " value received: " + val);
	// in a single mapper we trust the configured DPT in the group address, if it was not derived from Homekit type
	if (this.groupAddressList[dest].comment !== 'INITIAL') {
		type = this.groupAddressList[dest].dptype.type;
	}
	writeValueHK(val, this.chrKNX, type, this.groupAddressList[dest].reversed)
}

module.exports.MultipleHKMapper = MultipleHKMapper;
