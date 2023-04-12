/* Lock sensor
 *  Represents a lock in HomeKit without control function that represents the state based on a KNX binary input.
 *  The implementation is based on the ContactSensor.
 * @author felixpause
 */
/* jshint esversion: 6, strict: true, node: true */

'use strict';
/**
 * @type {HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('LockSensor');

/**
 * @class A custom handler for a lock sensor.
 * @extends HandlerPattern
 */
class LockSensor extends HandlerPattern {

	constructor(knxAPI) {
		super(knxAPI); // call the super constructor first. Always.
		this.timer = undefined;
	}

	/*******************************************************************************************************************
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 * 
	 */
	onKNXValueChange(field, oldValue, knxValue) {
		// value for HomeKit
		var newValue;
		log('INFO: onKNXValueChange(' + field + ", "+ oldValue + ", "+ knxValue+ ")");
		if (field==="LockCurrentState") {
			if (this.myAPI.getLocalConstant("Reverse")) {
				newValue = 1-knxValue;
			} else {
				newValue = knxValue;
			}
            // To show the final state, target and current state must be the same.
			this.myAPI.setValue("LockTargetState", newValue);
			this.myAPI.setValue("LockCurrentState", newValue);
		} //if
	} // onBusValueChange
	
	/*******************************************************************************************************************
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 * 
	 */
	onHKValueChange(field, oldValue, newValue) {
		log('INFO: onHKValueChange(' + field + ", "+ oldValue + ", "+ newValue + ")");
        if (field==="LockTargetState") {
            // We cannot lock, so we simply switch back to the current value after short delay
            if (this.timer) {
				log("Aborting previous timer!");
				clearTimeout(this.timer);
			} 
			this.timer = setTimeout(function(field) {
				log('Timer fired!');
				this.myAPI.setValue(field, this.myAPI.getValue("LockCurrentState"));
				this.timer = undefined;
			}.bind(this), 500, field); // 500ms to give HomeKit a chance to switch forth and back
			
        }
	} // onHKValueChange
} // class	
module.exports=	LockSensor;

	
/* **********************************************************************************************************************
 * The config for that should look like: LocalConstants is now used in this sample 
 * Reverse is used as a constant in this custom handler
 * 
 * 
"Services": [{
                    "ServiceType": "LockMechanism",
                    "ServiceName": "Lock",
                    "Handler": "LockSensor",
                    "Characteristics": [
                        {
                            "Type": "LockCurrentState",
                            "Listen": [
                                "5/3/5"
                            ]
                        },
                        {
                            "Type": "LockTargetState"
                        }
                    ],
                    "KNXReadRequests": [
                        "5/3/5"
                    ],
                    "LocalConstants": {
                        "Reverse": true
                    }
                }]
 * 
 * 
 * 
 */
