/* TriggerWithTimeout - Resets a switch after a given Timeout
 * 
 * This can be used for motion sensor that only send a "1" on motion, but never resets itself by sending a "0"
 * 
 */
/* jshint esversion: 6, strict: true, node: true */

'use strict';
/**
 * @type {HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('TriggerWithTimeout');

/**
 * @class A custom handler that switches back a homekit switch to off 
 *		e.g. use with Motiondetectors which only sends "1" to motion, but never resets itself
 * @extends HandlerPattern
 */
class TriggerWithTimeout extends HandlerPattern {

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

		log('INFO: TriggerWithTimeout - onKNXValueChange(' + field + ", "+ oldValue + ", "+ knxValue+ ")");

		if (this.myAPI.getLocalConstant("Reverse")) {
			newValue = 1-knxValue;
		} else {
			newValue = knxValue;
		}
		if (newValue > 1) newValue = 1;

		log('INFO: TriggerWithTimeout - setting value for ' + field + ' to: ' + newValue);
		this.myAPI.setValue(field, newValue);


		var timeoutsecs = this.myAPI.getLocalConstant("ResetTime") * 1000 || 60000;

		if (this.timer) {
			clearTimeout(this.timer); // Remove existing timer
		} 

		this.timer = setTimeout(function(field) {
			log('INFO: TriggerWithTimeout - resetting value for ' + field + ' to: ' + (1 - newValue));
			this.myAPI.setValue(field, 1 - newValue);
			this.timer = undefined;
		}.bind(this), timeoutsecs, field);

	} // onBusValueChange
	
	/****
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 * 
	 */
	onHKValueChange(field, oldValue, newValue) {
		// 
		log('INFO: TriggerWithTimeout - onHKValueChange(' + field + ", "+ oldValue + ", "+ newValue + ")");

	} // onHKValueChange
} // class	
module.exports=	TriggerWithTimeout;

/*

                {
                    "ServiceType": "MotionSensor",
                    "Handler": "TriggerWithTimeout",
                    "ServiceName": "Bewegungsmelder",
                    "Characteristics": [
                        {
                            "Type": "MotionDetected",
                            "Listen": [
                                "6/1/10"
                            ]
                        }
                    ],
                    "LocalConstants": {
                        "ResetTime": 90
                    }
                }

*/
	
