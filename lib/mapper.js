/**
 * Characteristics can have
 * 
 * a type name, such as "On", or "Brightness"
 * 
 * something to write values to (if changed in Homekit)
 * 
 * something to react to if values change on the bus
 * 
 * 
 */

var GroupAddress = require('./groupaddress').GroupAddress;
var DPTTypes = require('./groupaddress').DPTTypes;
var gaComplete = require('./groupaddress').complete;
var KNXAccess = require('./knxaccess');

var colorOn = "\x1b[30;47m";
var colorOff = "\x1b[0m";
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
 * *
 * 
 * @param {object} globs - KNX global variables
 */
function ToKNXMapper(type, config, characteristic, globs) {
	this.type = type;
	this.config = config;
	this.globs = globs;

	if (this.config.Type === 'Mapper-Single') {
		this.mapper = new _SingleKNXMapper(config, globs);
	}
}

/**
 * @param {object} config - configuration structure
 * @param {object} globs - KNX global variables
 */
function _SingleKNXMapper(config, characteristic, globs) {

	this.globs = globs;
	this.address = config.Data;
	this.groupAddress = gaComplete(this.address, globs, characteristic)
	// now we have a reliable groupAddress Object.
	// bind it to the set event.
	characteristic.on("set", this.update.bind(this));
}

_SingleKNXMapper.prototype.update = function(value, callback, context) {
	// is the bus to be sent to the bus, or originating there?
	if (context === 'fromKNXBus') { // from the bus, ignore!
		if (callback) {
			callback();
		}
		return;
	}
	writeValue(value, this.groupAddress, callback);
	// done
}

function ToHKMapper(type, config, characteristic, globs) {
	this.type = type;
	this.config = config;
	this.globs = globs;

	if (this.config.Type === 'Mapper-Single') {
		this.mapper = new _SingleHKMapper(config, characteristic, globs);
	}
}

module.exports = {
	ToKNXMapper : ToKNXMapper
}

function writeValue(value, groupAddress, callback) {
	/* depending on the DPT of the target address we haver to convert the value. As with the possible mappings the dpt could be different for mapping results, we do it at runtime, and do not do the decision at init time.
	*/
	var setGA = groupAddress.address;
	var setReverse = groupAddress.reversed;
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
		this.log(colorOn + "[ERROR] unknown type passed: [" + valueType+"]"+ colorOff);
		throw new Error("[ERROR] unknown type passed");
		}
	} 
	
}


//function to avoid out of bounds for fixed-value characteristics
//for float types this is already managed by hap-nodeJS itself
//returns a value that can be safely used in 
var safeSet = function(char, value) {
	console.log("DEBUG: entered safeSet");
	//iterate(char);
	if (char.props.format==="uint8") {
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
