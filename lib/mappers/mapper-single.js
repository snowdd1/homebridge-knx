'use strict';
var gaComplete = require('./../groupaddress').gaComplete; 
var validateAddressText = require('./../groupaddress').validateAddressText;
var KNXAccess = require('./../knxaccess');
var writeValueKNX = KNXAccess.writeValueKNX;
var writeValueHK = KNXAccess.writeValueHK;
var globals;

/** Maps a Single Group Address to a homeKit characteristic without value mappings
 * Used for all On/Off types, all percentages, etc.
 * @param {CharcteristicKNX] chrKNX - the characteristic to be bound to that mapper
 * @param {Object} config - the configuration object for that mapper, must contain 'Type' and 'Data' fields
 * @param {object} globs - KNX global variables
 * @constructor
 */
function SingleKNXMapper(chrKNX, config,  globs) {
	globals = globs;
	this.address = config.Data;
	this.groupAddress = gaComplete(this.address, globs, chrKNX.getHomekitCharacteristic());
	// now we have a reliable groupAddress Object.
	// bind it to the set event.
	chrKNX.getHomekitCharacteristic().on("set", this.update.bind(this));
}
/**
 * The mapping logic called when a value change in HomeKit has occurred, and a KNX change has to be calculated
 * @param {number} value
 * @param {function} callback
 * @param {string} context
 */
SingleKNXMapper.prototype.update = function(value, callback, context) {
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


module.exports.SingleKNXMapper = SingleKNXMapper;


/**
 * The Single Mapper binds one KNX address events to one home kit characteristic.
 * @param {CharcteristicKNX] chrKNX - the characteristic to be bound to that mapper
 * @param {Object} config - the configuration object for that mapper, must contain 'Type' and 'Data' fields
 * @param {object} globs - KNX global variables
 * @constructor
 */
 
function SingleHKMapper(chrKNX, config, globs){
	globs.info("SingleHKMapper.Constructor");
	globals = globs;
	this.address = config.Data;
	this.groupAddress = gaComplete(this.address, globs, chrKNX.getHomekitCharacteristic())
	this.chrKNX = chrKNX;
	// now we have a reliable groupAddress Object.
	// establish a callback in the listener list of the group monitor
	globs.knxmonitor.registerGA(this.groupAddress.address, this.update.bind(this));
}

/**
 * The mapping logic called when a value change on the bus has occurred, and the Homekit change has to be calculated
 * @param {number} val - the value read from the bus
 * @param {string} src - the physical address of the sender (ignored, just for info)
 * @param {string} dest - the group address data has been sent to
 * @param {string} type - the DPT read from the bus (no subtypes)
 */
SingleHKMapper.prototype.update = function(val, src, dest, type){
	// here the value change event from the BUS has happened, and we want it to write it to Homekit (characteristic.setValue())
	globals.info("in callback within SingleHKMapper.update()");
	// in a single mapper we trust the configured DPT in the group address, if it was not derived from Homekit type
	if (this.groupAddress.comment!=='INITIAL') {
		type = this.groupAddress.dptype.type;
	} 
	writeValueHK(val, this.chrKNX, type, this.groupAddress.reversed)
}

module.exports.SingleHKMapper = SingleHKMapper;