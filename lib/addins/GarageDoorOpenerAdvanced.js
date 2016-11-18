/* module - to handle a Hörmann Garage Door Opener that is connected to a
 * KNX Aktor (staircaseFunc mode is configurable) that switch for 1 second to ON to send
 * the engine of the door a move command"
 * The Hörmann engine will switch from Up/Stop/Down in cycle if more than
 * 1 command is received during movement
 * Also 2 contact sensor needed: KNXDoorClosed and KNXDoorOpen
 * the contact sensors will need to have a 0 value when closed
 *
 * Version 2 can also simulate the 2nd contact sensor
 * simulate 2nd contact sensor (KNXDoorOpen) by software/timer
 * if you want to simulate it set it to true if not to false
 * And set doorRunTime to the time the door needs from closed to open

 * handler coded by misc2000; M. Schmitt
 * Version 2.2
 */
'use strict';
/** * @type {HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('GiaseGarageDoorOpener');


/**
 * @class A custom handler for a Hörmann Garage Door Opener conected to a KNX Actor
 * @extends HandlerPattern
 */
class GiaseGarageDoorOpener extends HandlerPattern {

	constructor(knxAPI) {
		super(knxAPI); // call the super constructor first. Always.

		//TODO: set to LocalConstants
		
		// simulate 2nd contact sensor (KNXDoorOpen) by software/timer
		// if you want to simulate it set it to true if not to false
		// And set doorRunTime to the time the door needs from closed to open
		this.simulateDoorOpenContact = this.myAPI.getLocalConstant("simulateDoorOpenContact");
		this.doorRunTime = this.myAPI.getLocalConstant("doorRunTime"); // in mil.seconds
		this.timer1 = undefined;

		// set this to true if the impuls needs to switched on and off 
		// instead of on only in case of staircaseFuncfunktion
		this.staircaseFunc = this.myAPI.getLocalConstant("staircaseFunc");

		// Define the length for a pulse. This needs to be regardless staircase-function on or off
		this.pulseLength = this.myAPI.getLocalConstant("pulseLength");
	}

