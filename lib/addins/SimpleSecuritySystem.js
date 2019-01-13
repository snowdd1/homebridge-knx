
/* ------------------------------------------------------------

/* Service "Security System"


Service.SecuritySystem = function(displayName, subtype) {
  Service.call(this, displayName, '0000007E-0000-1000-8000-0026BB765291', subtype);

  // Required Characteristics
  this.addCharacteristic(Characteristic.SecuritySystemCurrentState);
  this.addCharacteristic(Characteristic.SecuritySystemTargetState);

  // Optional Characteristics
  this.addOptionalCharacteristic(Characteristic.StatusFault);
  this.addOptionalCharacteristic(Characteristic.StatusTampered);
  this.addOptionalCharacteristic(Characteristic.SecuritySystemAlarmType);
  this.addOptionalCharacteristic(Characteristic.Name);
};

inherits(Service.SecuritySystem, Service);

Service.SecuritySystem.UUID = '0000007E-0000-1000-8000-0026BB765291';
*/


/* Sample module - Simple handler for simulating a security service with 2+ KNX Motionsensors and 1 switch
 * the switch can also be a GA to enable/disable the motionsensors
 * This sample shows how additional values can be taken into account.
 * 
 */
/* jshint esversion: 6, strict: true, node: true */

'use strict';
/**
 * @type {HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('SimpleSecuritySystem');

/**
 * @class A custom handler for a simple SecuritySystem with 1 Trigger an n MotionSensors
 * @extends HandlerPattern
 */
class SimpleSecuritySystem extends HandlerPattern {

	

	/*******************************************************************************************************************
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 * 
	 */
	onKNXValueChange(field, oldValue, knxValue) {
		// value for HomeKit
		var newValue;
		let that=this;
		log('INFO: onKNXValueChange(' + field + ", "+ oldValue + ", "+ knxValue+ ")");
		if (field==="SwitchOnOff") {
			
			this.disarmedState = this.myAPI.getLocalConstant("DisarmedState") || 0;
			
			newValue = (knxValue == 0) ? 1 : this.disarmedState;
			
			this.myAPI.setValue("SecuritySystemTargetState", newValue);
			this.myAPI.setValue("SecuritySystemCurrentState", newValue);
			this.lastKNXValue = newValue;
		} 
		else if (field.startsWith("MotionSensor")) {
			switch (knxValue) {
			case 0: // MotionSensor sends no movenment detected, reset current state to initial state
				this.myAPI.setValue("SecuritySystemCurrentState", this.lastState); 
				break;
			case 1: // One MotionSensor has detected a movement, so inform homekit
				this.myAPI.setValue("SecuritySystemCurrentState", 4);
				
				var resetStateAfter = this.myAPI.getLocalConstant("ResetStateAfter");
				
				if (resetStateAfter == 0) {
					break;
				}
				if (that.deadzone) {
					clearTimeout(that.deadzone); // remove existing timer
				}
				//Reset the Current State to previous
				that.deadzone = setTimeout(function() {
					that.deadzone = undefined;
					that.myAPI.setValue("SecuritySystemCurrentState", this.lastState);
				}, resetStateAfter); // 1000ms dead zone for SecuritySystemCurrentState updates from the bus
				break;
			} // switch
		} //if
	} // onBusValueChange
	
	/*******************************************************************************************************************
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 * 
	 */
	onHKValueChange(field, oldValue, newValue) {
		// homekit will only send a SecuritySystemTargetState value, so we do not care about (non-) potential others		
		if (field==="SecuritySystemTargetState") {
			log('INFO: onHKValueChange(' + field + ", "+ oldValue + ", "+ newValue + ")");
			this.lastKNXValue = newValue;
			this.disarmedState = this.myAPI.getLocalConstant("DisarmedState") || 0;
			
			var knxValue = (newValue == this.disarmedState) ? 1:0;
			this.myAPI.knxWrite("SwitchOnOff", knxValue, "DPT1"); // send the new position to the KNX bus
		}
		
	} // onHKValueChange
} // class	
module.exports=	SimpleSecuritySystem;





/* --------------------------------------------------------------
/*

"Services": [{
	"ServiceType": "SecuritySystem",
	"Handler": "SimpleSecuritySystem",
	"ServiceName": "Sicherheitssystem",
	"Characteristics": [{
		"Type": "SecuritySystemCurrentState",
	},
	{
		"Type": "SecuritySystemTargetState",
	}],
	"KNXObjects": [{
		"Type": "SwitchOnOff",
		"Listen": "6/0/10",
		"Set": "6/0/10",
		"DPT": "DPT1"
	},{
		"Type": "Motionsensor1",
		"Listen": "6/0/0",
		"DPT": "DPT1"
	},{
		"Type": "Motionsensor2",
		"Listen": "6/0/1",
		"DPT": "DPT1"
	}],
	"KNX-ReadRequests": ["6/0/10",
	"6/0/0","6/0/1"
	],
	"LocalConstants": {
            "DisarmedState": 0,
			"ResetStateAfter":1000
        }
}]


*/





