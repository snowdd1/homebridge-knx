/* Sample module - Just for logging  
 */ 
 
/* jshint esversion: 6, strict: true, node: true */
 
'use strict';
/**
 * @type {HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('OneWaySwitch');

/**
 * @class A custom handler that switches back a homekit switch to off after one second   
 * @extends HandlerPattern
 */
class OneWaySwitch extends HandlerPattern {

	constructor(knxAPI) {
		super(knxAPI); // call the super constructor first. Always.
		this.timer = undefined;
	}
	
	/****
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 * 
	 */
	onKNXValueChange(field, oldValue, knxValue) {
		// value for HomeKit
		var newValue;
		log('INFO: onKNXValueChange(' + field + ", "+ oldValue + ", "+ knxValue+ ") -- ignored.");
	} // onBusValueChange
	
	/****
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 * 
	 */
	onHKValueChange(field, oldValue, newValue) {
		// 
		log('INFO: onHKValueChange(' + field + ", "+ oldValue + ", "+ newValue + ")");
		
		if (field === 'On') {
			if (this.timer) {
				log("Aborting old timer!");
				clearTimeout(this.timer);
			} else if (newValue===1){
				log("Sending value "+ this.myAPI.getLocalConstant('SwitchSends') || 0 + " to the bus");
				this.myAPI.knxWrite('On', this.myAPI.getLocalConstant('SwitchSends') || 0); 
				this.timer = setTimeout(function(field) {
					// in 1000ms set the value back to off:
					log('Timer reached!');
					this.myAPI.setValue(field, 0);
					this.timer = undefined;
				}.bind(this), 300, field); // 300ms to give HomeKit a chance to switch forth and back
			}
		}
	} // onHKValueChange
} // class	
module.exports=	OneWaySwitch;

/* **********************************************************************************************************************
 * The config for that should look like this 
 * Reverse keyword is not allowed for custom handlers
 * 
 * SwitchSends can be set to 1 or 0, so it only sends a 1 or a zero to the bus when the switch is triggered.
 * The switch in HomeKit resets itself to off after 0,3 seconds
 * 
"Services": [{
	"ServiceType": "Lightbulb",
	"Handler": "OneWaySwitch",
	"ServiceName": "Centrally off",
	"Characteristics": [{
		"Type": "On",
		"Set": "1/2/1"
	}],
    "LocalConstants": {
        "SwitchSends": 0
    }
}]
 * 
 * 
 * 
 */

	
