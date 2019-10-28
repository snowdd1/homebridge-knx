/* ValveControl
 * 
 * Handler with timer support to run sprinklers / watering systems
 * 
 */
/* jshint esversion: 6, strict: true, node: true */

'use strict';
/**
 * @type {HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('ValveControl');
var moment = require('moment');

/**
 * @class A custom handler that switches back a homekit switch to off 
 *		e.g. use with Motiondetectors which only sends "1" to motion, but never resets itself
 * @extends HandlerPattern
 */
class ValveControl extends HandlerPattern {

	constructor(knxAPI) {
		super(knxAPI); // call the super constructor first. Always.
		this.timer = undefined;
		this.timeout = undefined;

		this.TimerDuration = undefined;
		this.activatedFromHK = false;
	}
	
	/****
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 * 
	 */
	onKNXValueChange(field, oldValue, knxValue) {
		var newValue;
		newValue = knxValue;

		console.log('INFO: ValveControl - onKNXValueChange(' + field + ", "+ oldValue + ", "+ knxValue+ ")");


		if (field==='IsConfigured') {
			this.myAPI.setValue(field, knxValue);
		}
		if (field==='ProgramMode') {
			this.myAPI.setValue(field, knxValue);
		}


		if (field==="Active") {
			this.myAPI.setValue("Active", knxValue);
			this.myAPI.setValue("InUse", knxValue);

			if (knxValue == 0) {
				if (this.timer) {
					clearTimeout(this.timer); // Remove existing timer
				}
				this.myAPI.setValue("RemainingDuration", 0);
			}
		} // if active


		// If turned on, check if we need a timer
		if (knxValue > 0) {
			if (this.activatedFromHK || ! this.IgnoreTimerOnKNX) {
				this.activatedFromHK = false;
				var timeoutsecs = this.myAPI.getValue("SetDuration") * 1000;

				this.myAPI.setValue("RemainingDuration", this.myAPI.getValue("SetDuration"));

				console.log('INFO: ValveControl - Starting Timer for: ' + this.myAPI.getValue("SetDuration") + ' seconds');

				if (this.timer) {
					clearTimeout(this.timer); // Remove existing timer
				} 

				this.timer = setTimeout(function(field) {
					console.log('INFO: ValveControl - Timer expired - resetting value');
					this.myAPI.setValue("Active", 1 - knxValue);
					this.myAPI.setValue("InUse",  1 - knxValue);
					this.myAPI.knxWrite("Active", 1 - knxValue, "DPT1");

					this.timer = undefined;
				}.bind(this), timeoutsecs, field);
			}
		}

	} // onBusValueChange
	
	/****
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 * 
	 */
	onHKValueChange(field, oldValue, newValue) {

		console.log('INFO: ValveControl - onHKValueChange(' + field + ", "+ oldValue + ", "+ newValue + ")");

		// Update the internal timer value
		if (field==="SetDuration") {
			this.TimerDuration = newValue;
			console.log('INFO: ValveControl - Setting new Timer duration to: ' + this.TimerDuration);
		}

		if (field==="Active") {
			this.myAPI.knxWrite("Active", newValue, "DPT1"); // send the new knxValue to the KNX bus
			if (newValue == 1) this.activatedFromHK = true;
		} // if

		if (field==='IsConfigured') {
			this.myAPI.knxWrite(field, newValue);
		}
	} // onHKValueChange


        onServiceInit() {

		console.log('INFO: ValveControl - Running Init Handler');

		this.ValveType = this.myAPI.getLocalConstant("ValveType") || 0;
		this.IgnoreTimerOnKNX = this.myAPI.getLocalConstant("IgnoreTimerOnKNX") || true;
		this.DefaultTimer = this.myAPI.getLocalConstant("DefaultTimer") || 0;

		console.log('INFO: ValveControl - Setting value Type:  ' + this.ValveType);
		console.log('INFO: ValveControl - Setting value Timer: ' + this.IgnoreTimerOnKNX);
		console.log('INFO: ValveControl - Setting value Time:  ' + this.DefaultTimer);

		this.myAPI.setValue("ValveType", this.ValveType);
		this.myAPI.setValue("SetDuration", this.DefaultTimer);
		this.TimerDuration = this.DefaultTimer;

        } // onHKValueChange


} // class	


module.exports=	ValveControl;

/*

	Handler with timer support to run sprinklers / watering systems

	DefaultTimer:		The default number of seconds as init value
	ValveType:		The HK specific ValveType (1: Sprenger)
	IgnoreTimerOnKNX:	If set to true, we will not start the timer if the "on" came over the KNX Bus


        {
            "DeviceName": "Bewässerung Garten",
            "Services": [
                {
                    "ServiceType": "Valve",
                    "Handler": "ValveControl",
                    "ServiceName": "Bewässerung Garten",
                    "Characteristics": [
                        {
                            "Type": "Active",
                            "Set": [
                                "1/3/30"
                            ],
                            "Listen": [
                                "1/3/30"
                            ]
                        },
                        {
                            "Type": "InUse"
                        },
                        {
                            "Type": "ValveType"
                        },
                        {
                            "Type": "SetDuration"
                        },
                        {
                            "Type": "RemainingDuration"
                        }
                    ],
                    "LocalConstants": {
                        "DefaultTimer": 300,
                        "ValveType": 1,
                        "IgnoreTimerOnKNX": true
                    }
                }
            ]
        },


*/
	