	/****
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 *
	 */
	onKNXValueChange(field, oldValue, knxValue) {
		// value for HomeKit
		var newValue;
		var myCurrentDoorState=this.myAPI.getValue("CurrentDoorState");

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

		console.log('INFO: on KNX Value Change(' + field + ", old="+ oldValue + ", new="+ knxValue+ ")");
		console.log('INFO: myCurrentDoorState = ' +myCurrentDoorState);

		if (field==="KNXPulseMove") {

			if (knxValue===1) {

				if (oldValue!==1){ // value changed?
					console.log('INFO: KNXPulseMove detected');

					if (this.timer1 !== undefined){
						clearTimeout(this.timer1);
						this.timer1 = undefined;
						console.log('INFO: Timer für KNXDoorOpen zurückgesetzt');
					}

					if (this.myAPI.getValue("KNXDoorClosed")===0){ // IF DOOR IS CLOSED
						// also CurrentDoorState = 1
						console.log('INFO: Current Status CurrentDoorState = 0 CLOSED detected');
						console.log('INFO: TargetDoorState = 0 OPEN setzen');

						this.myAPI.setValue("TargetDoorState", 0); // OPEN

						console.log('INFO: CurrentDoorState = 2 OPENING setzen');
						this.myAPI.setValue("CurrentDoorState", 2); // OPENING

						this.lastMove = "goingUp";
						console.log('INFO: lastMove = ' + this.lastMove+ ' setzen');
						
						if (this.simulateDoorOpenContact){

							this.myAPI.knxWrite("KNXDoorOpen", 1, "DPT1"); // Tor nicht auf

							console.log('INFO: Timer für KNXDoorOpen gestartet');
							this.timer1 = setTimeout (function (field) {
													console.log('INFO: Timer abgelaufen, Tor oben angekommen wird simuliert');
													console.log('INFO: KNXDoorOpen = 0 setzen');
													this.myAPI.knxWrite("KNXDoorOpen", 0, "DPT1"); // Tor oben angekommen
							}.bind(this),this.doorRunTime, field);

						} // simulateDoorOpenContact
					} // ("KNXDoorClosed")===1

					else if (myCurrentDoorState===2){ // IF DOOR IS OPENING
						console.log('INFO: Current Status CurrentDoorState = 2 OPENING detected');
						console.log('INFO: CurrentDoorState = 4 STOPPED setzen');
						this.myAPI.setValue("CurrentDoorState", 4); // STOPPED
					} // ("CurrentDoorState")===2 //OPENING

					else if (myCurrentDoorState===3){ // IF DOOR IS CLOSING
						console.log('INFO: Current Status CurrentDoorState = 3 CLOSING detected');
						console.log('INFO: CurrentDoorState = 4 STOPPED setzen');
						this.myAPI.setValue("CurrentDoorState", 4); // STOPPED
					} // ("CurrentDoorState")===2 //OPENING

					else if (myCurrentDoorState===4){ // IF DOOR IS STOPPED
						console.log('INFO: Current Status CurrentDoorState = 4 STOPPED detected');
						if (this.lastMove === "goingUp"){
							console.log('INFO: TargetDoorState = 1 CLOSED setzen');
							this.myAPI.setValue("TargetDoorState", 1); // CLOSED
							console.log('INFO: CurrentDoorState = 3 CLOSING setzen');
							this.myAPI.setValue("CurrentDoorState", 3); // CLOSING
							this.lastMove = "goingDown";
							console.log('INFO: lastMove = ' + this.lastMove+ ' setzen');
						}
						else if (this.lastMove === "goingDown"){
							console.log('INFO: TargetDoorState = 1 CLOSED setzen');
							this.myAPI.setValue("TargetDoorState", 1); // CLOSED
							console.log('INFO: CurrentDoorState = 3 CLOSING setzen');
							this.myAPI.setValue("CurrentDoorState", 3); // CLOSING
							this.lastMove = "goingUp";
							console.log('INFO: lastMove = ' + this.lastMove+ ' setzen');
						}
					} // ("CurrentDoorState")===4 // STOPPED

					else if (myCurrentDoorState===0){ // IF DOOR IS OPEN
						console.log('INFO: Current Status CurrentDoorState = 0 OPEN detected');
						console.log('INFO: TargetDoorState = 1 CLOSED setzen');

						this.myAPI.setValue("TargetDoorState", 1); // CLOSED
						console.log('INFO: CurrentDoorState = 3 CLOSING setzen');

						this.myAPI.setValue("CurrentDoorState", 3); // CLOSING
						this.lastMove = "goingDown";
						console.log('INFO: lastMove = ' + this.lastMove+ ' setzen');

						if (this.simulateDoorOpenContact){
							this.myAPI.knxWrite("KNXDoorOpen", 1, "DPT1"); // Tor nicht auf
						}
					} // ("CurrentDoorState")===0 // OPEN

				} // oldValue!==1)
			} // knxValue===1
		} // Garagentor_Move

		if (field==="KNXDoorClosed") {
			if (knxValue===0) {
				// Rückmeldestatus 0 (closed) detected
				if (oldValue!==0){ // Only on value change
					if (oldValue !== null){
						console.log('INFO: KNXDoorClosed = 0 detected');
						console.log('INFO: CurrentDoorState = 1 CLOSED setzen');

						this.myAPI.setValue("CurrentDoorState", 1); // CLOSED
						
						this.lastMove = "Stopped";
						console.log('INFO: lastMove = ' + this.lastMove+ ' setzen');
					} else { // Init run
						console.log('INFO: Init Garage Door HK Status');

						this.myAPI.setValue("TargetDoorState", 1); // CLOSED
						this.myAPI.setValue("CurrentDoorState", 1); // CLOSED

						if (this.simulateDoorOpenContact){
							this.myAPI.knxWrite("KNXDoorOpen", 1, "DPT1");
						}

						this.lastMove = "Stopped";
						console.log('INFO: lastMove = ' + this.lastMove+ ' setzen');
					} // Init run
				} // Only on value change
			} // (knxValue===0)
		} // (field==="KNXDoorClosed")

		if (field==="KNXDoorOpen") {
			if (knxValue===0) {
				// Status 0 (closed) detected
				
				if (oldValue!=0){ // Only on value change
					console.log('INFO: KNXDoorOpen = 0 detected');
					console.log('INFO: CurrentDoorState = 0 OPEN setzen');

					this.myAPI.setValue("CurrentDoorState", 0); // OPEN

					this.lastMove = "Stopped";
					console.log('INFO: lastMove = ' + this.lastMove+ ' setzen');
				}
			} // field==="KNXDoorOpen = 0
		} // field==="KNXDoorOpen

	} // onKNXValueChange


