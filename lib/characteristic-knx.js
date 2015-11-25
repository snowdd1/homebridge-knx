/**
 * Everything about characteristics
 */

var Mappers = require('./mapper');

/**
 * @constructor
 * @param {Object} config - configuration object structure for that characteristic
 * @param {Object} service - The service this characteristic is about to belong to.
 * @param {Object} globs - global style communication object
 * @param {function} log - logging function
 */
function CharacteristicKNX(config, service, glob) {
	this.config = config;
	this.glob = globs;
	this.log= globs.log;
	this.service=service;
	this.availableCharacteristics = globs.hap.Characteristic;
	if (!this.config.type) {
		throw {name: "CONFIG ERROR", message:"Characteristic with no type"};
	} 
	if (!this.config.type==="custom") {
		// normal characteristic
		// check type
		if (!this.availableCharacteristics[this.config.type]) {
			// failed no such type
			throw {name: "CONFIG ERROR", message:"Characteristic with unknown type " + this.config.type};
		}
		this.chr = this.service.getCharacteristic(this.availableCharacteristics[this.config.type]);
		if (!this.chr) {
			// it's not default and it's not a defined optional
			this.log("Warning: the characteristic " + this.config.type + " may break compliance to homekit.");
			this.chr = this.service.addCharacteristic(this.availableCharacteristics[this.config.type]);
		}
	} else {
		// custom characteristic, more data required, such as UUID and name and properties.
		throw {name: "CONFIG ERROR", message:"Custom characteristic not yet supported"};
	}
	
	// if the characteristic is writable (that is, to the KNX bus) AND we have a Set section in the config...
	if (chr.props.permsindexOf(this.globs.hap.Characteristic.Perms.WRITE) > -1) {
		if (this.config.Set) {
			// now create the mapper
			// TODO: mappers
			this.mapper = new Mappers.ToKNXMapper(this.config.Set.Type, this.config.Set, this.chr, this.globs)
		}
	}
	// if it is readable AND we have a listen section in the config
	if (chr.props.permsindexOf(this.globs.hap.Characteristic.Perms.READ) > -1) {
		if (this.config.Listen) {
			// now create the mapper
			// TODO: mappers
			this.mapper = new Mappers.ToHKMapper(this.config.Listen.Type, this.config.Listen, this.chr, this.globs)
		}
	}
}

module.exports = CharacteristicKNX;