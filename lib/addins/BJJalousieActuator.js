/* Sample module - Simple handler for rolling shutter actuator  
 * This sample shows how additional values can be taken into account.
 * 
 */
/* jshint esversion: 6, strict: true, node: true */

'use strict';
/**
 * @type {HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('BJJalousieActuator');

/*
 * @class A custom handler for the Busch Jaeger Jalousie Aktor (rolling shutter/blinds actuator)
 * @extends HandlerPattern
 */
class BJJalousieActuator extends HandlerPattern {

	/*******************************************************************************************************************
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 * 
	 */
	onKNXValueChange(field, oldValue, knxValue) {
		// value for HomeKit
		let that=this;

		var newValue;
		console.log('INFO: BJJalousieActor - onKNXValueChange(' + field + ", "+ oldValue + ", "+ knxValue+ ")");
		if (field==="TargetPosition") {
                        var reverse = this.myAPI.getLocalConstant("Reverse") || false;

			if (reverse) {
				if (knxValue == 0) {
					newValue = 0;
				} else {
					newValue = 100;
				}
console.log('INFO: BJJalousieActor - in Reverse: ' + knxValue + '  - newValue: ' + newValue);

			} else {
				if (knxValue == 1) {
					newValue = 0;
				} else {
					newValue = 100;
				}
console.log('INFO: BJJalousieActor - in NonReverse: ' + knxValue + '  - newValue: ' + newValue);
			}

			if (oldValue != newValue) {
				this.myAPI.setValue("TargetPosition", newValue);
				if (newValue>=oldValue) {
					// newValue is higher, shutter's moving up
					console.log('INFO: Position State 1 - up');
					this.myAPI.setValue("PositionState", 1); //up
				} else {
					// newValue is lower, shutter's moving down
					console.log('INFO: Position State 0 - down');
					this.myAPI.setValue("PositionState", 0); //down
				}
			}

			this.lastCommand = 'moving';

			var timeoutsecs = this.myAPI.getLocalConstant("TravelTime") * 1000 || 60000;

                        if (that.deadzone) {
                                clearTimeout(that.deadzone); // remove existing timer
                        }
                        that.deadzone = setTimeout(function() {
                                that.deadzone = undefined;
				that.myAPI.setValue("CurrentPosition", newValue);

				that.lastCommand = 'stopped';

                        }, timeoutsecs); // Timout wait before updaing the target position

		} else if (field==="TargetPosition") {

			// If Stop is triggered, tell HK

			console.log('INFO: Position State 2 - stopped');
			this.myAPI.setValue("PositionState", 2); // Stopped

			this.lastCommand = 'stopped';

		}

/*			
		if (field==="TargetPosition") {
			
			// If deadzone is still set, we ignore the update to avoid jitter in the iOS app 
			if (!this.deadzone) {
				
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
			}
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
					console.log('Idle Timer reached! Assume motion stopped and target position was not used, so we set it to current position');
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
*/
	} // onBusValueChange
	
	/*******************************************************************************************************************
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 * 
	 */
	onHKValueChange(field, oldValue, newValue) {
		// homekit will only send a TargetPosition value, so we do not care about (non-) potential others
		let that=this;
		console.log('INFO: BJJalousieActor - onHKValueChange(' + field + ", "+ oldValue + ", "+ newValue + ")");

console.log('INFO: BJJalousieActor - IsMoving: ' + this.moving);

		if (field==="TargetPosition") {
			// update the PositionState characteristic:		
			// get the last current Position
			//var lastPos = this.myAPI.getValue("CurrentPosition");
			var lastPos = oldValue;
			var newPos;

			if (oldValue == null) {
				if (newValue == 0) { 
					newPos = 0;
					this.myAPI.setValue("PositionState", 0);
				} else {
					newPos = 100; 
					this.myAPI.setValue("PositionState", 1); 
				}
console.log('INFO: In oldValue == null - set newpos: ' + newPos);

			} else {
				if (newValue>=lastPos) {
					// newValue is higher, shutter's moving up
					console.log('INFO: Position State 1 - up');
					this.myAPI.setValue("PositionState", 1); //up
					newPos = 100;
				} else if (newValue<lastPos){
					// newValue is lower, shutter's moving down
					console.log('INFO: Position State 0 - down');
					this.myAPI.setValue("PositionState", 0); //down
					newPos = 0;
				}
			}

                        var reverse = this.myAPI.getLocalConstant("Reverse") || false;
			var knxValue = Math.round(newValue / 100);
			if (! reverse) knxValue = 1 - knxValue;

			console.log('INFO: onHKValueChange after calc ('  + knxValue+ ")");
			this.myAPI.knxWrite("TargetPosition", knxValue, "DPT1"); // send the new position to the KNX bus

			var timeoutsecs = this.myAPI.getLocalConstant("TimeOutSecs")*1000 || 60000;

                        if (that.deadzone) {
                                clearTimeout(that.deadzone); // remove existing timer
                        }
                        that.deadzone = setTimeout(function() {
                                that.deadzone = undefined;
				that.myAPI.setValue("CurrentPosition", newPos);
				that.myAPI.setValue("TargetPosition", newPos);
that.moving = false;
                        }, timeoutsecs); // Timout wait before updaing the target position

this.moving = true;

		}
		
	} // onHKValueChange
} // class	
module.exports=	BJJalousieActuator;

	
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
	"LocalConstants": {"TimeOutSecs": 60}, {"Reverse": true}
}]
 * 
 * 
 * 
 */
