/* 
 * This is a module to handle a Garage Door Opener that is connected to a
 * KNX actuator, staircaseFunc mode can be configured, time can be configured.
 * The engine will switch from Up/Stop/Down in cycle if more than
 * 1 command is received during movement.
 *
 * This addin can operate using one or two contact sensors to detect either KNXDoorClosed 
 * only or both KNXDoorClosed and KNXDoorOpen.
 * In the former case, the KNXDoorOpen sensor can be simulated in two ways, either
 * using the KNX-Bus in between (simulateDoorContactMode == "knx") or only simulating
 * the state internally (simulateDoorContactMode == "internal"), in case you don't want to 
 * use the KNX-Bus in between (default).
 * 
 * The contact sensors are expected to have a value of "sensorOn" when activated. Please use the 
 * "sensorOn"-keyword in knx_config.json (both need to operate the same way).
 *
 */
'use strict';
/** * @type {HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('GarageDoorOpenerAdvanced');


/**
 * @class A custom handler for a Garage Door Opener conected to a KNX actuator
 * @extends HandlerPattern
 */
class GarageDoorOpenerAdvanced extends HandlerPattern {

	constructor(knxAPI) {
		super(knxAPI); // call the super constructor first. Always.
		

		this.timer1 = undefined;

		// sets the mode to simulate a Door-contact.
		// Available modes:
		// - off
		// - knx
		// - internal
		this.simulateDoorContactMode = undefined;

		// configures which contacts are really present in a setup.
		// if simulateDoorContactMode is set to "knx" or "internal", the other contact will be 
		// simulated
		//
		// Available modes:
		// - open - if the "open"-contact is present
		// - closed - if the "closed"-contact is present
		// - both - if both ontacts are present - no simulation in this case
		this.doorContactPresent = undefined;

		// Door run-time
		this.doorRunTime = undefined;

		// Define the length for a pulse. This needs to be set regardless staircase-function on or off
		// In case the staircase-function is used, it needs to be set to the same value (or a little more)
		this.pulseLength = undefined;

		// Staircase function
		this.staircaseFunc = undefined;

		// Does the door use separate pulses for up and down?
		this.separatePulseUpDown = undefined;

		// get the sensor value for "On"
		this.sensorOn = undefined;

		// this is used to track the percentageOpen of the door
		// 100% is open, 0% is closed
		this.dateRunStart = undefined;
		this.percentageOpen = undefined;
	}

