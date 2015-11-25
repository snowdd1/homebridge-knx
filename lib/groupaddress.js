/**
 * Model for KNX group addresses
 * 
 * @constructor
 * @param {string} gaNumber - The group address in triple layer notation, such as 31/7/255
 * @param {string} name - name of the group address for later reference
 * @param {string} dptype - the KNX telegram specification
 * @param {boolean} readable - are READ requests for that address allowed? defaults to true.
 * @param {boolean} writable - are WRITE commands for that address allowed? defaults to true.
 * @param {string} comment - optional comment of the group address for later reference
 */
function groupAddress(gaNumber, name, dptype, readable, writable, comment) {
	this.address = gaNumber;
	this.name = name;
	
	//todo: This check requires a string, not an object from the list
	this.dptype = (dptype in DPTTypes) ? DPTTypes[dptype] : DPTTypes.DPT1;
	this.readable = (readable === false) ? false : true;
	this.writable = (writable === false) ? false : true;
	this.comment = comment;
}

/**
 * Validates a string as group Address and returns an explanatory text if wrong, and "OK" if ok.
 * 
 * @param groupAddress - Address as String, such as "31/7/255"
 * @returns {String}
 */
groupAddress.prototype.validateAddressText = function(groupAddress) {
	if (!typeof groupAddress === 'string') {
		return 'ERR Invalid parameter';
	}
	// assume triple notation (0..31) (0..7) (0..255)
	var addressArray = groupAddress
			.match(/^(([0-9]|[1-9][0-9]{1,2})\/([0-9]|[1-9][0-9]{1,2})\/([0-9]|[1-9][0-9]{1,2}))/)
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
 * @param groupAddress
 * @returns {Boolean}
 */
groupAddress.prototype.validateAddress = function(groupAddress) {
	if (this.validateAddressText(groupAddress) === 'OK') {
		return true;
	}
	return false;
}

validDPTTypes = {
	DPT1 : "DPT1",
	DPT5 : "DPT5",
	DPT9 : "DPT9",
	DPT1_002 : "DPT1.002",
	DPT1_011 : "DPT1.011",
	DPT5_001 : "DPT5.001"
}

DPTTypes = {
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
	DPT1_002 : {
		type : "DPT1.002",
		char : "boolean",
		name : "Boolean"
	},
	DPT1_011 : {
		type : "DPT1.011",
		char : "boolean",
		name : "Status"
	},
	DPT5_001 : {
		type : "DPT5.001",
		char : "percentage",
		name : "percentage"
	}
}

module.export = {
	groupAddress : groupAddress,
	DPTTypes : DPTTypes,
	validDPTTypes: validDPTTypes
}
