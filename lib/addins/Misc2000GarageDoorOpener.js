/* module - to handle a Hörmann Garage Door Opener that is connected to a
 * KNX Aktor (in Treppenhaus mode) that switch for 1 second to ON to send
 * the engine of the door a move command"
 * The Hörmann engine will switch from Up/Stop/Down in cycle if more than
 * 1 command is received during movement
 * Also 2 contact sensor needed: KNX_Garagentor_zu and KNX_Garagentor_auf
 * the contact sensors will need to have a 0 value when closed
 * handler coded by misc2000; Michael Schmitt
 * Version 1.0
 */
'use strict';
/**
 * @type {HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('Misc2000GarageDoorOpener');

/**
 * @class A custom handler for AHörmann Garage Door Opener conected to a KNX Actor
 * @extends HandlerPattern
 */
class Misc2000GarageDoorOpener extends HandlerPattern {

	/****
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 *
	 */
	onKNXValueChange(field, oldValue, knxValue) {
		// value for HomeKit
		var newValue;
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

		if (field==="KNX_Garagentor_Move") {
			// KNX_Garagentor_Move ist bei meiner Installation Hoch/Stopp/Runter im Wechsel
			if (knxValue===1) {
				// Befehl 1 auf BUS erkannt
				if (oldValue!==1){ // Nur wenn Wert sich geändert hat
					console.log('INFO: KNX_Garagentor_Move erkannt');
//					this.myAPI.setValue("LockTargetState", 1); // SECURED

					if (this.myAPI.getValue("KNX_Garagentor_zu")===0){
						console.log('INFO: TargetDoorState = 0 OPEN');
						this.myAPI.setValue("TargetDoorState", 0); // OPEN
						console.log('INFO: CurrentDoorState = 2 OPENING');
						this.myAPI.setValue("CurrentDoorState", 2); // OPENING
					} // ("KNX_Garagentor_zu")==1


					if (this.myAPI.getValue("CurrentDoorState")===2){ //OPENING
						console.log('INFO: CurrentDoorState = 4 STOPPED');
						this.myAPI.setValue("CurrentDoorState", 4); // STOPPED
					} // ("CurrentDoorState")==2 //OPENING

					if (this.myAPI.getValue("CurrentDoorState")===4){ // STOPPED
						console.log('INFO: TargetDoorState = 1 CLOSED');
						this.myAPI.setValue("TargetDoorState", 1); // CLOSED
						console.log('INFO: CurrentDoorState = 3 CLOSING');
						this.myAPI.setValue("CurrentDoorState", 3); // CLOSING
					} // ("CurrentDoorState")==4 // STOPPED

					if (this.myAPI.getValue("CurrentDoorState")===0){ // OPEN
						console.log('INFO: TargetDoorState = 1 CLOSED');
						this.myAPI.setValue("TargetDoorState", 1); // CLOSED
						console.log('INFO: CurrentDoorState = 3 CLOSING');
						this.myAPI.setValue("CurrentDoorState", 3); // CLOSING
					} // ("CurrentDoorState")==4 // STOPPED

				} // oldValue!=1)
			} // knxValue==1
		} // Garagentor_Move

		if (field==="KNX_Garagentor_zu") {
			if (knxValue===0) {
				// Rückmeldestatus 1 (geschlossen) erkannt
//				if (oldValue!==1){ // Nur wenn Wert sich geändert hat
					console.log('INFO: KNX_Garagentor_zu erkannt');
					console.log('INFO: CurrentDoorState = 1 CLOSED');
					this.myAPI.setValue("CurrentDoorState", 1); // CLOSED
//				}
			}
		}

		if (field==="KNX_Garagentor_auf") {
			if (knxValue===0) {
				// Rückmeldestatus 1 (geschlossen) erkannt
//				if (oldValue!==1){ // Nur wenn Wert sich geändert hat
					console.log('INFO: KNX_Garagentor_auf erkannt');
					console.log('INFO: CurrentDoorState = 0 OPEN');
					this.myAPI.setValue("CurrentDoorState", 0); // OPEN
//				}
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
				this.myAPI.knxWrite("KNX_Garagentor_Move", 1, "DPT1"); // Auf/Stopp/Zu
				console.log('INFO: KNX_Garagentor_Move = 1 Auf/Stopp/Zu');
			} // TargetDoorState = OPEN

			if (newValue===1){ // CLOSE
				this.myAPI.knxWrite("KNX_Garagentor_Move", 1, "DPT1"); // Auf/Stopp/Zu
				console.log('INFO: KNX_Garagentor_Move = 1 Auf/Stopp/Zu');
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
