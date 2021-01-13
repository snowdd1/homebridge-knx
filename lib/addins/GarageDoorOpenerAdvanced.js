/* 
 * This is a module to handle a Garage Door Opener that is connected to a
 * KNX actuator, staircaseFunc mode can be configured, time can be configured.
 * The engine will switch from Up/Stop/Down in cycle if more than
 * 1 command is received during movement.
 *
 * This addin can operate using one or two contact sensors to detect either KNXDoorClosed 
 * only or both KNXDoorClosed and KNXDoorOpened.
 * In the former case, the KNXDoorOpened sensor can be simulated in two ways, either
 * using the KNX-Bus in between (simulateDoorContactMode == "knx") or only simulating
 * the state internally (simulateDoorContactMode == "internal"), in case you don't want to 
 * use the KNX-Bus in between (default).
 * 
 * The contact sensors are expected to have a value of "sensorOn" when activated. Please use the 
 * "sensorOn"-keyword in knx_config.json (both need to operate the same way).
 *
 */

/* jshint esversion: 6, strict: true, node: true */

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

		// debug-name
		this.debugName = undefined;
	}

	/****
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 *
	 */
	onKNXValueChange(field, oldValue, knxValue) {

		var myCurrentDoorState = this.myAPI.getValue("CurrentDoorState");

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
		this.doorContactPresent = this.myAPI.getLocalConstant("doorContactPresent");

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

		// set debugName
		this.debugName = this.myAPI.getLocalConstant("debugName");

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

		console.log('INFO ' + this.debugName + ': on KNX Value Change(' + field + ", old="+ oldValue + ", new="+ knxValue+ ")");
		console.log('INFO ' + this.debugName + ': myCurrentDoorState = ' + myCurrentDoorState);

		if (field === "KNXPulseMove") {

			if (knxValue === 1) {
				var curDate = new Date();
				var percentageRun;
				if (oldValue !== 1){ // value changed?
					console.log('INFO ' + this.debugName + ': KNXPulseMove detected');


					if (this.timer1 !== undefined){
						clearTimeout(this.timer1);
						this.timer1 = undefined;
						console.log('INFO ' + this.debugName + ': Timer für KNXDoorOpened reset');
					}

					if (myCurrentDoorState === 1){ // IF DOOR IS CLOSED
						// also CurrentDoorState = 1
						console.log('INFO ' + this.debugName + ': CurrentDoorState = 0 CLOSED detected');
						console.log('INFO ' + this.debugName + ': TargetDoorState = 0 OPEN set');


						// Handling the setting here,
						// -> removed this in KNXDoorOpened and KNXDoorClosed-handling
						this.myAPI.setValue("TargetDoorState", 0); // OPEN

						console.log('INFO ' + this.debugName + ': CurrentDoorState = 2 OPENING set');
						this.myAPI.setValue("CurrentDoorState", 2); // OPENING
						this.dateRunStart = new Date();

						this.lastMove = "goingUp";
						console.log('INFO ' + this.debugName + ': lastMove = ' + this.lastMove+ ' set');
						
						if (this.simulateDoorContactMode==="knx" && this.doorContactPresent==="open"){

							console.log('INFO ' + this.debugName + ': this.simulateDoorContactMode: ' + this.simulateDoorContactMode);
							console.log('INFO ' + this.debugName + ': this.doorContactPresent: ' + this.doorContactPresent);
							this.myAPI.knxWrite("KNXDoorOpened", !this.sensorOn, "DPT1"); // Door not open

						}
						else if (this.simulateDoorContactMode==="knx" && this.doorContactPresent==="closed"){
							// simulate "open"-contact on knx

							console.log('INFO ' + this.debugName + ': this.simulateDoorContactMode: ' + this.simulateDoorContactMode);
							console.log('INFO ' + this.debugName + ': this.doorContactPresent: ' + this.doorContactPresent);
							// simulate this even on the bus
							this.myAPI.knxWrite("KNXDoorOpened", !this.sensorOn, "DPT1"); // Door not open

							console.log('INFO ' + this.debugName + ': Timer für KNXDoorOpened started');
							this.timer1 = setTimeout (function () {
													console.log('INFO ' + this.debugName + ': Timeout, simulating Door Open');
													
													console.log('INFO ' + this.debugName + ': KNXDoorOpened = ' + this.sensorOn + ' set');
													this.myAPI.knxWrite("KNXDoorOpened", this.sensorOn, "DPT1"); // Door open
													this.percentageOpen = 1;
													this.dateRunStart = undefined;

							}.bind(this),this.doorRunTime);

						} else if (this.simulateDoorContactMode==="internal" && this.doorContactPresent==="closed"){
							// simulate "open"-contact internally


							console.log('INFO ' + this.debugName + ': this.simulateDoorContactMode: ' + this.simulateDoorContactMode);
							console.log('INFO ' + this.debugName + ': this.doorContactPresent: ' + this.doorContactPresent);
							console.log('INFO ' + this.debugName + ': Timer für KNXDoorOpened started');
							this.timer1 = setTimeout (function () {
													console.log('INFO ' + this.debugName + ': Timeout, simulating Door Open');
													
													console.log('INFO ' + this.debugName + ': CurrentDoorState = 0 OPEN set');
													this.myAPI.setValue("CurrentDoorState", 0); // OPEN
													console.log('INFO ' + this.debugName + ': TargetDoorState = 0 OPEN set');
													this.myAPI.setValue("TargetDoorState", 0); // OPEN
													this.percentageOpen = 1;
													this.dateRunStart = undefined;

													this.lastMove = "Stopped";
													console.log('INFO ' + this.debugName + ': lastMove = ' + this.lastMove+ ' set'); // Door open
							}.bind(this),this.doorRunTime);

						} // simulateDoorContactMode
					} // ("KNXDoorClosed")===1

					else if (myCurrentDoorState===2){ // IF DOOR IS OPENING
						console.log('INFO ' + this.debugName + ': CurrentDoorState = 2 OPENING detected');
						console.log('INFO ' + this.debugName + ': CurrentDoorState = 4 STOPPED set');
						this.myAPI.setValue("CurrentDoorState", 4); // STOPPED

						// calculate percentageOpen

						
						percentageRun = (curDate.getTime() - this.dateRunStart.getTime()) / this.doorRunTime;
						console.log('INFO ' + this.debugName + ': percentageRun = ' + percentageRun);
						console.log('INFO ' + this.debugName + ': percentageOpen before = ' + this.percentageOpen);

						// put min/max 0/1 - just to be sure
						this.percentageOpen = this.percentageOpen + percentageRun;
						console.log('INFO ' + this.debugName + ': percentageOpen = ' + this.percentageOpen);

						if (this.percentageOpen < 0 || this.percentageOpen > 1) {
							if (this.percentageOpen < 0) {
								this.percentageOpen = 0;
							} else {
								this.percentageOpen = 1;
							}
							console.log('WARNING: percentageOpen out of bounds, limiting to percentageOpen = ' + this.percentageOpen);
						}


						// clear timer
						if (this.timer1 !== undefined){
							clearTimeout(this.timer1);
							this.timer1 = undefined;
							console.log('INFO ' + this.debugName + ': Timer für KNXDoorOpened reset');
						}


					} // ("CurrentDoorState")===2 //OPENING

					else if (myCurrentDoorState===3){ // IF DOOR IS CLOSING
						console.log('INFO ' + this.debugName + ': CurrentDoorState = 3 CLOSING detected');
						console.log('INFO ' + this.debugName + ': CurrentDoorState = 4 STOPPED set');
						this.myAPI.setValue("CurrentDoorState", 4); // STOPPED

						// calculate percentageOpen

						percentageRun = (curDate.getTime() - this.dateRunStart.getTime()) / this.doorRunTime;
						console.log('INFO ' + this.debugName + ': percentageRun = ' + percentageRun);
						console.log('INFO ' + this.debugName + ': percentageOpen before = ' + this.percentageOpen);
						this.percentageOpen = this.percentageOpen - percentageRun;
						console.log('INFO ' + this.debugName + ': percentageOpen = ' + this.percentageOpen);

						if (this.percentageOpen < 0 || this.percentageOpen > 1) {
							if (this.percentageOpen < 0) {
								this.percentageOpen = 0;
							} else {
								this.percentageOpen = 1;
							}
							console.log('WARNING: percentageOpen out of bounds, limiting to percentageOpen = ' + this.percentageOpen);
						}

						// clear timer
						if (this.timer1 !== undefined){
							clearTimeout(this.timer1);
							this.timer1 = undefined;
							console.log('INFO ' + this.debugName + ': Timer für KNXDoorOpened reset');
						}

					} // ("CurrentDoorState")===3 //CLOSING

					else if (myCurrentDoorState===4){ // IF DOOR IS STOPPED
						console.log('INFO ' + this.debugName + ': CurrentDoorState = 4 STOPPED detected');

						if (this.lastMove === "goingUp"){

							console.log('INFO ' + this.debugName + ': TargetDoorState = 1 CLOSED set');
							this.myAPI.setValue("TargetDoorState", 1); // CLOSED
							console.log('INFO ' + this.debugName + ': CurrentDoorState = 3 CLOSING set');
							this.myAPI.setValue("CurrentDoorState", 3); // CLOSING
							this.dateRunStart = new Date();

							this.lastMove = "goingDown";
							console.log('INFO ' + this.debugName + ': lastMove = ' + this.lastMove+ ' set');

							// simulate
							if (this.simulateDoorContactMode==="knx" && this.doorContactPresent==="open"){
								// simulate "open"-contact on knx

								console.log('INFO ' + this.debugName + ': this.simulateDoorContactMode: ' + this.simulateDoorContactMode);
								console.log('INFO ' + this.debugName + ': this.doorContactPresent: ' + this.doorContactPresent);

								console.log('INFO ' + this.debugName + ': Timer für KNXDoorClosed started');
								this.timer1 = setTimeout (function () {

														console.log('INFO ' + this.debugName + ': Timeout, simulating Door Closed');
														console.log('INFO ' + this.debugName + ': KNXDoorClosed = ' + this.sensorOn + ' set');
														this.myAPI.knxWrite("KNXDoorClosed", this.sensorOn, "DPT1"); // Door open

														// setting HK-state and percentage is done in KNXDoorClosed

								}.bind(this),this.doorRunTime*(this.percentageOpen));

							} else if (this.simulateDoorContactMode==="internal" && this.doorContactPresent==="open"){
								// simulate "open"-contact internally

								console.log('INFO ' + this.debugName + ': this.simulateDoorContactMode: ' + this.simulateDoorContactMode);
								console.log('INFO ' + this.debugName + ': this.doorContactPresent: ' + this.doorContactPresent);

								console.log('INFO ' + this.debugName + ': Timer für KNXDoorClosed started');
								this.timer1 = setTimeout (function () {

														console.log('INFO ' + this.debugName + ': Timeout, simulating Door Closed');
														console.log('INFO ' + this.debugName + ': KNXDoorClosed = ' + this.sensorOn + ' set');
														this.myAPI.setValue("CurrentDoorState", 1); // Closed
														console.log('INFO ' + this.debugName + ': TargetDoorState = ' + this.sensorOn + ' set');
														this.myAPI.setValue("TargetDoorState", 1); // Closed
														
														this.percentageOpen = 1;
														this.dateRunStart = undefined;

														this.lastMove = "Stopped";
														console.log('INFO ' + this.debugName + ': lastMove = ' + this.lastMove+ ' set'); // Door open

								}.bind(this),this.doorRunTime*(this.percentageOpen));

							} // simulateDoorContactMode

						}
						else if (this.lastMove === "goingDown"){

							console.log('INFO ' + this.debugName + ': TargetDoorState = 1 OPEN set');
							this.myAPI.setValue("TargetDoorState", 0); // OPEN
							console.log('INFO ' + this.debugName + ': CurrentDoorState = 3 OPENING set');
							this.myAPI.setValue("CurrentDoorState", 2); // OPENING
							this.dateRunStart = new Date();
							
							this.lastMove = "goingUp";
							console.log('INFO ' + this.debugName + ': lastMove = ' + this.lastMove+ ' set');

							// simulate
							if (this.simulateDoorContactMode==="knx" && this.doorContactPresent==="closed"){
								// simulate "open"-contact on knx

								console.log('INFO ' + this.debugName + ': this.simulateDoorContactMode: ' + this.simulateDoorContactMode);
								console.log('INFO ' + this.debugName + ': this.doorContactPresent: ' + this.doorContactPresent);

								console.log('INFO ' + this.debugName + ': Timer für KNXDoorOpened started');
								this.timer1 = setTimeout (function () {
														console.log('INFO ' + this.debugName + ': Timeout, simulating Door Open');
														
														console.log('INFO ' + this.debugName + ': KNXDoorOpened = ' + this.sensorOn + ' set');
														this.myAPI.knxWrite("KNXDoorOpened", this.sensorOn, "DPT1"); // Door open

														// setting HK-state and percentage is done in KNXDoorClosed

								}.bind(this),this.doorRunTime*(1-this.percentageOpen));

							} else if (this.simulateDoorContactMode==="internal" && this.doorContactPresent==="closed"){
								// simulate "open"-contact internally


								console.log('INFO ' + this.debugName + ': this.simulateDoorContactMode: ' + this.simulateDoorContactMode);
								console.log('INFO ' + this.debugName + ': this.doorContactPresent: ' + this.doorContactPresent);
								console.log('INFO ' + this.debugName + ': Timer für KNXDoorOpened started');
								this.timer1 = setTimeout (function () {

														console.log('INFO ' + this.debugName + ': Timeout, simulating Door Open');
														
														console.log('INFO ' + this.debugName + ': CurrentDoorState = 0 OPEN set');
														this.myAPI.setValue("CurrentDoorState", 0); // OPEN
														console.log('INFO ' + this.debugName + ': TargetDoorState = 0 OPEN set');
														this.myAPI.setValue("TargetDoorState", 0); // OPEN
														this.percentageOpen = 1;

														this.lastMove = "Stopped";
														console.log('INFO ' + this.debugName + ': lastMove = ' + this.lastMove+ ' set'); // Door open

							}.bind(this),this.doorRunTime*(1-this.percentageOpen));

							} // simulateDoorContactMode

						}
					} // ("CurrentDoorState")===4 // STOPPED

					else if (myCurrentDoorState===0){ // IF DOOR IS OPEN
						console.log('INFO ' + this.debugName + ': CurrentDoorState = 0 OPEN detected');
						console.log('INFO ' + this.debugName + ': TargetDoorState = 1 CLOSED set');


						// Handling the setting here,
						// -> removed this in KNXDoorOpened and KNXDoorClosed-handling
						this.myAPI.setValue("TargetDoorState", 1); // CLOSED
						console.log('INFO ' + this.debugName + ': CurrentDoorState = 3 CLOSING set');

						this.myAPI.setValue("CurrentDoorState", 3); // CLOSING
						this.dateRunStart = new Date();

						this.lastMove = "goingDown";
						console.log('INFO ' + this.debugName + ': lastMove = ' + this.lastMove+ ' set');

						if (this.simulateDoorContactMode==="knx" && this.doorContactPresent==="closed"){
							console.log('INFO ' + this.debugName + ': this.simulateDoorContactMode: ' + this.simulateDoorContactMode);
							console.log('INFO ' + this.debugName + ': this.doorContactPresent: ' + this.doorContactPresent);
							this.myAPI.knxWrite("KNXDoorOpened", !this.sensorOn, "DPT1"); // Door not open
						}
						else if (this.simulateDoorContactMode==="knx" && this.doorContactPresent==="open"){
							// simulate the "closed contact" on knx

							console.log('INFO ' + this.debugName + ': this.simulateDoorContactMode: ' + this.simulateDoorContactMode);
							console.log('INFO ' + this.debugName + ': this.doorContactPresent: ' + this.doorContactPresent);

							// simulate this even on the bus
							this.myAPI.knxWrite("KNXDoorClosed", !this.sensorOn, "DPT1"); // Door not open

							console.log('INFO ' + this.debugName + ': Timer für KNXDoorClosed started');
							this.timer1 = setTimeout (function () {
													console.log('INFO ' + this.debugName + ': Timeout, simulating Door Closed');
													
													console.log('INFO ' + this.debugName + ': KNXDoorClosed = ' + this.sensorOn + ' set');
													this.myAPI.knxWrite("KNXDoorClosed", this.sensorOn, "DPT1"); // Door open
													this.percentageOpen = 1;
													this.dateRunStart = undefined;

							}.bind(this),this.doorRunTime);

						} else if (this.simulateDoorContactMode==="internal" && this.doorContactPresent==="open"){
							// simulate the "closed contact" internally

							console.log('INFO ' + this.debugName + ': this.simulateDoorContactMode: ' + this.simulateDoorContactMode);
							console.log('INFO ' + this.debugName + ': this.doorContactPresent: ' + this.doorContactPresent);

							console.log('INFO ' + this.debugName + ': Timer für KNXDoorClosed started');
							this.timer1 = setTimeout (function () {
													console.log('INFO ' + this.debugName + ': Timeout, simulating Door Closed');
													
													console.log('INFO ' + this.debugName + ': CurrentDoorState = 1 CLOSED set');
													this.myAPI.setValue("CurrentDoorState", 1); // Closed
													console.log('INFO ' + this.debugName + ': TargetDoorState = 1 CLOSED set');
													this.myAPI.setValue("TargetDoorState", 1); // Closed
													this.percentageOpen = 0;
													this.dateRunStart = undefined;

													this.lastMove = "Stopped";
													console.log('INFO ' + this.debugName + ': lastMove = ' + this.lastMove+ ' set'); // Door closed
							}.bind(this),this.doorRunTime);

						} // simulateDoorContactMode


					} // ("CurrentDoorState")===0 // OPEN

				} // oldValue!==1)
			} // knxValue===1
		} // KNXPulseMove


		if (field === "KNXPulseUp") {

			if (knxValue === 1 && oldValue !== 1) {
					
				this.myAPI.setValue("TargetDoorState", 0); // OPEN
				this.myAPI.setValue("CurrentDoorState", 2); // OPENING
					
				// calculate percentageOpen
				var curDate = new Date();
				var percentageRun = undefined;
				if(!this.dateRunStart) {
					this.dateRunStart = new Date();
				}
				
				percentageRun = (curDate.getTime() - this.dateRunStart.getTime()) / this.doorRunTime;
				console.log('INFO ' + this.debugName + ': percentageRun = ' + percentageRun);
				// has been going down before  -> '-'
				console.log('INFO ' + this.debugName + ': percentageOpen before = ' + this.percentageOpen);
				this.percentageOpen = this.percentageOpen - percentageRun;
				console.log('INFO ' + this.debugName + ': percentageOpen = ' + this.percentageOpen);


				if (this.percentageOpen < 0 || this.percentageOpen > 1) {
					if (this.percentageOpen < 0) {
						this.percentageOpen = 0;
					} else {
						this.percentageOpen = 1;
					}
					console.log('WARNING: percentageOpen out of bounds, limiting to percentageOpen = ' + this.percentageOpen);
				}

				// simulate
				if (this.simulateDoorContactMode==="knx" && this.doorContactPresent==="closed"){
					// simulate "open"-contact on knx

					console.log('INFO ' + this.debugName + ': this.simulateDoorContactMode: ' + this.simulateDoorContactMode);
					console.log('INFO ' + this.debugName + ': this.doorContactPresent: ' + this.doorContactPresent);

					console.log('INFO ' + this.debugName + ': Timer für KNXDoorClosed started, timer to expire in = ' + this.doorRunTime*(1-this.percentageOpen));
					this.timer1 = setTimeout (function () {
											console.log('INFO ' + this.debugName + ': Timeout, simulating Door Open');
											
											console.log('INFO ' + this.debugName + ': KNXDoorOpened = ' + this.sensorOn + ' set');
											this.myAPI.knxWrite("KNXDoorOpened", this.sensorOn, "DPT1"); // Door open

											// setting HK-state and percentage is done in KNXDoorClosed

					}.bind(this),this.doorRunTime*(1-this.percentageOpen));
				} else if (this.simulateDoorContactMode==="internal" && this.doorContactPresent==="closed"){
					// simulate "open"-contact internally


					console.log('INFO ' + this.debugName + ': this.simulateDoorContactMode: ' + this.simulateDoorContactMode);
					console.log('INFO ' + this.debugName + ': this.doorContactPresent: ' + this.doorContactPresent);

					console.log('INFO ' + this.debugName + ': Timer für KNXDoorClosed started, timer to expire in = ' + this.doorRunTime*(1-this.percentageOpen));
					this.timer1 = setTimeout (function () {

											console.log('INFO ' + this.debugName + ': Timeout, simulating Door Open');
											
											console.log('INFO ' + this.debugName + ': CurrentDoorState = 0 OPEN set');
											this.myAPI.setValue("CurrentDoorState", 0); // OPEN
											console.log('INFO ' + this.debugName + ': TargetDoorState = 0 OPEN set');
											this.myAPI.setValue("TargetDoorState", 0); // OPEN
											this.percentageOpen = 1;
											this.dateRunStart = undefined;

											this.lastMove = "Stopped";
											console.log('INFO ' + this.debugName + ': lastMove = ' + this.lastMove+ ' set'); // Door open

					}.bind(this),this.doorRunTime*(1-this.percentageOpen));
				}
			}
		} // KNXPulseUp


		if (field === "KNXPulseDown") {

			if (knxValue === 1 && oldValue !== 1) {
					
				this.myAPI.setValue("TargetDoorState", 1); // CLOSED
				this.myAPI.setValue("CurrentDoorState", 3); // CLOSING

				// calculate percentageOpen
				var curDate = new Date();
				var percentageRun = undefined;
				if(!this.dateRunStart) {
					this.dateRunStart = new Date();
				}
				
				percentageRun = (curDate.getTime() - this.dateRunStart.getTime()) / this.doorRunTime;
				console.log('INFO ' + this.debugName + ': percentageRun = ' + percentageRun);
				console.log('INFO ' + this.debugName + ': percentageOpen before = ' + this.percentageOpen);
				// has been going donw before -> '+'
				this.percentageOpen = this.percentageOpen + percentageRun;
				console.log('INFO ' + this.debugName + ': percentageOpen = ' + this.percentageOpen);


				if (this.percentageOpen < 0 || this.percentageOpen > 1) {
					if (this.percentageOpen < 0) {
						this.percentageOpen = 0;
					} else {
						this.percentageOpen = 1;
					}
					console.log('WARNING: percentageOpen out of bounds, limiting to percentageOpen = ' + this.percentageOpen);
				}

				// INFO: It could happen that this timer is set twice in  case KNXDoorOpened get's in first,
				// but that shouldn't matter
						
				// simulate - put this to a function?
				if (this.simulateDoorContactMode==="knx" && this.doorContactPresent==="open"){
					// simulate the "closed contact" on knx

					console.log('INFO ' + this.debugName + ': this.simulateDoorContactMode: ' + this.simulateDoorContactMode);
					console.log('INFO ' + this.debugName + ': this.doorContactPresent: ' + this.doorContactPresent);

					// simulate this even on the bus
					this.myAPI.knxWrite("KNXDoorClosed", !this.sensorOn, "DPT1"); // Door not open

					console.log('INFO ' + this.debugName + ': Timer für KNXDoorClosed started, timer to expire in = ' + this.doorRunTime*(this.percentageOpen));
					this.timer1 = setTimeout (function () {
											console.log('INFO ' + this.debugName + ': Timeout, simulating Door Closed');
											
											console.log('INFO ' + this.debugName + ': KNXDoorClosed = ' + this.sensorOn + ' set');
											this.myAPI.knxWrite("KNXDoorClosed", this.sensorOn, "DPT1"); // Door open
											this.percentageOpen = 1;
											this.dateRunStart = undefined;

					}.bind(this),this.doorRunTime*(this.percentageOpen));

				} else if (this.simulateDoorContactMode==="internal" && this.doorContactPresent==="open"){
					// simulate the "closed contact" internally

					console.log('INFO ' + this.debugName + ': this.simulateDoorContactMode: ' + this.simulateDoorContactMode);
					console.log('INFO ' + this.debugName + ': this.doorContactPresent: ' + this.doorContactPresent);

					console.log('INFO ' + this.debugName + ': Timer für KNXDoorClosed started, timer to expire in = ' + this.doorRunTime*(this.percentageOpen));
					this.timer1 = setTimeout (function () {
											console.log('INFO ' + this.debugName + ': Timeout, simulating Door Closed');
											
											console.log('INFO ' + this.debugName + ': CurrentDoorState = 1 CLOSED set');
											this.myAPI.setValue("CurrentDoorState", 1); // Closed
											console.log('INFO ' + this.debugName + ': TargetDoorState = 1 CLOSED set');
											this.myAPI.setValue("TargetDoorState", 1); // Closed
											this.percentageOpen = 0;
											this.dateRunStart = undefined;

											this.lastMove = "Stopped";
											console.log('INFO ' + this.debugName + ': lastMove = ' + this.lastMove+ ' set'); // Door closed
					}.bind(this),this.doorRunTime*(this.percentageOpen));
				}

			}
		} // KNXPulseDown


		if (field==="KNXDoorClosed") {

			console.log('INFO ' + this.debugName + ': In if-case -> field===KNXDoorClosed');
			console.log('INFO ' + this.debugName + ': knxValue: ' + knxValue);
			console.log('INFO ' + this.debugName + ': oldValue: ' + oldValue);
			
			// value changed?
			if (knxValue === this.sensorOn) {
				
				console.log('INFO ' + this.debugName + ': In if-case -> knxValue changed and not null');

				this.percentageOpen = 0;
				this.dateRunStart = undefined;

				// clear timer
				if (this.timer1 !== undefined){
					clearTimeout(this.timer1);
					this.timer1 = undefined;
					console.log('INFO ' + this.debugName + ': Timer für KNXDoorClosed reset');
				}

				this.myAPI.setValue("CurrentDoorState", 1); // CLOSED
				this.myAPI.setValue("TargetDoorState", 1); // CLOSED

				console.log('INFO ' + this.debugName + ': CurrentDoorState = 1 CLOSED set');

				if (oldValue !== null){

					console.log('INFO ' + this.debugName + ': KNXDoorClosed detected');

				} else { // Init run

					console.log('INFO ' + this.debugName + ': Init Garage Door HK Status');

					if (this.simulateDoorContactMode==="knx" && this.doorContactPresent==="closed"){
						// simulate "open"-contact
						this.myAPI.knxWrite("KNXDoorOpened", !this.sensorOn, "DPT1");
					}

				} // Init run

				this.lastMove = "Stopped";
				console.log('INFO ' + this.debugName + ': lastMove = ' + this.lastMove+ ' set');

			} // (knxValue===0)
			else if (knxValue !== this.sensorOn) {

				if (oldValue === this.sensorOn){ // oldValue = sensorOn

					console.log('INFO ' + this.debugName + ': KNXDoorClosed = false detected');

					// For automatically closing doors (e.g. a barrier) there is not necessarily a Pulse on the bus for
					// closing. That is why, in case the timer is not running already, it is started.
					if (!this.timer1) {
						if (this.simulateDoorContactMode==="knx" && this.doorContactPresent==="closed"){
							// simulate the "closed contact" on knx

							console.log('INFO ' + this.debugName + ': this.simulateDoorContactMode: ' + this.simulateDoorContactMode);
							console.log('INFO ' + this.debugName + ': this.doorContactPresent: ' + this.doorContactPresent);

							// simulate this even on the bus
							this.myAPI.knxWrite("KNXDoorOpened", !this.sensorOn, "DPT1"); // Door not closed

							console.log('INFO ' + this.debugName + ': Timer für KNXDoorOpened started, timer to expire in = ' + this.doorRunTime);
							this.timer1 = setTimeout (function () {
													console.log('INFO ' + this.debugName + ': Timeout, simulating Door Opened');
													
													console.log('INFO ' + this.debugName + ': KNXDoorOpened = ' + this.sensorOn + ' set');
													this.myAPI.knxWrite("KNXDoorOpened", this.sensorOn, "DPT1"); // Door open
													this.percentageOpen = 1;
													this.dateRunStart = undefined;

							}.bind(this),this.doorRunTime);

						} else if (this.simulateDoorContactMode==="internal" && this.doorContactPresent==="closed"){
							// simulate the "closed contact" internally

							console.log('INFO ' + this.debugName + ': this.simulateDoorContactMode: ' + this.simulateDoorContactMode);
							console.log('INFO ' + this.debugName + ': this.doorContactPresent: ' + this.doorContactPresent);

							console.log('INFO ' + this.debugName + ': Timer für KNXDoorOpened started, timer to expire in = ' + this.doorRunTime);
							this.timer1 = setTimeout (function () {
													console.log('INFO ' + this.debugName + ': Timeout, simulating Door Open');
													
													console.log('INFO ' + this.debugName + ': CurrentDoorState = 1 OPEN set');
													this.myAPI.setValue("CurrentDoorState", 0); // Open
													console.log('INFO ' + this.debugName + ': TargetDoorState = 1 OPEN set');
													this.myAPI.setValue("TargetDoorState", 0); // Open
													this.percentageOpen = 1;
													this.dateRunStart = undefined;

													this.lastMove = "Stopped";
													console.log('INFO ' + this.debugName + ': lastMove = ' + this.lastMove+ ' set'); // Door open
							}.bind(this),this.doorRunTime);
						}
					}else {
						console.log('INFO ' + this.debugName + ': KNXDoorClosed = timer running detected');
					}

				} else if (oldValue === null) { // Init run

					console.log('INFO ' + this.debugName + ': Init Garage Door HK Status KNXDoorClosed = false');

					// Init to closed as we don't know better and that's the best guess
					this.myAPI.setValue("CurrentDoorState", 0); // OPEN
					this.myAPI.setValue("TargetDoorState", 0); // OPEN
					this.percentageOpen = 1;

					if (this.simulateDoorContactMode==="knx" && this.doorContactPresent==="open"){
						// simulate "closed"-contact
						this.myAPI.knxWrite("KNXDoorOpened", this.sensorOn, "DPT1");
					}

				} // Init run

				// This was probably the culprit for receiving two push notifications
				// it should be ok to just have the TargetDoorState set on receiving a pulse
				// this.myAPI.setValue("TargetDoorState", 0); // OPENED

			}
		} // KNXDoorClosed


// TODO: Door is open, gets closed automatically by someone going through
// -> TargetDoorState needs to be set.


		if (field==="KNXDoorOpened") {
			
			console.log('INFO ' + this.debugName + ': In if-case -> field===KNXDoorOpened');
			console.log('INFO ' + this.debugName + ': knxValue: ' + knxValue);
			console.log('INFO ' + this.debugName + ': oldValue: ' + oldValue);

			// value changed?
			if (knxValue === this.sensorOn) {
				// Status 0 (open) detected

				this.percentageOpen = 1;
				this.dateRunStart = undefined;

				// clear timer
				if (this.timer1 !== undefined){
					clearTimeout(this.timer1);
					this.timer1 = undefined;
					console.log('INFO ' + this.debugName + ': Timer für KNXDoorOpened reset');
				}

				this.myAPI.setValue("CurrentDoorState", 0); // OPEN
				this.myAPI.setValue("TargetDoorState", 0); // OPEN

				console.log('INFO ' + this.debugName + ': CurrentDoorState = 0 OPEN set');

				if (oldValue !== null){

					console.log('INFO ' + this.debugName + ': KNXDoorOpened detected');

				} else { // Init run

					console.log('INFO ' + this.debugName + ': Init Garage Door HK Status KNXDoorOpened = true');

					if (this.simulateDoorContactMode==="knx" && this.doorContactPresent==="open"){
						// simulate "closed"-contact
						this.myAPI.knxWrite("KNXDoorClosed", !this.sensorOn, "DPT1");
					}

				} // Init run

				this.lastMove = "Stopped";
				console.log('INFO ' + this.debugName + ': lastMove = ' + this.lastMove+ ' set');

			} // field==="KNXDoorOpened = 0
			else if (knxValue !== this.sensorOn) {

				if (oldValue === this.sensorOn){ // oldValue == sensorOn

					console.log('INFO ' + this.debugName + ': KNXDoorOpened = false detected');
					
					// For automatically closing doors (e.g. a barrier) there is not necessarily a Pulse on the bus for
					// closing. That is why, in case the timer is not running already, it is started.

					if (!this.timer1) {
						if (this.simulateDoorContactMode==="knx" && this.doorContactPresent==="open"){
							// simulate the "closed contact" on knx

							console.log('INFO ' + this.debugName + ': this.simulateDoorContactMode: ' + this.simulateDoorContactMode);
							console.log('INFO ' + this.debugName + ': this.doorContactPresent: ' + this.doorContactPresent);

							// simulate this even on the bus
							this.myAPI.knxWrite("KNXDoorClosed", !this.sensorOn, "DPT1"); // Door not open

							console.log('INFO ' + this.debugName + ': Timer für KNXDoorClosed started, timer to expire in = ' + this.doorRunTime);
							this.timer1 = setTimeout (function () {
													console.log('INFO ' + this.debugName + ': Timeout, simulating Door Closed');
													
													console.log('INFO ' + this.debugName + ': KNXDoorClosed = ' + this.sensorOn + ' set');
													this.myAPI.knxWrite("KNXDoorClosed", this.sensorOn, "DPT1"); // Door open
													this.percentageOpen = 0;
													this.dateRunStart = undefined;

							}.bind(this),this.doorRunTime);

						} else if (this.simulateDoorContactMode==="internal" && this.doorContactPresent==="open"){
							// simulate the "closed contact" internally

							console.log('INFO ' + this.debugName + ': this.simulateDoorContactMode: ' + this.simulateDoorContactMode);
							console.log('INFO ' + this.debugName + ': this.doorContactPresent: ' + this.doorContactPresent);

							console.log('INFO ' + this.debugName + ': Timer für KNXDoorClosed started, timer to expire in = ' + this.doorRunTime);
							this.timer1 = setTimeout (function () {
													console.log('INFO ' + this.debugName + ': Timeout, simulating Door Closed');
													
													console.log('INFO ' + this.debugName + ': CurrentDoorState = 1 CLOSED set');
													this.myAPI.setValue("CurrentDoorState", 1); // Closed
													console.log('INFO ' + this.debugName + ': TargetDoorState = 1 CLOSED set');
													this.myAPI.setValue("TargetDoorState", 1); // Closed
													
													this.percentageOpen = 0;
													this.dateRunStart = undefined;

													this.lastMove = "Stopped";
													console.log('INFO ' + this.debugName + ': lastMove = ' + this.lastMove+ ' set'); // Door closed
							}.bind(this),this.doorRunTime);
						}
					} else {
						console.log('INFO ' + this.debugName + ': KNXDoorOpened = timer running detected');
					}

				} else if (oldValue === null) { // Init run

					console.log('INFO ' + this.debugName + ': Init Garage Door HK Status KNXDoorOpened = false');

					// Init to closed as we don't know better and that's the best guess
					this.myAPI.setValue("CurrentDoorState", 1); // CLOSED
					this.myAPI.setValue("TargetDoorState", 1); // CLOSED
					this.percentageOpen = 0;

					if (this.simulateDoorContactMode==="knx" && this.doorContactPresent==="open"){
						// simulate "closed"-contact
						this.myAPI.knxWrite("KNXDoorClosed", this.sensorOn, "DPT1");
					}

				} // Init run

				// This was probably the culprit for receiving two push notifications
				// it should be ok to just have the TargetDoorState set on receiving a pulse
				// this.myAPI.setValue("TargetDoorState", 1); // CLOSED
			}
		} // KNXDoorOpened

	} // onKNXValueChange

	/****
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 *
	 */
	onHKValueChange(field, oldValue, newValue) {
		
		var myCurrentDoorState = this.myAPI.getValue("CurrentDoorState");

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
		this.doorContactPresent = this.myAPI.getLocalConstant("doorContactPresent");

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

		// set debugName
		this.debugName = this.myAPI.getLocalConstant("debugName");


		console.log('INFO ' + this.debugName + ': on HK Value Change (' + field + ", old="+ oldValue + ", new="+ newValue + ")");
		console.log('INFO ' + this.debugName + ': myCurrentDoorState = ' + myCurrentDoorState);


		if (field === "TargetDoorState") {
			// The value property of TargetDoorState must be one of the following:
			// Characteristic.TargetDoorState.OPEN = 0;
			// Characteristic.TargetDoorState.CLOSED = 1;

			if (newValue === 0){ // OPEN

				if (this.separatePulseUpDown) {
					if (myCurrentDoorState !== 0){ // not equal open
						this.sendPulseUp();
					} else {
						console.log('INFO ' + this.debugName + ': CurrentDoorState = 0 OPEN already, not sending PulseUp');
					}

				} else { // only up/stop/down - 1 type of pulse available

					if (myCurrentDoorState===0){ // IF DOOR IS OPEN
						console.log('INFO ' + this.debugName + ': CurrentDoorState = 2 OPEN detected');
						// Do nothing, opening already
					} // ("CurrentDoorState")===2 //OPENING
					else if (myCurrentDoorState===2){ // IF DOOR IS OPENING
						console.log('INFO ' + this.debugName + ': CurrentDoorState = 2 OPENING detected');
						// Do nothing, opening already
					}
					else if (myCurrentDoorState===1){ // IF DOOR IS CLOSED
						// send pulse for Opening
						console.log('INFO ' + this.debugName + ': Calling this.sendPulse()');
						this.sendPulse(1);

					} // ("CurrentDoorState")===0 // CLOSED
					else if (myCurrentDoorState===3){ // IF DOOR IS CLOSING
						console.log('INFO ' + this.debugName + ': CurrentDoorState = 3 CLOSING detected');
						// Send pulsees for Stop - Opening
						this.sendPulse(2);
						
						// CurrentDoorState is taken care in KNXValueChange

					} // ("CurrentDoorState")===2 //OPENING

					else if (myCurrentDoorState===4){ // IF DOOR IS STOPPED
						console.log('INFO ' + this.debugName + ': CurrentDoorState = 4 STOPPED detected');

						// Door is stopped (not closed or opened and was goingUp)
						if (this.lastMove === "goingUp"){
							// send pulsees for Down - Stop - Opening
							console.log('INFO ' + this.debugName + ': goingUp, Calling this.sendPulse(3)');
							this.sendPulse(3);

							// CurrentDoorState is taken care in KNXValueChange
						}
						// Door is stopped (not closed or opened and was goingDown)
						else if (this.lastMove === "goingDown"){
							// send pulse for Opening
							console.log('INFO ' + this.debugName + ': goingDown, Calling this.sendPulse(1)');
							this.sendPulse(1);

							// CurrentDoorState is taken care in KNXValueChange
						}
					} // ("CurrentDoorState")===4 // STOPPED

				}
			} // TargetDoorState = OPEN

			if (newValue === 1){ // CLOSE


				if (this.separatePulseUpDown) {
					if (myCurrentDoorState !== 1){ // not equal CLOSED
						this.sendPulseDown();
					} else {
						console.log('INFO ' + this.debugName + ': CurrentDoorState = 1 CLOSED already, not sending PulseDown');
					}
				} else { // only up/stop/down - 1 type of pulse available

					if (myCurrentDoorState===1){ // IF DOOR IS CLOSED
						console.log('INFO ' + this.debugName + ': CurrentDoorState = 2 CLOSED detected');
						// Do nothing, closing already
					} // ("CurrentDoorState")===0 // CLOSED
					else if (myCurrentDoorState===3){ // IF DOOR IS CLOSING
						console.log('INFO ' + this.debugName + ': CurrentDoorState = 2 CLOSING detected');
						// Do nothing, closing already
					} // ("CurrentDoorState")===2 //OPENING
					else if (myCurrentDoorState===0){ // IF DOOR IS OPEN
						// send pulse for Closing
						this.sendPulse(1);

					} // ("CurrentDoorState")===0 // OPEN
					else if (myCurrentDoorState===2){ // IF DOOR IS OPENING
						console.log('INFO ' + this.debugName + ': CurrentDoorState = 3 OPENING detected');
						// Send pulses for Stop - Opening
						this.sendPulse(2);

						// CurrentDoorState is taken care in KNXValueChange

					} // ("CurrentDoorState")===2 //OPENING

					else if (myCurrentDoorState===4){ // IF DOOR IS STOPPED
						console.log('INFO ' + this.debugName + ': CurrentDoorState = 4 STOPPED detected');

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
	  
	  console.log('INFO ' + this.debugName + ': sendPulse called. Number of pulses = ' + numPulses);

	  var date = new Date();


		if (numPulses === 1){
			date = new Date();
			console.log('INFO ' + this.debugName + ': KNXPulseMove = 1 first pulse - calling Up/Stop/Down, ' + date.getSeconds() +'s:'+ date.getMilliseconds() +'ms');
			this.myAPI.knxWrite("KNXPulseMove", 1, "DPT1"); // Up/Stop/Down
			setTimeout(function(){
				date = new Date();
				console.log('INFO ' + this.debugName + ': KNXPulseMove = 0 first pulse - calling Up/Stop/Down, ' + date.getSeconds() +'s:'+ date.getMilliseconds() +'ms');
				if (!this.staircaseFunc) {this.myAPI.knxWrite("KNXPulseMove", 0, "DPT1");} // Up/Stop/Down
			}.bind(this), this.pulseLength);			
		} else if (numPulses === 2){
			date = new Date();
			console.log('INFO ' + this.debugName + ': KNXPulseMove = 1 first pulse - calling Up/Stop/Down, ' + date.getSeconds() +'s:'+ date.getMilliseconds() +'ms');
			this.myAPI.knxWrite("KNXPulseMove", 1, "DPT1"); // Up/Stop/Down
			setTimeout(function(){
				date = new Date();
				console.log('INFO ' + this.debugName + ': KNXPulseMove = 0 first pulse - calling Up/Stop/Down, ' + date.getSeconds() +'s:'+ date.getMilliseconds() +'ms');
				if (!this.staircaseFunc) {this.myAPI.knxWrite("KNXPulseMove", 0, "DPT1");} // Up/Stop/Down
				setTimeout(function(){
					date = new Date();
					console.log('INFO ' + this.debugName + ': KNXPulseMove = 1 second pulse - calling Up/Stop/Down, ' + date.getSeconds() +'s:'+ date.getMilliseconds() +'ms');
					this.myAPI.knxWrite("KNXPulseMove", 1, "DPT1"); // Up/Stop/Down
					setTimeout(function(){
						date = new Date();
						console.log('INFO ' + this.debugName + ': KNXPulseMove = 0 second pulse - calling Up/Stop/Down, ' + date.getSeconds() +'s:'+ date.getMilliseconds() +'ms');
						if (!this.staircaseFunc) {this.myAPI.knxWrite("KNXPulseMove", 0, "DPT1");} // Up/Stop/Down
					}.bind(this), this.pulseLength);			
				}.bind(this), this.pulseLength);			
			}.bind(this), this.pulseLength);			
		} else if (numPulses === 3){
			date = new Date();
			console.log('INFO ' + this.debugName + ': KNXPulseMove = 1 first pulse - calling Up/Stop/Down, ' + date.getSeconds() +'s:'+ date.getMilliseconds() +'ms');
			this.myAPI.knxWrite("KNXPulseMove", 1, "DPT1"); // Up/Stop/Down
			setTimeout(function(){
				date = new Date();
				console.log('INFO ' + this.debugName + ': KNXPulseMove = 0 first pulse - calling Up/Stop/Down, ' + date.getSeconds() +'s:'+ date.getMilliseconds() +'ms');
				if (!this.staircaseFunc) {this.myAPI.knxWrite("KNXPulseMove", 0, "DPT1");} // Up/Stop/Down
				setTimeout(function(){
					date = new Date();
					console.log('INFO ' + this.debugName + ': KNXPulseMove = 1 second pulse - calling Up/Stop/Down, ' + date.getSeconds() +'s:'+ date.getMilliseconds() +'ms');
					this.myAPI.knxWrite("KNXPulseMove", 1, "DPT1"); // Up/Stop/Down
					setTimeout(function(){
						date = new Date();
						console.log('INFO ' + this.debugName + ': KNXPulseMove = 0 second pulse - calling Up/Stop/Down, ' + date.getSeconds() +'s:'+ date.getMilliseconds() +'ms');
						if (!this.staircaseFunc) {this.myAPI.knxWrite("KNXPulseMove", 0, "DPT1");} // Up/Stop/Down
						setTimeout(function(){
							date = new Date();
							console.log('INFO ' + this.debugName + ': KNXPulseMove = 1 third pulse - calling Up/Stop/Down, ' + date.getSeconds() +'s:'+ date.getMilliseconds() +'ms');
							this.myAPI.knxWrite("KNXPulseMove", 1, "DPT1"); // Up/Stop/Down
							setTimeout(function(){
								date = new Date();
								console.log('INFO ' + this.debugName + ': KNXPulseMove = 0 third pulse - calling Up/Stop/Down, ' + date.getSeconds() +'s:'+ date.getMilliseconds() +'ms');
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
		console.log('INFO ' + this.debugName + ': KNXPulseUp = 1 pulse, ' + date.getSeconds() +'s:'+ date.getMilliseconds() +'ms');

		this.myAPI.knxWrite("KNXPulseUp", 1, "DPT1"); // Up
		
		setTimeout(function(){
			
			if (!this.staircaseFunc) {
				date = new Date();
				console.log('INFO ' + this.debugName + ': KNXPulseUp = 0 pulse, ' + date.getSeconds() +'s:'+ date.getMilliseconds() +'ms');
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
		console.log('INFO ' + this.debugName + ': KNXPulseDown = 1 pulse, ' + date.getSeconds() +'s:'+ date.getMilliseconds() +'ms');

		this.myAPI.knxWrite("KNXPulseDown", 1, "DPT1"); // Down
		
		setTimeout(function(){
			
			if (!this.staircaseFunc) {
				date = new Date();
				console.log('INFO ' + this.debugName + ': KNXPulseDown = 0 pulse, ' + date.getSeconds() +'s:'+ date.getMilliseconds() +'ms');
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
                            "Type": "KNXDoorOpened",
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
                            "Type": "KNXDoorOpened",
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
