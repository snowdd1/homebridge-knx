/* Contact sensor
 * 
 */
'use strict';
/**
 * @type {HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('ContactSensor');

/**
 * @class A custom handler for the GIRA 216100 "Jalousie Aktor" (rolling shutter/blinds actuator)
 * @extends HandlerPattern
 */
class ContactSensor extends HandlerPattern {

	/*******************************************************************************************************************
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 * 
	 */
	onKNXValueChange(field, oldValue, knxValue) {
		// value for HomeKit
		var newValue;
		log('INFO: onKNXValueChange(' + field + ", "+ oldValue + ", "+ knxValue+ ")");
		if (field==="ContactSensorState") {
			log("Reverse? " + this.myAPI.getLocalConstant("Reverse"));
			if (this.myAPI.getLocalConstant("Reverse")) {
				log("Reversing!");
				newValue = 1-knxValue;
			} else {
				log("non reverse");
				newValue = knxValue;
			}
			this.myAPI.setValue("ContactSensorState", newValue);
		} //if
	} // onBusValueChange
	
	/*******************************************************************************************************************
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 * 
	 */
	onHKValueChange(field, oldValue, newValue) {
		log('STRANGE: onHKValueChange(' + field + ", "+ oldValue + ", "+ newValue + ")");
	} // onHKValueChange
} // class	
module.exports=	ContactSensor;

	
/* **********************************************************************************************************************
 * The config for that should look like: LocalConstants is now used in this sample 
 * Reverse keyword is not allowed for custom handlers
 * 
 * 
"Services": [{
	"ServiceType": "WindowCovering",
	"Handler": "GiraJalousieActuator",
	"ServiceName": "Rolling Shutter",
	"Characteristics": [{
		"Type": "TargetPosition",
		"Set": "1/2/3",
		"Listen": "1/2/4",
		"DPT": "DPT5.001"
	},
	{
		"Type": "CurrentPosition",
		"Set": "1/3/1",
		"Listen": "1/3/2"
	},
	{
		"Type": "PositionState"
	}],
	"KNXObjects": [{
		"Type": "ShutterMove",
		"Listen": "1/2/1",
		"DPT": "DPT1"
	}],
	"KNX-ReadRequests": ["1/2/4",
	"1/3/2"],
	"LocalConstants": {"TimeOutSecs": 60}
}]
 * 
 * 
 * 
 */
