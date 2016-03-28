'use strict'


var GroupAddress = require('./groupaddress').GroupAddress;
var DPTTypes = require('./groupaddress').DPTTypes;

//var KNXAccess = require('./knxaccess');
var iterate = require('./iterate');

var colorOn = "\x1b[30;47m";
var colorOff = "\x1b[0m";

var globs;

//TODO: this should be replaced by some kind of register process: load all mappers from a directory and register their key-words
var SingleKNXMapper = require('./mappers/mapper-single').SingleKNXMapper;
var SingleHKMapper = require('./mappers/mapper-single').SingleHKMapper;

var MultipleKNXMapper = require('./mappers/mapper-multiple').MultipleKNXMapper;
var MultipleHKMapper = require('./mappers/mapper-multiple').MultipleHKMapper;




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
	globs = globs;

	switch (this.config.Type) {
	case 'Mapper-Single':
		this.mapper = new SingleKNXMapper(chrKNX, config, globs);
		break;
	case 'Mapper-Multiple':
		this.mapper = new MultipleKNXMapper(chrKNX, config, globs);
		break;
	}
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
	globs = globs;
	globs.info("ToHKMapper.Constructor");
//iterate(config);

	switch (this.config.Type) {
	case 'Mapper-Single':
		this.mapper = new SingleHKMapper(chrKNX, config, globs);
		break;
	case 'Mapper-Multiple':
		this.mapper = new MultipleHKMapper(chrKNX, config, globs);
		break;
	}
}


module.exports.ToKNXMapper = ToKNXMapper;
module.exports.ToHKMapper = ToHKMapper;
