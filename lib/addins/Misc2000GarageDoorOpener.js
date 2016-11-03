/* module - to handle a Hörmann Garage Door Opener that is connected to a
 * KNX Aktor (in Treppenhaus mode) that switch for 1 second to ON to send
 * the engine of the door a move command"
 * The Hörmann engine will switch from Up/Stop/Down in cycle if more than
 * 1 command is received during movement
 * Also 2 contact sensor needed: KNX_Garagentor_zu and KNX_Garagentor_auf
 * the contact sensors will need to have a 0 value when closed
 *
 * Version 2 can also simulate the 2nd contact sensor
 * simulate 2nd contact sensor (KNX_Garagentor_auf) by software/timer
 * if you want to simulate it set it to true if not to false
 * And set GarageDoorRunTime to the time the door needs from closed to open

 * handler coded by misc2000; M. Schmitt
 * Version 2.2
 */
'use strict';
/** * @type {HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('Misc2000GarageDoorOpener');


/**
 * @class A custom handler for a Hörmann Garage Door Opener conected to a KNX Actor
 * @extends HandlerPattern
 */
class Misc2000GarageDoorOpener extends HandlerPattern {

	constructor(knxAPI) {
		super(knxAPI); // call the super constructor first. Always.
		
		// simulate 2nd contact sensor (KNX_Garagentor_auf) by software/timer
		// if you want to simulate it set it to true if not to false
		// And set GarageDoorRunTime to the time the door needs from closed to open
		this.simulateDoorOpenContact= true;
		this.GarageDoorRunTime= 20000; // in mil.seconds
		this.timer1 = undefined;
//		lastMove = "Init";
	}

	//CallbackTorAufSetzen()


	/****
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 *
	 */
	onKNXValueChange(field, oldValue, knxValue) {
		// value for HomeKit
		var newValue;
		var myCurrentDoorState=this.myAPI.getValue("CurrentDoorState");
//		this.simulateDoorOpenContact= true;

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
	//	this.myAPI.getValue("CurrentDoorState") // Read last HK Status first

		if (field==="KNX_Garagentor_Move") {
			// KNX_Garagentor_Move ist bei meiner Installation Hoch/Stopp/Runter im Wechsel
			if (knxValue===1) {
				// Befehl 1 auf BUS erkannt
				if (oldValue!==1){ // Nur wenn Wert sich geändert hat
					console.log('INFO: KNX_Garagentor_Move erkannt');

					if (this.timer1 !== undefined){
						clearTimeout(this.timer1);
						this.timer1 = undefined;
						console.log('INFO: Timer für KNX_Garagentor_auf zurückgesetzt');
					}

					if (this.myAPI.getValue("KNX_Garagentor_zu")===0){ // IF DOOR IS CLOSED
					// also CurrentDoorState = 1
						console.log('INFO: Aktueller Status CurrentDoorState = 0 CLOSED erkannt');
						console.log('INFO: TargetDoorState = 0 OPEN setzen');
						this.myAPI.setValue("TargetDoorState", 0); // OPEN
						console.log('INFO: CurrentDoorState = 2 OPENING setzen');
						this.myAPI.setValue("CurrentDoorState", 2); // OPENING
						this.lastMove = "goingUp";
						console.log('INFO: lastMove = ' + this.lastMove+ ' setzen');
						if (this.simulateDoorOpenContact){
							this.myAPI.knxWrite("KNX_Garagentor_auf", 1, "DPT1"); // Tor nicht auf
							console.log('INFO: Timer für KNX_Garagentor_auf gestartet');
							this.timer1 = setTimeout (function (field) {
							// 18 Seconds Timer
													// Timer abgelaufen
													console.log('INFO: Timer abgelaufen, Tor oben angekommen wird simuliert');
													console.log('INFO: KNX_Garagentor_auf = 0 setzen');
													this.myAPI.knxWrite("KNX_Garagentor_auf", 0, "DPT1"); // Tor oben angekommen
							}.bind(this),this.GarageDoorRunTime, field);
						} // simulateDoorOpenContact
					} // ("KNX_Garagentor_zu")===1

					else if (myCurrentDoorState===2){ // IF DOOR IS OPENING
						console.log('INFO: Aktueller Status CurrentDoorState = 2 OPENING erkannt');
						console.log('INFO: CurrentDoorState = 4 STOPPED setzen');
						this.myAPI.setValue("CurrentDoorState", 4); // STOPPED
					} // ("CurrentDoorState")===2 //OPENING

					else if (myCurrentDoorState===3){ // IF DOOR IS CLOSING
						console.log('INFO: Aktueller Status CurrentDoorState = 3 CLOSING erkannt');
						console.log('INFO: CurrentDoorState = 4 STOPPED setzen');
						this.myAPI.setValue("CurrentDoorState", 4); // STOPPED
					} // ("CurrentDoorState")===2 //OPENING

					else if (myCurrentDoorState===4){ // IF DOOR IS STOPPED
						console.log('INFO: Aktueller Status CurrentDoorState = 4 STOPPED erkannt');
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
						console.log('INFO: Aktueller Status CurrentDoorState = 0 OPEN erkannt');
						console.log('INFO: TargetDoorState = 1 CLOSED setzen');
						this.myAPI.setValue("TargetDoorState", 1); // CLOSED
						console.log('INFO: CurrentDoorState = 3 CLOSING setzen');
						this.myAPI.setValue("CurrentDoorState", 3); // CLOSING
						this.lastMove = "goingDown";
						console.log('INFO: lastMove = ' + this.lastMove+ ' setzen');
						if (this.simulateDoorOpenContact){
							this.myAPI.knxWrite("KNX_Garagentor_auf", 1, "DPT1"); // Tor nicht auf
						}
					} // ("CurrentDoorState")===0 // OPEN

				} // oldValue!==1)
			} // knxValue===1
		} // Garagentor_Move

		if (field==="KNX_Garagentor_zu") {
			if (knxValue===0) {
				// Rückmeldestatus 0 (geschlossen) erkannt
				if (oldValue!==0){ // Nur wenn Wert sich geändert hat
					if (oldValue !== null){
						console.log('INFO: KNX_Garagentor_zu = 0 erkannt');
						console.log('INFO: CurrentDoorState = 1 CLOSED setzen');
//						this.myAPI.setValue("TargetDoorState", 1); // CLOSED
						this.myAPI.setValue("CurrentDoorState", 1); // CLOSED
						this.lastMove = "Stopped";
						console.log('INFO: lastMove = ' + this.lastMove+ ' setzen');
					} else { // Init run
						console.log('INFO: Init Garage Door HK Status');
						this.myAPI.setValue("TargetDoorState", 1); // CLOSED
						this.myAPI.setValue("CurrentDoorState", 1); // CLOSED
							if (this.simulateDoorOpenContact){
								this.myAPI.knxWrite("KNX_Garagentor_auf", 1, "DPT1");
							}
						this.lastMove = "Stopped";
						console.log('INFO: lastMove = ' + this.lastMove+ ' setzen');
					} // Init run
				} // Nur wenn Wert sich geändert hat
			} // (knxValue===0)
		} // (field==="KNX_Garagentor_zu")

		if (field==="KNX_Garagentor_auf") {
			if (knxValue===0) {
				// Rückmeldestatus 0 (geschlossen) erkannt
				if (oldValue!=0){ // Nur wenn Wert sich geändert hat
					console.log('INFO: KNX_Garagentor_auf = 0 erkannt');
					console.log('INFO: CurrentDoorState = 0 OPEN setzen');
//					this.myAPI.setValue("TargetDoorState", 0); // OPEN
					this.myAPI.setValue("CurrentDoorState", 0); // OPEN
					this.lastMove = "Stopped";
					console.log('INFO: lastMove = ' + this.lastMove+ ' setzen');
				}
			} // field==="KNX_Garagentor_auf = 0
		} // field==="KNX_Garagentor_auf

	} // onBusValueChange