	/****
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 *
	 */
	onKNXValueChange(field, oldValue, knxValue) {
		// value for HomeKit
		var newValue;
		var myCurrentDoorState=this.myAPI.getValue("CurrentDoorState");

		// sets the mode to simulate the DoorOpen-contact.
		// Available modes:
		// - off
		// - knx
		// - internal
		// TODO: A check for valid values would be nice here.
		this.simulateDoorContactMode = this.myAPI.getLocalConstant("simulateDoorContactMode");

		// configures which contacts are really present in a setup.
		// if simulateDoorContactMode is set to "knx" or "internal", the other contact will be 
		// simulated
		//
		// Available modes:
		// - open - if the "open"-contact is present
		// - closed - if the "closed"-contact is present
		// - both - if both ontacts are present - no simulation in this case
		this.doorContactPresent = this.myAPI.getLocalConstant("doorContactPresent");;

		// Door run-time
		this.doorRunTime = this.myAPI.getLocalConstant("doorRunTime"); // in mil.seconds

		// Define the length for a pulse. This needs to be set regardless staircase-function on or off
		// In case the staircase-function is used, it needs to be set to the same value (or a little more)
		this.pulseLength = this.myAPI.getLocalConstant("pulseLength");

		// Staircase function
		this.staircaseFunc = this.myAPI.getLocalConstant("staircaseFunc");

		// Does the door use separate pulses for up and down?
		this.separatePulseUpDown = this.myAPI.getLocalConstant("separatePulseUpDown");

		// get the sensor value for "On"
		this.sensorOn = this.myAPI.getLocalConstant("sensorOn");

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
		console.log('INFO: myCurrentDoorState = ' + myCurrentDoorState);

		if (field === "KNXPulseMove") {

			if (knxValue === 1) {

				if (oldValue !== 1){ // value changed?
					console.log('INFO: KNXPulseMove detected');

					if (this.timer1 !== undefined){
						clearTimeout(this.timer1);
						this.timer1 = undefined;
						console.log('INFO: Timer für KNXDoorOpen reset');
					}

					if (myCurrentDoorState === 1){ // IF DOOR IS CLOSED
						// also CurrentDoorState = 1
						console.log('INFO: CurrentDoorState = 0 CLOSED detected');
						console.log('INFO: TargetDoorState = 0 OPEN set');


						// Handling the setting here,
						// -> removed this in KNXDoorOpen and KNXDoorClosed-handling
						this.myAPI.setValue("TargetDoorState", 0); // OPEN

						console.log('INFO: CurrentDoorState = 2 OPENING set');
						this.myAPI.setValue("CurrentDoorState", 2); // OPENING
						this.dateRunStart = new Date();

						this.lastMove = "goingUp";
						console.log('INFO: lastMove = ' + this.lastMove+ ' set');
						
						if (this.simulateDoorContactMode==="knx" && this.doorContactPresent==="open"){

							console.log('INFO: this.simulateDoorContactMode: ' + this.simulateDoorContactMode);
							console.log('INFO: this.doorContactPresent: ' + this.doorContactPresent);
							this.myAPI.knxWrite("KNXDoorOpen", !this.sensorOn, "DPT1"); // Door not open

						}
						else if (this.simulateDoorContactMode==="knx" && this.doorContactPresent==="closed"){
							// simulate "open"-contact on knx

							console.log('INFO: this.simulateDoorContactMode: ' + this.simulateDoorContactMode);
							console.log('INFO: this.doorContactPresent: ' + this.doorContactPresent);
							// simulate this even on the bus
							this.myAPI.knxWrite("KNXDoorOpen", !this.sensorOn, "DPT1"); // Door not open

							console.log('INFO: Timer für KNXDoorOpen started');
							this.timer1 = setTimeout (function () {
													console.log('INFO: Timeout, simulating Door Open');
													
													console.log('INFO: KNXDoorOpen = ' + this.sensorOn + ' set');
													this.myAPI.knxWrite("KNXDoorOpen", this.sensorOn, "DPT1"); // Door open
													this.percentageOpen = 1;

							}.bind(this),this.doorRunTime);

						} else if (this.simulateDoorContactMode==="internal" && this.doorContactPresent==="closed"){
							// simulate "open"-contact internally


							console.log('INFO: this.simulateDoorContactMode: ' + this.simulateDoorContactMode);
							console.log('INFO: this.doorContactPresent: ' + this.doorContactPresent);
							console.log('INFO: Timer für KNXDoorOpen started');
							this.timer1 = setTimeout (function () {
													console.log('INFO: Timeout, simulating Door Open');
													
													console.log('INFO: CurrentDoorState = 0 OPEN set');
													this.myAPI.setValue("CurrentDoorState", 0); // OPEN
													this.percentageOpen = 1;

													this.lastMove = "Stopped";
													console.log('INFO: lastMove = ' + this.lastMove+ ' set'); // Door open
							}.bind(this),this.doorRunTime);

						} // simulateDoorContactMode
					} // ("KNXDoorClosed")===1

					else if (myCurrentDoorState===2){ // IF DOOR IS OPENING
						console.log('INFO: CurrentDoorState = 2 OPENING detected');
						console.log('INFO: CurrentDoorState = 4 STOPPED set');
						this.myAPI.setValue("CurrentDoorState", 4); // STOPPED

						// calculate percentageOpen
						var curDate = new Date();
						var percentageRun = undefined;
						
						percentageRun = (curDate.getTime() - this.dateRunStart.getTime()) / this.doorRunTime;
						console.log('INFO: percentageRun = ' + percentageRun);
						console.log('INFO: percentageOpen before = ' + this.percentageOpen);
						this.percentageOpen = this.percentageOpen + percentageRun;
						console.log('INFO: percentageOpen = ' + this.percentageOpen);

						// clear timer
						if (this.timer1 !== undefined){
							clearTimeout(this.timer1);
							this.timer1 = undefined;
							console.log('INFO: Timer für KNXDoorOpen reset');
						}


					} // ("CurrentDoorState")===2 //OPENING

					else if (myCurrentDoorState===3){ // IF DOOR IS CLOSING
						console.log('INFO: CurrentDoorState = 3 CLOSING detected');
						console.log('INFO: CurrentDoorState = 4 STOPPED set');
						this.myAPI.setValue("CurrentDoorState", 4); // STOPPED

						// calculate percentageOpen
						var curDate = new Date();
						var percentageRun = undefined;
						
						percentageRun = (curDate.getTime() - this.dateRunStart.getTime()) / this.doorRunTime;
						console.log('INFO: percentageRun = ' + percentageRun);
						console.log('INFO: percentageOpen before = ' + this.percentageOpen);
						this.percentageOpen = this.percentageOpen - percentageRun;
						console.log('INFO: percentageOpen = ' + this.percentageOpen);

						// clear timer
						if (this.timer1 !== undefined){
							clearTimeout(this.timer1);
							this.timer1 = undefined;
							console.log('INFO: Timer für KNXDoorOpen reset');
						}

					} // ("CurrentDoorState")===3 //CLOSING

					else if (myCurrentDoorState===4){ // IF DOOR IS STOPPED
						console.log('INFO: CurrentDoorState = 4 STOPPED detected');

						if (this.lastMove === "goingUp"){

							console.log('INFO: TargetDoorState = 1 CLOSED set');
							this.myAPI.setValue("TargetDoorState", 1); // CLOSED
							console.log('INFO: CurrentDoorState = 3 CLOSING set');
							this.myAPI.setValue("CurrentDoorState", 3); // CLOSING
							this.dateRunStart = new Date();

							this.lastMove = "goingDown";
							console.log('INFO: lastMove = ' + this.lastMove+ ' set');

							// simulate
							if (this.simulateDoorContactMode==="knx" && this.doorContactPresent==="open"){
								// simulate "open"-contact on knx

								console.log('INFO: this.simulateDoorContactMode: ' + this.simulateDoorContactMode);
								console.log('INFO: this.doorContactPresent: ' + this.doorContactPresent);

								console.log('INFO: Timer für KNXDoorClosed started');
								this.timer1 = setTimeout (function () {

														console.log('INFO: Timeout, simulating Door Closed');
														console.log('INFO: KNXDoorClosed = ' + this.sensorOn + ' set');
														this.myAPI.knxWrite("KNXDoorClosed", this.sensorOn, "DPT1"); // Door open

														// setting HK-state and percentage is done in KNXDoorClosed

								}.bind(this),this.doorRunTime*(1-this.percentageOpen));

							} else if (this.simulateDoorContactMode==="internal" && this.doorContactPresent==="open"){
								// simulate "open"-contact internally

								console.log('INFO: this.simulateDoorContactMode: ' + this.simulateDoorContactMode);
								console.log('INFO: this.doorContactPresent: ' + this.doorContactPresent);

								console.log('INFO: Timer für KNXDoorClosed started');
								this.timer1 = setTimeout (function () {

														console.log('INFO: Timeout, simulating Door Closed');
														console.log('INFO: KNXDoorClosed = ' + this.sensorOn + ' set');
														this.myAPI.setValue("CurrentDoorState", 1); // Closed
														
														this.percentageOpen = 1;

														this.lastMove = "Stopped";
														console.log('INFO: lastMove = ' + this.lastMove+ ' set'); // Door open

								}.bind(this),this.doorRunTime*(1-this.percentageOpen));

							} // simulateDoorContactMode

						}
						else if (this.lastMove === "goingDown"){

							console.log('INFO: TargetDoorState = 1 OPEN set');
							this.myAPI.setValue("TargetDoorState", 0); // OPEN
							console.log('INFO: CurrentDoorState = 3 OPENING set');
							this.myAPI.setValue("CurrentDoorState", 2); // OPENING
							this.dateRunStart = new Date();
							
							this.lastMove = "goingUp";
							console.log('INFO: lastMove = ' + this.lastMove+ ' set');

							// simulate
							if (this.simulateDoorContactMode==="knx" && this.doorContactPresent==="closed"){
								// simulate "open"-contact on knx

								console.log('INFO: this.simulateDoorContactMode: ' + this.simulateDoorContactMode);
								console.log('INFO: this.doorContactPresent: ' + this.doorContactPresent);

								console.log('INFO: Timer für KNXDoorOpen started');
								this.timer1 = setTimeout (function () {
														console.log('INFO: Timeout, simulating Door Open');
														
														console.log('INFO: KNXDoorOpen = ' + this.sensorOn + ' set');
														this.myAPI.knxWrite("KNXDoorOpen", this.sensorOn, "DPT1"); // Door open

														// setting HK-state and percentage is done in KNXDoorClosed

								}.bind(this),this.doorRunTime*(1-this.percentageOpen));

							} else if (this.simulateDoorContactMode==="internal" && this.doorContactPresent==="closed"){
								// simulate "open"-contact internally


								console.log('INFO: this.simulateDoorContactMode: ' + this.simulateDoorContactMode);
								console.log('INFO: this.doorContactPresent: ' + this.doorContactPresent);
								console.log('INFO: Timer für KNXDoorOpen started');
								this.timer1 = setTimeout (function () {

														console.log('INFO: Timeout, simulating Door Open');
														
														console.log('INFO: CurrentDoorState = 0 OPEN set');
														this.myAPI.setValue("CurrentDoorState", 0); // OPEN
														this.percentageOpen = 1;

														this.lastMove = "Stopped";
														console.log('INFO: lastMove = ' + this.lastMove+ ' set'); // Door open

							}.bind(this),this.doorRunTime*(1-this.percentageOpen));

							} // simulateDoorContactMode

						}
					} // ("CurrentDoorState")===4 // STOPPED

					else if (myCurrentDoorState===0){ // IF DOOR IS OPEN
						console.log('INFO: CurrentDoorState = 0 OPEN detected');
						console.log('INFO: TargetDoorState = 1 CLOSED set');


						// Handling the setting here,
						// -> removed this in KNXDoorOpen and KNXDoorClosed-handling
						this.myAPI.setValue("TargetDoorState", 1); // CLOSED
						console.log('INFO: CurrentDoorState = 3 CLOSING set');

						this.myAPI.setValue("CurrentDoorState", 3); // CLOSING
						this.dateRunStart = new Date();

						this.lastMove = "goingDown";
						console.log('INFO: lastMove = ' + this.lastMove+ ' set');

						if (this.simulateDoorContactMode==="knx" && this.doorContactPresent==="closed"){
							console.log('INFO: this.simulateDoorContactMode: ' + this.simulateDoorContactMode);
							console.log('INFO: this.doorContactPresent: ' + this.doorContactPresent);
							this.myAPI.knxWrite("KNXDoorOpen", !this.sensorOn, "DPT1"); // Door not open
						}
						else if (this.simulateDoorContactMode==="knx" && this.doorContactPresent==="open"){
							// simulate the "closed contact" on knx

							console.log('INFO: this.simulateDoorContactMode: ' + this.simulateDoorContactMode);
							console.log('INFO: this.doorContactPresent: ' + this.doorContactPresent);

							// simulate this even on the bus
							this.myAPI.knxWrite("KNXDoorClosed", !this.sensorOn, "DPT1"); // Door not open

							console.log('INFO: Timer für KNXDoorClosed started');
							this.timer1 = setTimeout (function () {
													console.log('INFO: Timeout, simulating Door Closed');
													
													console.log('INFO: KNXDoorClosed = ' + this.sensorOn + ' set');
													this.myAPI.knxWrite("KNXDoorClosed", this.sensorOn, "DPT1"); // Door open
													this.percentageOpen = 1;

							}.bind(this),this.doorRunTime);

						} else if (this.simulateDoorContactMode==="internal" && this.doorContactPresent==="open"){
							// simulate the "closed contact" internally

							console.log('INFO: this.simulateDoorContactMode: ' + this.simulateDoorContactMode);
							console.log('INFO: this.doorContactPresent: ' + this.doorContactPresent);

							console.log('INFO: Timer für KNXDoorClosed started');
							this.timer1 = setTimeout (function () {
													console.log('INFO: Timeout, simulating Door Closed');
													
													console.log('INFO: CurrentDoorState = 1 CLOSED set');
													this.myAPI.setValue("CurrentDoorState", 1); // Closed
													this.percentageOpen = 0;

													this.lastMove = "Stopped";
													console.log('INFO: lastMove = ' + this.lastMove+ ' set'); // Door closed
							}.bind(this),this.doorRunTime);

						} // simulateDoorContactMode


					} // ("CurrentDoorState")===0 // OPEN

				} // oldValue!==1)
			} // knxValue===1
		} // Garagentor_Move


		if (field === "KNXPulseUp") {

			if (knxValue === 1 && oldValue !== 1) {
					
				this.myAPI.setValue("TargetDoorState", 0); // OPEN
				this.myAPI.setValue("CurrentDoorState", 2); // OPENING

			}

		}


		if (field === "KNXPulseDown") {

			if (knxValue === 1 && oldValue !== 1) {
					
				this.myAPI.setValue("TargetDoorState", 1); // CLOSED
				this.myAPI.setValue("CurrentDoorState", 3); // CLOSING

			}
		}


		if (field==="KNXDoorClosed") {

			// it does not matter if on or off
			this.percentageOpen = 0;
			
			// value changed?
			if (knxValue === this.sensorOn && oldValue !== this.sensorOn) {

					this.myAPI.setValue("CurrentDoorState", 1); // CLOSED
					this.myAPI.setValue("TargetDoorState", 1); // CLOSED

					console.log('INFO: CurrentDoorState = 1 CLOSED set');

					if (oldValue !== null){

						console.log('INFO: KNXDoorClosed detected');

					} else { // Init run

						console.log('INFO: Init Garage Door HK Status');

						if (this.simulateDoorContactMode==="knx" && this.doorContactPresent==="closed"){
							// simulate "open"-contact
							this.myAPI.knxWrite("KNXDoorOpen", !this.sensorOn, "DPT1");
						}

					} // Init run

					this.lastMove = "Stopped";
					console.log('INFO: lastMove = ' + this.lastMove+ ' set');

			} // (knxValue===0)
			else if (knxValue !== this.sensorOn && oldValue === this.sensorOn) {

				// This was probably the culprit for receiving two push notifications
				// it should be ok to just have the TargetDoorState set on receiving a pulse
				// this.myAPI.setValue("TargetDoorState", 0); // OPENED

			}

		} // (field==="KNXDoorClosed")

		if (field==="KNXDoorOpen") {

			// it does not matter if on or off
			this.percentageOpen = 1;
			
			// value changed?
			if (knxValue === this.sensorOn && oldValue !== this.sensorOn) {
				// Status 0 (closed) detected

					this.myAPI.setValue("CurrentDoorState", 0); // OPEN
					this.myAPI.setValue("TargetDoorState", 0); // OPEN

					console.log('INFO: CurrentDoorState = 0 OPEN set');

					if (oldValue !== null){

						console.log('INFO: KNXDoorOpen detected');

					} else { // Init run

						console.log('INFO: Init Garage Door HK Status');

						if (this.simulateDoorContactMode==="knx" && this.doorContactPresent==="open"){
							// simulate "closed"-contact
							this.myAPI.knxWrite("KNXDoorClosed", !this.sensorOn, "DPT1");
						}

					} // Init run

					this.lastMove = "Stopped";
					console.log('INFO: lastMove = ' + this.lastMove+ ' set');

			} // field==="KNXDoorOpen = 0
			else if (knxValue !== this.sensorOn && oldValue === this.sensorOn) {

				// This was probably the culprit for receiving two push notifications
				// it should be ok to just have the TargetDoorState set on receiving a pulse
				// this.myAPI.setValue("TargetDoorState", 1); // CLOSED

			}

		} // field==="KNXDoorOpen

	} // onKNXValueChange

