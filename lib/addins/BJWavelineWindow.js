/* Sample module - Simple handler for rolling shutter actuator  
 * 
 */
/* jshint esversion: 6, strict: true, node: true */
'use strict';

/**
 * @type {HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('BJWavelineWindow');

/**
 * @class A custom handler for the "Busch Jaeger Waveline Aktor" (Window open, tilt or closed)
 * @extends HandlerPattern
 */
class BJWavelineWindow extends HandlerPattern {

	/*******************************************************************************************************************
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 * 
	 */
	onKNXValueChange(field, oldValue, knxValue) {
		// value for HomeKit
		var newValue;

		console.log('INFO: onKNXValueChange(' + field + ", "+ oldValue + ", "+ knxValue+ ")");

		newValue = knxValue * 100 / 255;
		if ((newValue > 0) && (newValue < 90)) newValue = 50;
		
/*	
		if (newValue > 0) {
			this.myAPI.setValue("PositionState", 1);
		} else {
			this.myAPI.setValue("PositionState", 0);
		}
*/
		this.myAPI.setValue("PositionState", 2);
			
		this.myAPI.setValue("TargetPosition",  newValue);
		this.myAPI.setValue("CurrentPosition", newValue); 

		this.lastKNXValue = newValue
	} // onBusValueChange
	
	/*******************************************************************************************************************
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 * 
	 */
	onHKValueChange(field, oldValue, newValue) {
		console.log('INFO: onHKValueChange(' + field + ", "+ oldValue + ", "+ newValue + ")");

                if (field==="TargetPosition") {
			console.log('INFO: WavelineWindow Target Position is not supported');
			this.myAPI.setValue("TargetPosition", this.myAPI.getValue("CurrentPosition"));
/*
			if (this.myAPI.getValue("CurrentPosition") > 0) {
				this.myAPI.setValue("PositionState", 1);
			} else {
				this.myAPI.setValue("PositionState", 0);
			}
*/
			this.myAPI.setValue("PositionState", 2);
		}
	} // onHKValueChange
} // class	
module.exports=	BJWavelineWindow;

	
/* **********************************************************************************************************************
 * The config for that should look like: LocalConstants is now used in this sample 
 * Reverse keyword is not allowed for custom handlers
 * 
"Services": [
{
    "ServiceType": "Window",
    "Handler": "BJWavelineWindow",
    "ServiceName": "Fenster Wohnzimmer",
    "Characteristics": [
        {
            "Type": "CurrentPosition",
            "Listen": [ "7/3/12" ],
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
        "7/3/12"
    ]
}
 * 
 * 
 */
