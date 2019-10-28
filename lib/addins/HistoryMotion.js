/* HistoryMotion - Resets a switch after a given Timeout
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
var log = require('debug')('HistoryMotion');
var moment = require('moment');

/**
 * @class A custom handler that switches back a homekit switch to off 
 *		e.g. use with Motiondetectors which only sends "1" to motion, but never resets itself
 * @extends HandlerPattern
 */
class HistoryMotion extends HandlerPattern {

	constructor(knxAPI) {
		super(knxAPI); // call the super constructor first. Always.
		this.timer = undefined;
		this.timeout = undefined;

	}
	
	/****
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 * 
	 */
	onKNXValueChange(field, oldValue, knxValue) {
		// value for HomeKit
		var newValue;

		log('INFO: HistoryMotion - onKNXValueChange(' + field + ", "+ oldValue + ", "+ knxValue+ ")");

		if (this.myAPI.getLocalConstant("Reverse")) {
			newValue = 1-knxValue;
		} else {
			newValue = knxValue;
		}

		// if Timeout is unset - initialize it
		// We support timeout only is ResetTime is set in the config - other devices need to reset themself by sending a "0"
		if (! this.timeout) {
			if (this.myAPI.getLocalConstant("ResetTime")) {
				this.timeout = this.myAPI.getLocalConstant("ResetTime");
				this.myAPI.setValue("eveDuration", this.timeout);
 			} else {
				this.timeout = 0;
			}
		}


		// This only accepts a bool value - in case a percentage is send, set it to true
		if (newValue > 1) newValue = 1;

		this.myAPI.setValue(field, newValue);


		// If new trigger is send, update the "LastActivated" time stamp
		if (newValue == 1) {
  			var lastActivation = moment().unix() - this.myAPI.serviceKNX.platformAccessory.loggingService.getInitialTime();
  			this.myAPI.setValue("eveLastActivation", lastActivation);
		}


		// Start timeout trigger to reset the motion sensor value - some are so stupid to never reset itself
		if (this.timeout > 0 && newValue == 1) {
			log('INFO: HistoryMotion - Timeout is set - starting timer for ' + this.timeout + ' seconds');
			var timeoutsecs = this.timeout * 1000 || 60000;

			if (this.timer) {
				clearTimeout(this.timer); // Remove existing timer
			} 

			this.timer = setTimeout(function(field) {
				log('INFO: HistoryMotion - resetting value for ' + field + ' to: ' + (1 - newValue));
				this.myAPI.setValue(field, 1 - newValue);
				this.timer = undefined;
			}.bind(this), timeoutsecs, field);
		}

	} // onBusValueChange
	
	/****
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 * 
	 */
	onHKValueChange(field, oldValue, newValue) {

		log('INFO: HistoryMotion - onHKValueChange(' + field + ", "+ oldValue + ", "+ newValue + ")");

		// Only if timeout is set before, let eve change it via the settings (INFO: HistoryMotion - onHKValueChange(eveDuration, 600, 180)
		if (field == 'eveDuration') {
			if (this.timeout > 0) {
				this.timeout = newValue;
				console.log('INFO: HistoryMotion - Updating timout to ' + this.timeout);
			}	
		} 

	} // onHKValueChange
} // class	
module.exports=	HistoryMotion;

/*

        {
            "DeviceName": "Demo Bewegung",
            "Services": [
                {
                    "ServiceType": "eveMotionSensor",
                    "Handler": "HistoryMotion",
                    "ServiceName": "Demo Bewegung",
                    "Characteristics": [
                        {
                            "Type": "MotionDetected",
                            "Listen": [
                                "6/1/10",
                                "6/1/20"
                            ]
                        },
                        {
                            "Type": "eveSensitivity"
                        },
                        {
                            "Type": "eveDuration"
                        },
                        {
                            "Type": "eveLastActivation"
                        }
                    ],
                    "LocalConstants": {
                        "ResetTime": 300
                    }
                }
            ],
            "HistoryType": "motion"
        },

*/
	