	/****
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 *
	 */
	onHKValueChange(field, oldValue, newValue) {
		
		var myCurrentDoorState=this.myAPI.getValue("CurrentDoorState");

		// sets the mode to simulate the DoorOpen-contact.
		// Available modes:
		// - off
		// - knx
		// - internal
		this.simulateDoorContactMode = this.myAPI.getLocalConstant("simulateDoorContactMode");

		// configures which contacts are really present in a setup.
		// if simulateDoorContactMode is set to "knx" or "internal", the other contact will be 
		// simulated
		//
		// Available modes:
		// - open - if the "open"-contact is present
		// - closed - if the "closed"-contact is present
		// - both - if both ontacts are present - no simulation in this case
		this.doorContactPresent = this.myAPI.getLocalConstant("doorContactPresent");;

		// Door run-time
		this.doorRunTime = this.myAPI.getLocalConstant("doorRunTime"); // in mil.seconds

		// Define the length for a pulse. This needs to be set regardless staircase-function on or off
		// In case the staircase-function is used, it needs to be set to the same value (or a little more)
		this.pulseLength = this.myAPI.getLocalConstant("pulseLength");

		// Staircase function
		this.staircaseFunc = this.myAPI.getLocalConstant("staircaseFunc");

		// Does the door use separate pulses for up and down?
		this.separatePulseUpDown = this.myAPI.getLocalConstant("separatePulseUpDown");

		// get the sensor value for "On"
		this.sensorOn = this.myAPI.getLocalConstant("sensorOn");

		console.log('INFO: on HK Value Change (' + field + ", old="+ oldValue + ", new="+ newValue + ")");
		console.log('INFO: myCurrentDoorState = ' + myCurrentDoorState);


		if (field === "TargetDoorState") {
			// The value property of TargetDoorState must be one of the following:
			// Characteristic.TargetDoorState.OPEN = 0;
			// Characteristic.TargetDoorState.CLOSED = 1;

			if (newValue === 0){ // OPEN

				if (this.separatePulseUpDown) {

					this.sendPulseUp();

				} else { // only up/stop/down - 1 type of pulse available

					if (myCurrentDoorState===0){ // IF DOOR IS OPEN
						console.log('INFO: CurrentDoorState = 2 OPEN detected');
						// Do nothing, opening already
					} // ("CurrentDoorState")===2 //OPENING
					else if (myCurrentDoorState===2){ // IF DOOR IS OPENING
						console.log('INFO: CurrentDoorState = 2 OPENING detected');
						// Do nothing, opening already
					}
					else if (myCurrentDoorState===1){ // IF DOOR IS CLOSED
						// send pulse for Opening
						console.log('INFO: Calling this.sendPulse()');
						this.sendPulse(1);

					} // ("CurrentDoorState")===0 // CLOSED
					else if (myCurrentDoorState===3){ // IF DOOR IS CLOSING
						console.log('INFO: CurrentDoorState = 3 CLOSING detected');
						// Send pulsees for Stop - Opening
						this.sendPulse(2);
						
						// CurrentDoorState is taken care in KNXValueChange

					} // ("CurrentDoorState")===2 //OPENING

					else if (myCurrentDoorState===4){ // IF DOOR IS STOPPED
						console.log('INFO: CurrentDoorState = 4 STOPPED detected');

						// Door is stopped (not closed or opened and was goingUp)
						if (this.lastMove === "goingUp"){
							// send pulsees for Down - Stop - Opening
							console.log('INFO: goingUp, Calling this.sendPulse(3)');
							this.sendPulse(3);

							// CurrentDoorState is taken care in KNXValueChange
						}
						// Door is stopped (not closed or opened and was goingDown)
						else if (this.lastMove === "goingDown"){
							// send pulse for Opening
							console.log('INFO: goingDown, Calling this.sendPulse(1)');
							this.sendPulse(1);

							// CurrentDoorState is taken care in KNXValueChange
						}
					} // ("CurrentDoorState")===4 // STOPPED

				}


			} // TargetDoorState = OPEN

			if (newValue===1){ // CLOSE


				if (this.separatePulseUpDown) {

					this.sendPulseDown();

				} else { // only up/stop/down - 1 type of pulse available

					if (myCurrentDoorState===1){ // IF DOOR IS CLOSED
						console.log('INFO: CurrentDoorState = 2 CLOSED detected');
						// Do nothing, closing already
					} // ("CurrentDoorState")===0 // CLOSED
					else if (myCurrentDoorState===3){ // IF DOOR IS CLOSING
						console.log('INFO: CurrentDoorState = 2 CLOSING detected');
						// Do nothing, closing already
					} // ("CurrentDoorState")===2 //OPENING
					else if (myCurrentDoorState===0){ // IF DOOR IS OPEN
						// send pulse for Closing
						this.sendPulse(1);

					} // ("CurrentDoorState")===0 // OPEN
					else if (myCurrentDoorState===2){ // IF DOOR IS OPENING
						console.log('INFO: CurrentDoorState = 3 OPENING detected');
						// Send pulses for Stop - Opening
						this.sendPulse(2);

						// CurrentDoorState is taken care in KNXValueChange

					} // ("CurrentDoorState")===2 //OPENING

					else if (myCurrentDoorState===4){ // IF DOOR IS STOPPED
						console.log('INFO: CurrentDoorState = 4 STOPPED detected');

						if (this.lastMove === "goingDown"){
							// send pulsees for Down - Stop - Opening
							this.sendPulse(3);

							// CurrentDoorState is taken care in KNXValueChange
						}
						else if (this.lastMove === "goingUp"){
							// send pulse for Opening
							this.sendPulse(1);

							// CurrentDoorState is taken care in KNXValueChange
						}
					} // ("CurrentDoorState")===4 // STOPPED

				}



			} // TargetDoorState = CLOSE

		} // TargetDoorState

	} // onHKValueChange