	/****
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 *
	 */
	onHKValueChange(field, oldValue, newValue) {
			console.log('INFO: on HK Value Change (' + field + ", old="+ oldValue + ", new="+ newValue + ")");

		if (field==="TargetDoorState") {
			// The value property of TargetDoorState must be one of the following:
			// Characteristic.TargetDoorState.OPEN = 0;
			// Characteristic.TargetDoorState.CLOSED = 1;

			if (newValue===0){ // OPEN
				this.myAPI.setValue("TargetDoorState", 0); // OPEN
				console.log('INFO: KNX_Garagentor_Move = 1 Auf/Stopp/Zu aufrufen');
				this.myAPI.knxWrite("KNX_Garagentor_Move", 1, "DPT1"); // Auf/Stopp/Zu
			} // TargetDoorState = OPEN

			if (newValue===1){ // CLOSE
//				this.myAPI.setValue("TargetDoorState", 1); // CLOSED
				console.log('INFO: KNX_Garagentor_Move = 1 Auf/Stopp/Zu aufrufen');
				this.myAPI.knxWrite("KNX_Garagentor_Move", 1, "DPT1"); // Auf/Stopp/Zu
			} // TargetDoorState = CLOSE
		} // TargetDoorState
	} // onHKValueChange
} // class
module.exports=	Misc2000GarageDoorOpener;

/*****************************************************************************
The config for that should look like this in knx_config.json:
{
		"DeviceName": "Garagentor alpha",
		"Services": [
				{
						"ServiceType": "GarageDoorOpener",
						"Handler": "Misc2000GarageDoorOpener",
						"ServiceName": "Garagentor Rechts",
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
										"Type": "KNX_Garagentor_Move",
										"Set": "4/0/2",
										"Listen": "4/0/2",
										"DPT": "DPT1"
								},
								{
										"Type": "KNX_Garagentor_zu",
										"Listen": "1/1/8",
										"DPT": "DPT1"
								},
								{
										"Type": "KNX_Garagentor_auf",
										"Listen": "1/1/10",
										"DPT": "DPT1"
								}
						],
						"KNXReadRequests": [
								"4/0/2",
								"1/1/8",
								"1/1/10"
						]
				}
		]
}

+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
