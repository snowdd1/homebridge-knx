/* Sample module - Simple handler for a rolling garage door actuator  
 * 
 * My simple garage door actuator only knows to binary addresses: close door and open door
 * Door travel time is fixed
 * Actuator does not give feedback on obstacle emergency stops, neither light barrier triggered nor motor overload
 * 
 * 
 * In HomeKit it looks like this
 Service.GarageDoorOpener = function(displayName, subtype) {
  Service.call(this, displayName, '00000041-0000-1000-8000-0026BB765291', subtype);

  // Required Characteristics
  this.addCharacteristic(Characteristic.CurrentDoorState);
  this.addCharacteristic(Characteristic.TargetDoorState);
  this.addCharacteristic(Characteristic.ObstructionDetected);

  // Optional Characteristics
  this.addOptionalCharacteristic(Characteristic.LockCurrentState);
  this.addOptionalCharacteristic(Characteristic.LockTargetState);
  this.addOptionalCharacteristic(Characteristic.Name);
};

		// The value property of CurrentDoorState must be one of the following:
		// Characteristic.CurrentDoorState.OPEN = 0;
		// Characteristic.CurrentDoorState.CLOSED = 1;
		// Characteristic.CurrentDoorState.OPENING = 2;
		// Characteristic.CurrentDoorState.CLOSING = 3;
		// Characteristic.CurrentDoorState.STOPPED = 4;

		// The value property of TargetDoorState must be one of the following:
		// Characteristic.TargetDoorState.OPEN = 0;
		// Characteristic.TargetDoorState.CLOSED = 1;

		// The value property of OccupancyDetected must be one of the following:
		// Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED = 0;
		// Characteristic.OccupancyDetected.OCCUPANCY_DETECTED = 1;

 * 
 * We only have:
 * CloseDoor with Set and Listen
 * OpenDoor with Set and Listen
 * TravelTime as LocalConstant
 * 
 */
'use strict';
/**
 * @type {HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('SimpleGarageDoor');

/**
 * @class A custom handler for a very simple garage door controller
 * @param {customServiceAPI} knxAPI
 * @extends HandlerPattern
 */
class SimpleGarageDoor extends HandlerPattern {

	/*******************************************************************************************************************
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 * 
	 */
	onKNXValueChange(field, oldValue, knxValue) {
		// value for HomeKit
		var newValue;
		if (!this.timeout) {
			this.timeout = this.myAPI.getLocalConstant("TravelTime");
			if (!this.timeout) {
				this.timeout = 30*1000; // default to 30 secs if not given in config
			} else {
				this.timeout=this.timeout*1000; //convert to millisecs
			}
		}
		log('INFO: onKNXValueChange(' + field + ", "+ oldValue + ", "+ knxValue+ ")");
		if (field==="OpenDoor") {
			// OpenDoor is DPT1 binary, sending a 1 for start of opening motion
			// set the Target to OPEN first, otherwise HK shows wrong motions
			this.myAPI.setValue("TargetDoorState", 0);
			// Set the state to opening: // Characteristic.CurrentDoorState.OPENING = 2;
			this.myAPI.setValue("CurrentDoorState",2);
			// start a timer for <TravelTime> secs until CurrentDoorState is set to OPEN
			if (this.timer){
				// if there was a timer running, abort it and restart - is imprecise but best guess
				clearTimeout(this.timer);
				this.timer = undefined;
			}			
			this.timer = setTimeout(function() {
				log('Open Motion Timer reached! Assume motion has stopped and OPEN state has been reached.');
				this.myAPI.setValue("CurrentDoorState", 0);
				this.timer = undefined;
			}.bind(this), this.timeout );
		} else if (field==="CloseDoor") {
			// CloseDoor is DPT1 binary, sending a 1 for start of closing motion

			// set the Target to CLOSED first, otherwise HK shows wrong motions
			this.myAPI.setValue("TargetDoorState", 1);
			// Set the state to opening: // Characteristic.CurrentDoorState.CLOSING = 3;
			this.myAPI.setValue("CurrentDoorState",3);
			// start a timer for <TravelTime> secs until CurrentDoorState is set to OPEN
			if (this.timer){
				// if there was a timer running, abort it and restart - is imprecise but best guess
				clearTimeout(this.timer);
				this.timer = undefined;
			}			
			this.timer = setTimeout(function() {
				log('Close Motion Timer reached! Assume motion has stopped and CLOSED state has been reached.');
				this.myAPI.setValue("CurrentDoorState", 1);
				this.timer = undefined;
			}.bind(this), this.timeout );
		}


	} // onBusValueChange
	
