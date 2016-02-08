/**
 * Everything about characteristics
 */

var Mappers = require('./mapper');
var iterate = require('./iterate');

/**
 * @constructor
 * @param {Object} service - The service this characteristic is about to belong to.
 * @param {Object} config - configuration object structure for that characteristic
 * @param {Object} globs - global style communication object
 */
function CharacteristicKNX(service, config, globs) {
	this.config = config;
	this.globs = globs;
	this.log = globs.log;
	globs.info("CharacteristicKNX.Constructor");
	this.service = service;
	this.availableCharacteristics = globs.Characteristic;
	if (!this.config.Type) {
		throw (new Error("Characteristic with no type ")).message="CONFIG ERROR";
	}
	iterate(this.config);
	
	if (this.config.Type !== "custom") {
		// normal characteristic
		// check type
		if (!this.availableCharacteristics[this.config.Type]) {
			// failed no such type
			throw (new Error("Characteristic with unknown type " + this.config.Type)).name="CONFIG ERROR";
		}
		// For elements restored by homebridge plugin-2 version it is required to get the exact characteristic (are unique so no hassle)
		// AFAIK: each service can have each characteristic exactly once
		this.chr = this.service.getHomeKitService().getCharacteristic(this.availableCharacteristics[this.config.Type]);
		if (!this.chr) {
			// it's not default, restored and it's not a defined optional
			this.log("Warning: the characteristic " + this.config.Type + " may break compliance to homekit.");
			this.chr = this.service.getHomeKitService().addCharacteristic(this.availableCharacteristics[this.config.Type]);
		}
	} else {
		// custom characteristic, more data required, such as UUID and name and properties.
		throw {
			name : "CONFIG ERROR",
			message : "Custom characteristic not yet supported"
		};
	}

	// if the characteristic is writable (that is, to the KNX bus) AND we have a Set section in the config...
	if (this.chr.props.perms.indexOf(this.globs.Characteristic.Perms.WRITE) > -1) {
		if (this.config.Set) {
			// now create the mapper
			globs.info("Set: adding ToKNXMapper");
			this.mapper = new Mappers.ToKNXMapper(this, this.config.Set, this.globs)
		}
	}
	// if it is readable AND we have a listen section in the config
	if (this.chr.props.perms.indexOf(this.globs.Characteristic.Perms.READ) > -1) {
		if (this.config.Listen) {
			// now create the mapper
			globs.info("Listen: adding ToHKMapper");
			this.mapper = new Mappers.ToHKMapper(this, this.config.Listen, this.globs)
		}
	}
}

/**
 * getHomekitCharacteristic extracts the Homekit-Characteristic object from the KNX wrapper object.
 * @returns {Characteristic}
 */
CharacteristicKNX.prototype.getHomekitCharacteristic = function() {
	return this.chr;
}

module.exports = CharacteristicKNX;
