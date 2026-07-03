/* jshint esversion: 6, strict: true, node: true */
'use strict';
/**
 * Newer hap-nodejs versions (bundled with Homebridge 2.0+) no longer expose
 * Characteristic.Formats / .Perms / .Units as static properties. These values
 * are stable HAP protocol string constants, so we keep our own copy here
 * instead of depending on the Characteristic object exposing them.
 *
 * https://github.com/snowdd1/homebridge-knx/issues/218
 */
module.exports = {
	Formats: {
		BOOL: 'bool',
		UINT8: 'uint8',
		UINT16: 'uint16',
		UINT32: 'uint32',
		UINT64: 'uint64',
		INT: 'int',
		FLOAT: 'float',
		STRING: 'string',
		TLV8: 'tlv8',
		DATA: 'data',
		ARRAY: 'array',
		DICTIONARY: 'dictionary'
	},
	Perms: {
		READ: 'pr',
		WRITE: 'pw',
		NOTIFY: 'ev',
		HIDDEN: 'hd',
		ADDITIONAL_AUTHORIZATION: 'aa',
		WRITE_RESPONSE: 'wr',
		TIMED_WRITE: 'tw'
	},
	Units: {
		CELSIUS: 'celsius',
		FAHRENHEIT: 'fahrenheit',
		PERCENTAGE: 'percentage',
		ARC_DEGREE: 'arcdegrees',
		LUX: 'lux',
		SECONDS: 'seconds'
	}
};