	sendPulse(waitTime, numPulses) {

		for (var i = 0; i < numPulses; i++) {

			console.log('INFO: KNXPulseMove = 1 Auf/Stopp/Zu aufrufen');
			this.myAPI.knxWrite("KNXPulseMove", 1, "DPT1"); // Auf/Stopp/Zu
			
			// wait some time so that the staircase-swithces of or
			// switch off if actuator is not configured to be in "staircaseFunc"-mode
			setTimeout(function(){alert("Resetting Impulse")}, waitTime);

			if (!this.staircaseFunc){
				this.myAPI.knxWrite("KNXPulseMove", 1, "DPT1"); // Auf/Stopp/Zu
			}

		}
	}
	/****
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 *
	 */
	onHKValueChange(field, oldValue, newValue) {
		
		console.log('INFO: on HK Value Change (' + field + ", old="+ oldValue + ", new="+ newValue + ")");
		var myCurrentDoorState=this.myAPI.getValue("CurrentDoorState");

		if (field==="TargetDoorState") {
			// The value property of TargetDoorState must be one of the following:
			// Characteristic.TargetDoorState.OPEN = 0;
			// Characteristic.TargetDoorState.CLOSED = 1;

			if (newValue===0){ // OPEN

				// TODO: if closing, opening, closed, stopped -> remember last direction (this.lastMove?)


				if (myCurrentDoorState===0){ // IF DOOR IS OPEN
					console.log('INFO: Current Status CurrentDoorState = 2 OPEN detected');
					// Do nothing, opening already
				} // ("CurrentDoorState")===2 //OPENING
				else if (myCurrentDoorState===2){ // IF DOOR IS OPENING
					console.log('INFO: Current Status CurrentDoorState = 2 OPENING detected');
					// Do nothing, opening already
				}
				else if (myCurrentDoorState===1){ // IF DOOR IS CLOSED
						// send Impuls for Opening

						// first
						sendPulse(this.pulseLength);

						// TODO: else -> wait for staircaseFunc -> configure length of pulse
				} // ("CurrentDoorState")===0 // CLOSED
				else if (myCurrentDoorState===3){ // IF DOOR IS CLOSING
					console.log('INFO: Current Status CurrentDoorState = 3 CLOSING detected');
					// Send Impulses for Stop - Opening
					sendPulse(this.pulseLength, 2);
					
					// Set status to OPENING
					this.myAPI.setValue("CurrentDoorState", 2); // OPENING

				} // ("CurrentDoorState")===2 //OPENING

				else if (myCurrentDoorState===4){ // IF DOOR IS STOPPED
					console.log('INFO: Current Status CurrentDoorState = 4 STOPPED detected');
					if (this.lastMove === "goingUp"){
						// send Impulses for Down - Stop - Opening
						sendPulse(this.pulseLength, 3);

						// Set status to OPENING
						this.myAPI.setValue("CurrentDoorState", 2); // OPENING

					}
					else if (this.lastMove === "goingDown"){
						// send Impuls for Opening
						sendPulse(this.pulseLength, 1);

						// Set status to OPENING
						this.myAPI.setValue("CurrentDoorState", 2); // OPENING

					}
				} // ("CurrentDoorState")===4 // STOPPED


			} // TargetDoorState = OPEN

			if (newValue===1){ // CLOSE


				if (myCurrentDoorState===1){ // IF DOOR IS CLOSED
					// Do nothing, closing already
				} // ("CurrentDoorState")===0 // CLOSED
				else if (myCurrentDoorState===3){ // IF DOOR IS CLOSING
					console.log('INFO: Current Status CurrentDoorState = 2 CLOSING detected');
					// Do nothing, closing already
				} // ("CurrentDoorState")===2 //OPENING
				else if (myCurrentDoorState===0){ // IF DOOR IS OPEN
						// send Impuls for Closing
						sendPulse(this.pulseLength, 1);

				} // ("CurrentDoorState")===0 // OPEN
				else if (myCurrentDoorState===2){ // IF DOOR IS OPENING
					console.log('INFO: Current Status CurrentDoorState = 3 OPENING detected');
					// Send Impulses for Stop - Opening
					sendPulse(this.pulseLength, 2);

					// Set status to OPENING
					this.myAPI.setValue("CurrentDoorState", 3); // CLOSING

				} // ("CurrentDoorState")===2 //OPENING

				else if (myCurrentDoorState===4){ // IF DOOR IS STOPPED
					console.log('INFO: Current Status CurrentDoorState = 4 STOPPED detected');

					if (this.lastMove === "goingDown"){
						// send Impulses for Down - Stop - Opening
						sendPulse(this.pulseLength, 3);

						// Set status to OPENING
						this.myAPI.setValue("CurrentDoorState", 3); // CLOSING

					}
					else if (this.lastMove === "goingUp"){
						// send Impuls for Opening
						sendPulse(this.pulseLength, 1);

						// Set status to OPENING
						this.myAPI.setValue("CurrentDoorState", 3); // CLOSING

					}
				} // ("CurrentDoorState")===4 // STOPPED

			} // TargetDoorState = CLOSE
		} // TargetDoorState
	} // onHKValueChange
} // class
module.exports=	GiaseGarageDoorOpener;

