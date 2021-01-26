/* Doorbell - Emulate ProgrammableSwitchEvent using 3 inputs
 */ 
 
/* jshint esversion: 6, strict: true, node: true */
 
'use strict';
/**
 * @type {HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('ProgrammableSwitchEvent');

/**
 * @class A custom handler that switches back a homekit switch to off after one second   
 * @extends HandlerPattern
 */
class Doorbell extends HandlerPattern {

	constructor(knxAPI) {
		super(knxAPI); // call the super constructor first. Always.
	}

	/****
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 * 
	 */
	onKNXValueChange(field, oldValue, knxValue) {
		// value for HomeKit
		var newValue;
		log('INFO: onKNXValueChange(' + field + ", " + oldValue + ", " + knxValue + ")");

		if (knxValue === true) {
			if (field === 'SinglePress') {
				this.myAPI.setValue('ProgrammableSwitchEvent', 0);
				this.myAPI.knxWrite('SinglePress', false, 'DPT1');
			} else if (field === 'DoublePress') {
				this.myAPI.setValue('ProgrammableSwitchEvent', 1);
				this.myAPI.knxWrite('DoublePress', false, 'DPT1');
			} else if (field === 'LongPress') {
				this.myAPI.setValue('ProgrammableSwitchEvent', 2);
				this.myAPI.knxWrite('LongPress', false, 'DPT1');
			}
		}
	} // onBusValueChange

	/****
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 * 
	 */
	onHKValueChange(field, oldValue, newValue) {
		// 
		log('INFO: onHKValueChange(' + field + ", " + oldValue + ", " + newValue + ") -- ignored.");
	} // onHKValueChange
} // class	
module.exports = Doorbell;

/* **********************************************************************************************************************
 * The config for that should look like this 
 * Reverse keyword is not allowed for custom handlers
 * 
"Services": [{
	"ServiceType": "Doorbell",
	"Handler": "Doorbell",
	"ServiceName": "Doorbell",
	"Characteristics": [{
		"Type": "ProgrammableSwitchEvent"
	}],
	"KNXObjects": [{
		"Type": "SinglePress",
		"Listen": "0/0/25",
		"DPT": "DPT1"
	},
	{
		"Type": "DoublePress",
		"Listen": "0/0/26",
		"DPT": "DPT1"
	},
	{
		"Type": "LongPress",
		"Listen": "0/0/27",
		"DPT": "DPT1"
	}
	]
}]
 * 
 * 
 * 
 */

	
