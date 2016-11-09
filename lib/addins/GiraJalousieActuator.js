/* Sample module - Simple handler for rolling shutter actuator  
 * This sample shows how additional values can be taken into account.
 * 
 */
'use strict';
/**
 * @type {HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('GiraJalousieActuator');

/**
 * @class A custom handler for the GIRA 216100 "Jalousie Aktor" (rolling shutter/blinds actuator)
 * @extends HandlerPattern
 */
class GiraJalousieActuator extends HandlerPattern {

	/*******************************************************************************************************************
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 * 
	 */
	onKNXValueChange(field, oldValue, knxValue) {
		// value for HomeKit
		var newValue;
		log('INFO: onKNXValueChange(' + field + ", "+ oldValue + ", "+ knxValue+ ")");
		if (field==="TargetPosition") {
			// TargetPosition is DPT5.001 Percentage (0..255)
			// need to convert to (0..100) first
			// Homekit is using %-open, meaning 0% is closed/down
			
			newValue = 100 - knxValue*100/255;
			
			if (newValue>this.myAPI.getValue("CurrentPosition")) {
				// newValue is higher, shutter's moving up
				this.myAPI.setValue("PositionState", 1); //up
			} else if (newValue<this.myAPI.getValue("CurrentPosition")){
				// newValue is higher, shutter's moving down
				this.myAPI.setValue("PositionState", 0); //down
			}
			this.myAPI.setValue("TargetPosition", newValue);
			if (this.timer){
				// avoid resetting Target Position through a timer
				clearTimeout(this.timer);
				this.timer = undefined;
			}
			this.lastCommand = 'target';
		} else if (field==="CurrentPosition") {
			// Current Position is sent by the actuator if the Movement has stopped a new postion is reached
			
			// CurrentPosition is DPT5.001 Percentage (0..255)
			// need to convert to (0..100) first
			// Homekit is using %-open, meaning 0% is closed/down
			newValue = 100 - knxValue*100/255;
			
			this.myAPI.setValue("CurrentPosition", newValue); // inform homekit
			this.myAPI.setValue("PositionState", 2); //stopped

			if (this.lastCommand==='move') {
				// return to stopped immediately, and set the Target to Current
				this.myAPI.setValue("TargetPosition", this.myAPI.getValue("CurrentPosition"));
			} else {
				if (!this.timeout) {
					this.timeout = this.myAPI.getLocalConstant("TimeOutSecs")*1000 || 60000;
				}
				if (this.timer){
					clearTimeout(this.timer); // start a new one
				}
				this.timer = setTimeout(function() {
					log('Idle Timer reached! Assume motion stopped and target position was not used, so we set it to current position');
					this.myAPI.setValue("TargetPosition", this.myAPI.getValue("CurrentPosition"));
					this.timer = undefined;
				}.bind(this), this.timeout );
			}
		} else if (field==="ShutterMove") {
			// this isn't a characteristic, we need this extra object to catch switch use, too
			// The actuator is lowering the rolling shutters if a 1 is received, and 
			// raises on a 0
			this.lastCommand = 'move';
			switch (knxValue) {
			case 0:
				this.myAPI.setValue("TargetPosition", 100); // top position, so home shows "opening"
				this.myAPI.setValue("PositionState", 0); //up
				break;
			case 1:
				this.myAPI.setValue("TargetPosition", 0); // low position, so home shows "closing"
				this.myAPI.setValue("PositionState", 1); //down
				break;
			} // switch
		} //if
	} // onBusValueChange
	
	/*******************************************************************************************************************
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 * 
	 */
	onHKValueChange(field, oldValue, newValue) {
		// homekit will only send a TargetPosition value, so we do not care about (non-) potential others
		if (field==="TargetPosition") {
			log('INFO: onHKValueChange(' + field + ", "+ oldValue + ", "+ newValue + ")");
			// update the PositionState characteristic:		
			// get the last current Position
			var lastPos = this.myAPI.getValue("CurrentPosition");
			if (newValue>lastPos) {
				// newValue is higher, shutter's moving up
				this.myAPI.setValue("PositionState", 1); //up
			} else if (newValue<lastPos){
				// newValue is higher, shutter's moving down
				this.myAPI.setValue("PositionState", 0); //down
			}
			var knxValue = (255-newValue*255/100);
			log('INFO: onHKValueChange after calc ('  + knxValue+ ")");
			this.myAPI.knxWrite("TargetPosition", knxValue, "DPT5"); // send the new position to the KNX bus
		}
		
	} // onHKValueChange
} // class	
module.exports=	GiraJalousieActuator;

	
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