/*****************************************************************************
The config for that should look like this in knx_config.json:
// TODO if works

        {
            "DeviceName": "Garagentor",
            "Services": [
                {
                    "ServiceType": "GarageDoorOpener",
                    "Handler": "GiaseGarageDoorOpener",
                    "ServiceName": "Garagentor",
                    "Characteristics": [
                        {
                            "Type": "CurrentDoorState"
                        },
                        {
                            "Type": "TargetDoorState"
                        },
                        {
                            "Type": "ObstructionDetected"
                        }
                    ],
                    "KNXObjects": [
                        {
                            "Type": "KNXPulseMove",
                            "Set": "4/0/2",
                            "Listen": "4/0/2",
                            "DPT": "DPT1"
                        },
                        {
                            "Type": "KNXDoorClosed",
                            "Listen": "1/1/8",
                            "DPT": "DPT1",
                            "Reverse": true
                        },
                        {
                            "Type": "KNXDoorOpen",
                            "Listen": "1/1/10",
                            "DPT": "DPT1",
                            "Reverse": true
                        }
                    ],
                    "KNXReadRequests": [
                        "4/0/2",
                        "1/1/8",
                        "1/1/10"
                    ],
                    "LocalConstants": {
                        "simulateDoorOpenContact": "true",
                        "staircaseFunc": "false",
                        "pulseLength": 500, 
                        "doorRunTime": 18000
                    }
                }
            ]
        }

+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