	/****
	 * sendPulse is used to send an pulse for up/down/stop to the bus
	 *
	 */
	sendPulse(numPulses) {
	  
	  console.log('INFO: sendPulse called. Number of pulses = ' + numPulses);

	  var date = new Date();


		if (numPulses === 1){
			date = new Date();
			console.log('INFO: KNXPulseMove = 1 first pulse - calling Up/Stop/Down, ' + date.getSeconds() +'s:'+ date.getMilliseconds() +'ms');
			this.myAPI.knxWrite("KNXPulseMove", 1, "DPT1"); // Up/Stop/Down
			setTimeout(function(){
				date = new Date();
				console.log('INFO: KNXPulseMove = 0 first pulse - calling Up/Stop/Down, ' + date.getSeconds() +'s:'+ date.getMilliseconds() +'ms');
				if (!this.staircaseFunc) {this.myAPI.knxWrite("KNXPulseMove", 0, "DPT1");} // Up/Stop/Down
			}.bind(this), this.pulseLength);			
		} else if (numPulses === 2){
			date = new Date();
			console.log('INFO: KNXPulseMove = 1 first pulse - calling Up/Stop/Down, ' + date.getSeconds() +'s:'+ date.getMilliseconds() +'ms');
			this.myAPI.knxWrite("KNXPulseMove", 1, "DPT1"); // Up/Stop/Down
			setTimeout(function(){
				date = new Date();
				console.log('INFO: KNXPulseMove = 0 first pulse - calling Up/Stop/Down, ' + date.getSeconds() +'s:'+ date.getMilliseconds() +'ms');
				if (!this.staircaseFunc) {this.myAPI.knxWrite("KNXPulseMove", 0, "DPT1");} // Up/Stop/Down
				setTimeout(function(){
					date = new Date();
					console.log('INFO: KNXPulseMove = 1 second pulse - calling Up/Stop/Down, ' + date.getSeconds() +'s:'+ date.getMilliseconds() +'ms');
					this.myAPI.knxWrite("KNXPulseMove", 1, "DPT1"); // Up/Stop/Down
					setTimeout(function(){
						date = new Date();
						console.log('INFO: KNXPulseMove = 0 second pulse - calling Up/Stop/Down, ' + date.getSeconds() +'s:'+ date.getMilliseconds() +'ms');
						if (!this.staircaseFunc) {this.myAPI.knxWrite("KNXPulseMove", 0, "DPT1");} // Up/Stop/Down
					}.bind(this), this.pulseLength);			
				}.bind(this), this.pulseLength);			
			}.bind(this), this.pulseLength);			
		} else if (numPulses === 3){
			date = new Date();
			console.log('INFO: KNXPulseMove = 1 first pulse - calling Up/Stop/Down, ' + date.getSeconds() +'s:'+ date.getMilliseconds() +'ms');
			this.myAPI.knxWrite("KNXPulseMove", 1, "DPT1"); // Up/Stop/Down
			setTimeout(function(){
				date = new Date();
				console.log('INFO: KNXPulseMove = 0 first pulse - calling Up/Stop/Down, ' + date.getSeconds() +'s:'+ date.getMilliseconds() +'ms');
				if (!this.staircaseFunc) {this.myAPI.knxWrite("KNXPulseMove", 0, "DPT1");} // Up/Stop/Down
				setTimeout(function(){
					date = new Date();
					console.log('INFO: KNXPulseMove = 1 second pulse - calling Up/Stop/Down, ' + date.getSeconds() +'s:'+ date.getMilliseconds() +'ms');
					this.myAPI.knxWrite("KNXPulseMove", 1, "DPT1"); // Up/Stop/Down
					setTimeout(function(){
						date = new Date();
						console.log('INFO: KNXPulseMove = 0 second pulse - calling Up/Stop/Down, ' + date.getSeconds() +'s:'+ date.getMilliseconds() +'ms');
						if (!this.staircaseFunc) {this.myAPI.knxWrite("KNXPulseMove", 0, "DPT1");} // Up/Stop/Down
						setTimeout(function(){
							date = new Date();
							console.log('INFO: KNXPulseMove = 1 third pulse - calling Up/Stop/Down, ' + date.getSeconds() +'s:'+ date.getMilliseconds() +'ms');
							this.myAPI.knxWrite("KNXPulseMove", 1, "DPT1"); // Up/Stop/Down
							setTimeout(function(){
								date = new Date();
								console.log('INFO: KNXPulseMove = 0 third pulse - calling Up/Stop/Down, ' + date.getSeconds() +'s:'+ date.getMilliseconds() +'ms');
								if (!this.staircaseFunc) {this.myAPI.knxWrite("KNXPulseMove", 0, "DPT1");} // Up/Stop/Down
							}.bind(this), this.pulseLength);		
						}.bind(this), this.pulseLength);		
					}.bind(this), this.pulseLength);			
				}.bind(this), this.pulseLength);			
			}.bind(this), this.pulseLength);			
		} 


	}


/****
	 * sendPulseUp is used to send an pulse for up to the bus
	 *
	 */
	sendPulseUp() {

	  var date = new Date();
		console.log('INFO: KNXPulseUp = 1 pulse, ' + date.getSeconds() +'s:'+ date.getMilliseconds() +'ms');

		this.myAPI.knxWrite("KNXPulseUp", 1, "DPT1"); // Up
		
		setTimeout(function(){
			
			if (!this.staircaseFunc) {
				date = new Date();
				console.log('INFO: KNXPulseUp = 0 pulse, ' + date.getSeconds() +'s:'+ date.getMilliseconds() +'ms');
				this.myAPI.knxWrite("KNXPulseUp", 0, "DPT1");
			} // Up

		}.bind(this), this.pulseLength);			

	}


/****
	 * sendPulseUp is used to send an pulse for up to the bus
	 *
	 */
	sendPulseDown() {

	  var date = new Date();
		console.log('INFO: KNXPulseDown = 1 pulse, ' + date.getSeconds() +'s:'+ date.getMilliseconds() +'ms');

		this.myAPI.knxWrite("KNXPulseDown", 1, "DPT1"); // Down
		
		setTimeout(function(){
			
			if (!this.staircaseFunc) {
				date = new Date();
				console.log('INFO: KNXPulseDown = 0 pulse, ' + date.getSeconds() +'s:'+ date.getMilliseconds() +'ms');
				this.myAPI.knxWrite("KNXPulseDown", 0, "DPT1");
			} // Down

		}.bind(this), this.pulseLength);			

	}

} // class