	/*******************************************************************************************************************
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 * 
	 */
	onHKValueChange(field, oldValue, newValue) {
		// homekit will only send a TargetPosition value, so we do not care about (non-) potential others
		log('INFO: onHKValueChange(' + field + ", "+ oldValue + ", "+ newValue+ ")");
		if (!this.timeout) {
			this.timeout = this.myAPI.getLocalConstant("TravelTime");
			if (!this.timeout) {
				this.timeout = 30*1000; // default to 30 secs if not given in config
			} else {
				this.timeout=this.timeout*1000; //convert to millisecs
			}
		}
		if (field==="TargetDoorState") {
			if (newValue===0 ) {
				// homekit wanting to OPEN the door
				// Set the state to opening: // Characteristic.CurrentDoorState.OPENING = 2;
				this.myAPI.setValue("CurrentDoorState",2);
				// start a timer for <TravelTime> secs until CurrentDoorState is set to OPEN
				if (this.timer){
					// if there was a timer running, abort it and restart - is imprecise but best guess
					clearTimeout(this.timer);
					this.timer = undefined;
				}			
				// start the motion via KNX Object:
				this.myAPI.knxWrite("OpenDoor",1,"DPT1");
				this.timer = setTimeout(function() {
					log('Open Motion Timer reached! Assume motion has stopped and OPEN state has been reached.');
					this.myAPI.setValue("CurrentDoorState", 0);
					this.timer = undefined;
				}.bind(this), this.timeout );
			} else if (newValue===1 ) {
				// homekit wanting to CLOSE the door
				// Set the state to opening: // Characteristic.CurrentDoorState.CLOSING = 3;
				this.myAPI.setValue("CurrentDoorState",3);
				// start a timer for <TravelTime> secs until CurrentDoorState is set to OPEN
				if (this.timer){
					// if there was a timer running, abort it and restart - is imprecise but best guess
					clearTimeout(this.timer);
					this.timer = undefined;
				}			
				// start the motion via KNX Object:
				this.myAPI.knxWrite("CloseDoor",1,"DPT1");
				this.timer = setTimeout(function() {
					log('Open Motion Timer reached! Assume motion has stopped and CLOSED state has been reached.');
					this.myAPI.setValue("CurrentDoorState", 1);
					this.timer = undefined;
				}.bind(this), this.timeout );
			}
			
			
		}
		
	} // onHKValueChange
} // class	
module.exports=	SimpleGarageDoor;

	
/* **********************************************************************************************************************
 * The config for that should look like: LocalConstants is not used in this sample
 * Reverse keyword is not allowed for custom handlers
 * 
 * Blank characteristics TargetDoorState and CurrentDoorState required for handler to catch them
 * 
"Services": [{
	"ServiceType": "GarageDoorOpener",
	"Handler": "SimpleGarageDoor",
	"ServiceName": "large parking lot",
    "Characteristics": [
        {
            "Type": "TargetDoorState"
        },
        {
            "Type": "CurrentDoorState"
        }
    ],
	"KNXObjects": [{
		"Type": "OpenDoor",
		"Set": ["1/2/1"],
		"Listen": ["1/2/1"],
		"DPT": "DPT1"
	},
	{
		"Type": "CloseDoor",
		"Set": ["1/2/2"],
		"Listen": ["1/2/2"],
		"DPT": "DPT1"
	}
	],
	"LocalConstants": {"TravelTime": 17}
}]
 * 
 * 
 * 
 */
