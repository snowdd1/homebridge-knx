/* TriggerWithResetTarget - Reset the TargetPosition to the previous value after timeout.
 *
 * This is needed e.g. for non-automated doors that do nothing if you change their status in homekit.
 * 
 */
/* jshint esversion: 6, strict: true, node: true */
'use strict';

/**
 * @type {HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('TriggerWithResetTarget');

/**
 * @class A custom handler to use e.g. for "Servicetype Door" on non-automated doors, so that "open door" 
 *			     from HomeKit does not screw up the status)
 * @extends HandlerPattern
 */
class TriggerWithResetTarget extends HandlerPattern {

	constructor(knxAPI) {
		super(knxAPI); // call the super constructor first. Always.
		this.timer = undefined;
	}
	

	/*******************************************************************************************************************
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 * 
	 */
	onKNXValueChange(field, oldValue, knxValue) {
		var newValue;

		log('INFO: TriggerWithResetTarget - onKNXValueChange(' + field + ", "+ oldValue + ", "+ knxValue+ ")");

		if (knxValue > 0) {
			var newValue = this.myAPI.getLocalConstant("onKNXHigh") || 1;
		} else {
			var newValue = this.myAPI.getLocalConstant("onKNXLow")  || 0;
		}

		this.myAPI.setValue(field,  newValue);
		var targetfield = field.replace("Current", "Target");
		this.myAPI.setValue(targetfield,  newValue);

	} // onBusValueChange
	
	/*******************************************************************************************************************
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 * 
	 */
	onHKValueChange(field, oldValue, newValue) {
		log('INFO: TriggerWithResetTarget - onHKValueChange(' + field + ", "+ oldValue + ", "+ newValue + ")");

		if (this.timer) {
			clearTimeout(this.timer); // Remove existing timer
		} 

		if (oldValue === null) oldValue = this.myAPI.getLocalConstant("onKNXLow")  || 0;

		this.timer = setTimeout(function(field) {
			log('INFO: TriggerWithResetTarget - resetting value for ' + field + ' to: ' + oldValue);
			this.myAPI.setValue(field, oldValue);
			this.timer = undefined;
		}.bind(this), 1000, field);

	} // onHKValueChange
} // class	
module.exports=	TriggerWithResetTarget;

	
/* **********************************************************************************************************************


"Services": [
                {
                    "ServiceType": "Door",
                    "Handler": "TriggerWithResetTarget",
                    "ServiceName": "Eingangstür",
                    "Characteristics": [
                        {
                            "Type": "CurrentPosition",
                            "Listen": [
                                "7/0/14"
                            ],
                            "DPT": "DPT5.001"
                        },
                        {
                            "Type": "TargetPosition"
                        },
                        {
                            "Type": "PositionState"
                        }
                    ],
                    "KNXReadRequests": [
                        "7/0/14"
                    ],
                    "LocalConstants": {
                        "onKNXHigh": 100
                    }
                },
    ]
 * 
 * 
 */