module.exports=	GarageDoorOpenerAdvanced;

/*****************************************************************************
The config for that should look like this in knx_config.json:


        {
            "DeviceName": "Garagentor",
            "Services": [
                {
                    "ServiceType": "GarageDoorOpener",
                    "Handler": "GarageDoorOpenerAdvanced",
                    "ServiceName": "Garagentor",
                    "Characteristics": [
                        {
                            "Type": "CurrentDoorState"
                        },
                        {
                            "Type": "TargetDoorState"
                        }
                    ],
                    "KNXObjects": [
                        {
                            "Type": "KNXPulseMove",
                            "Set": "2/3/0",
                            "Listen": "2/3/0",
                            "DPT": "DPT1"
                        },
                        {
                            "Type": "KNXDoorClosed",
                            "Listen": "2/3/2",
                            "DPT": "DPT1"
                        },
                        {
                            "Type": "KNXDoorOpen",
                            "Listen": "2/3/3",
                            "Set": "2/3/3",
                            "DPT": "DPT1"
                        }
                    ],
                    "KNXReadRequests": [
                        "2/3/2",
                        "2/3/3"
                    ],
                    "LocalConstants": {
                        "simulateDoorContactMode": "internal",
                        "doorContactPresent": "both",
                        "staircaseFunc": false,
                        "separatePulseUpDown": false,
                        "sensorOn" : 1,
                        "pulseLength": 500, 
                        "doorRunTime": 18500
                    }
                }
            ]
        }

or: 

        {
            "DeviceName": "Schranke",
            "Services": [
                {
                    "ServiceType": "GarageDoorOpener",
                    "Handler": "GarageDoorOpenerAdvanced",
                    "ServiceName": "Schranke",
                    "Characteristics": [
                        {
                            "Type": "CurrentDoorState"
                        },
                        {
                            "Type": "TargetDoorState"
                        }
                    ],
                    "KNXObjects": [
                        {
                            "Type": "KNXPulseUp",
                            "Set": "2/3/0",
                            "Listen": "2/3/0",
                            "DPT": "DPT1"
                        },
                        {
                            "Type": "KNXPulseDown",
                            "Set": "2/3/0",
                            "Listen": "2/3/0",
                            "DPT": "DPT1"
                        },
                        {
                            "Type": "KNXDoorOpen",
                            "Listen": "2/3/2",
                            "DPT": "DPT1"
                        }
                    ],
                    "KNXReadRequests": [
                        "2/3/2",
                        "2/3/3"
                    ],
                    "LocalConstants": {
                        "simulateDoorContactMode": "internal",
                        "doorContactPresent": "open",
                        "staircaseFunc": false,
                        "separatePulseUpDown": true,
                        "sensorOn" : 1,
                        "pulseLength": 500, 
                        "doorRunTime": 18500
                    }
                }
            ]
        }


+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
