/** 
 * Simple handler for MDT rolling shutter actuators
 * @author Martijn Dierckx
 */
/* jshint esversion: 6, strict: true, node: true */

'use strict';
/**
 * @type {HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('MDTJalousieActuator');

/**
 * @class A custom handler for the MDT "Jalousie Aktor" (rolling shutter/blinds actuator)
 * @extends HandlerPattern
 */
class MDTJalousieActuator extends HandlerPattern {

	/*******************************************************************************************************************
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 * 
	 */
	onKNXValueChange(field, oldValue, knxValue) {
		// value for HomeKit
		var newValue;
		
		log("INFO: onKNXValueChange(" + field + ", "+ oldValue + ", "+ knxValue+ ")");

		switch(field) {

			case "TargetPosition":
				// TargetPosition is DPT5.001 Percentage (0..255)
				// need to convert to (0..100) first
				// Homekit is using %-open, meaning 0% is closed/down
				
				newValue = 100 - knxValue*100/255;
				this.myAPI.setValue("TargetPosition", newValue);

				break;

			case "CurrentPosition":
				// Current Position is sent by the actuator if the Movement has stopped a new postion is reached
			
				// CurrentPosition is DPT5.001 Percentage (0..255)
				// need to convert to (0..100) first
				// Homekit is using %-open, meaning 0% is closed/down

				newValue = 100 - knxValue*100/255;
				this.myAPI.setValue("TargetPosition", newValue);
				this.myAPI.setValue("CurrentPosition", newValue);

				break;

			case "ShutterMoveUp":
				newValue = knxValue == 1 ? 1 : 2;
				this.myAPI.setValue("PositionState", newValue);

				break;

			case "ShutterMoveDown":
				newValue = knxValue == 1 ? 0 : 2;
				this.myAPI.setValue("PositionState", newValue);

				break;

		}

	}
	
	/*******************************************************************************************************************
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 * 
	 */
	onHKValueChange(field, oldValue, newValue) {
		// homekit will only send a TargetPosition value, so we do not care about (non-) potential others
		let that = this;

		if (field === "TargetPosition") {
			
			log("INFO: onHKValueChange(" + field + ", "+ oldValue + ", "+ newValue + ")");

			var knxValue = 255 - newValue*255/100;
			log("INFO: onHKValueChange after calc (" + knxValue+ ")");
			this.myAPI.knxWrite("TargetPosition", knxValue, "DPT5");
		}
		
	} // onHKValueChange
} // class
module.exports=	MDTJalousieActuator;


/* **********************************************************************************************************************
 * The config for that should look like: LocalConstants is now used in this sample 
 * Reverse keyword is not allowed for custom handlers
 * 
 * 
"Services": [{
	"ServiceType": "WindowCovering",
	"Handler": "MDTJalousieActuator",
	"ServiceName": "Rolling Shutter",
	"Characteristics": [{
		"Type": "TargetPosition",
		"Set": "2/2/4",
		"Listen": "2/2/4",
		"DPT": "DPT5.001"q
	},
	{
		"Type": "CurrentPosition",
		"Listen": "2/3/4"
	},
	{
		"Type": "PositionState"
	}],
	"KNXObjects": [{
		"Type": "ShutterMoveUp",
		"Listen": "2/5/4",
		"DPT": "DPT1"
	},
	{
		"Type": "ShutterMoveDown",
		"Listen": "2/6/4",
		"DPT": "DPT1"
	}],
	"KNX-ReadRequests": ["2/3/4"]
}]
 * 
 * 
 * 
 */