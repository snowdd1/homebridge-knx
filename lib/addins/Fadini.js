/* 
 * HOMEBRIDGE-KNX Addin for Fadini Combi 740 Gate Opener
 *
 * Erik Meinders / erik@easytocloud.com
 * 
 * This is a module to handle a Fadini Gate opener.
 * 
 * Normal operation is when push-contact on intercom or button on Fadini remote is pressed
 *
 * - opening gate
 * - remain open for 30 seconds
 * - closing gate
 *
 * I use KNX module to 'sense' when pysical button on intercom is pressed
 * this changes the KNX value of the Listen GA
 * 
 * I do not intercept Fadini Remote (this is handled in hardware outside the house)
 * 
 * Writing to the Set GA closes/opens the circuit through a second KNX device
 *
 * As long as the 'button is pressed' (actuator = ON) the gate remains open
 * When button released (actuator = OFF) the 'closing ritual' starts with a (30 seconds) timer.
 * This timer is configured in the hardware of the gate driver, not in this module!
 * 
 * TravelTime and OpenTime are values you have to measure in your installation and enter in this config.
 * The other parameters can be used to 'override' those values
 * 
 * Parameters for this module are :
 *
 * - KNX GA for Listen and Set
 * 
 * - TravelTime   - time it take to complete opening/closeing (measure!)- defaults to 15 seconds
 * - OpenTime     - time gate remains open after contact is released (measure!) - defaults to 30 seconds
 * 
 * - AutoClose    - simulate push button contact (true) or open/close switch (false) - default true
 * - ExtendedOpen - open time before starting closing ritual - defaults to 0 seconds
 *
 * Fadini has single button operation to open/wait/close gate.
 * HomeKit expects two actions, one to open and one close garage door.
 * Setting AutoClose will reset HomeKit switch to off 200ms after switching it on,
 * mimicking the Fadini behaviour. This is the default. Alternatively, setting AutoClose to false
 * will leave the gate open until the switch is switched off in HomeKit
 * 
 * ExtendedOpen can be used to keep the gate open for longer than the measured (30 seconds) period,
 * ExtendedOpen should then be set to the *total* time required and only works when AutoClose is true.
 * ExtendedOpen has to be larger than OpenTime!
 *
 * All information is only based on timing, no feedback/state sensors are available
 */

/* jshint esversion: 6, strict: true, node: true */

'use strict';
/** * @type {HandlerPattern} */

var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('Fadini');

//  HOMEKIT constants

const HKOPEN = 0
const HKCLOSE = 1
const HKOPENING = 2
const HKCLOSING = 3

// KNX constants

const KNXCLOSE = 0
const KNXOPEN = 1

/**
 * @class A custom handler for a fadini combi 740 conected to a KNX actuator
 * @extends HandlerPattern
 */
class Fadini extends HandlerPattern 
{
	onServiceInit() 
    {
		if (!this.TravelTime) {
			this.TravelTime = this.myAPI.getLocalConstant("TravelTime");
			if (!this.TravelTime) {
				this.TravelTime = 15 * 1000; // default to 15 secs if not given in config
			} else {
				this.TravelTime = this.TravelTime * 1000; //convert to millisecs
			}
		}
		if (!this.OpenTime) {
			this.OpenTime = this.myAPI.getLocalConstant("OpenTime");
			if (!this.OpenTime) {
				this.OpenTime = 15 * 1000; // default to 15 secs if not given in config
			} else {
				this.OpenTime = this.OpenTime * 1000; //convert to millisecs
			}
		}
		if (!this.ExtendedOpen) {
			this.ExtendedOpen = this.myAPI.getLocalConstant("ExtendedOpen");
			if (!this.ExtendedOpen) {
				this.ExtendedOpen = 0; // default to 0 secs if not given in config
			} else {
				this.ExtendedOpen = this.ExtendedOpen * 1000; //convert to millisecs
			}
		}
		if (!this.AutoClose) {
			this.AutoClose = this.myAPI.getLocalConstant("AutoClose");
			if (this.AutoClose != false) 
				this.AutoClose = true;
		}
		console.log(`INFO: Fadini module initialized with traveltime=${this.TravelTime} OpenTime=${this.OpenTime} AutoClose=${this.AutoClose} ExtendedOpen=${this.ExtendedOpen}`);
    }

		
	/*
	 * onKNXValueChange is invoked if a KNX Bus value for one of the bound addresses is received
	 *
	 */
	async onKNXValueChange(field, oldValue, knxValue) 
	{	
		var myCurrentDoorState=this.myAPI.getValue("CurrentDoorState");

		// The value property of TargetDoorState must be one of the following:

		// Characteristic.TargetDoorState.KNXOPEN = 0;
		// Characteristic.TargetDoorState.KNXCLOSE = 1;

		log('INFO: on KNX Value Change(' + field + ", old="+ oldValue + ", new="+ knxValue+ ")");
		log('INFO: myCurrentDoorState = ' + myCurrentDoorState);

		if (field === "TargetDoorState") 
		{
			switch (knxValue ) {
            case KNXOPEN :
				log('KNX bus received value KNXOPEN --> TargetState = OPEN');

				if ( myCurrentDoorState === HKOPEN )
                {
					log('INFO: Already open - no action' + myCurrentDoorState);
					return;
				}
				if ( myCurrentDoorState === HKOPENING )
                {
					log('INFO: Already open(ing) ' + myCurrentDoorState);
					return;
				} 
					
 				// enter opening mode

				log('INFO: HKOPENING for ' + this.TravelTime + 'msec');

				this.myAPI.setValue("CurrentDoorState", HKOPENING); // OPENING
				this.myAPI.setValue("TargetDoorState", HKOPEN); // OPENING

				await new Promise (resolve => { setTimeout(resolve, this.TravelTime) });

				log('INFO: HKOPENING completed, HKOPEN now ');
				this.myAPI.setValue("CurrentDoorState", HKOPEN); // OPEN
				break;
			case KNXCLOSE:
			
				log('INFO: KNX bus receive value KNXCLOSE --> TargetState = CLOSE');

				if ( myCurrentDoorState ===  HKCLOSE )
                {
					log('INFO: Already Closed ' + myCurrentDoorState);
					return;
				}
				if ( myCurrentDoorState === HKCLOSING )
                {
					log('INFO: Already Closing ' + myCurrentDoorState);
					return;
				} 

 				// wait for potential running opening ritual to complete

				while ( (myCurrentDoorState = this.myAPI.getValue("CurrentDoorState")) != HKOPEN )
				{
					log('INFO: Will check again in 2 seconds ' + myCurrentDoorState);
					await new Promise (resolve => { setTimeout(resolve, 2000) });
				}

				// received KNXCLOSE is actually just end of open, which starts the 'staircase' timer
				// start timer - no state change 

				log('INFO: Closing from open state - starting timer '+this.OpenTime+'msec');
				await new Promise (resolve => { setTimeout(resolve, this.OpenTime) });

				log('INFO: entering HKCLOSING for '+this.TravelTime+' msec');
				this.myAPI.setValue("CurrentDoorState", HKCLOSING ); // CLOSING
				this.myAPI.setValue("TargetDoorState", HKCLOSE ); // CLOSING

				await new Promise (resolve => { setTimeout(resolve, this.TravelTime) });

				log('INFO: HKCLOSING ended, HKCLOSE now');
				this.myAPI.setValue("CurrentDoorState", HKCLOSE ); // CLOSED
			}
		} else {
			log ('WARNING: [ONKNX Value Change] Not processed ', + field );
		}

	} // onKNXValueChange

	/*
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 *
	 */
	onHKValueChange(field, oldValue, newValue) 
	{
		
		var myCurrentDoorState=this.myAPI.getValue("CurrentDoorState");

		log('INFO: on HK Value Change (' + field + ", old="+ oldValue + ", new="+ newValue + ")");
		log('INFO: myCurrentDoorState = ' + myCurrentDoorState);

		if (field === "TargetDoorState") 
		{
			// The value property of TargetDoorState must be one of the following:
			// Characteristic.TargetDoorState.OPEN = 0;
			// Characteristic.TargetDoorState.CLOSED = 1;

			switch (newValue) {
			case HKOPEN :
				// new state is Open, currentState determines action
				switch(myCurrentDoorState) {
				case HKOPEN: // IF DOOR IS OPEN
					log('INFO: [onHKValueChange] CurrentDoorState = 0 OPEN detected');
					// Do nothing, opening already
					break;
				case HKCLOSE:
					// send pulse for Opening
					log('INFO: [onHKValueChange] CurrentDoorState = 1 --> Calling this.moveGate(KNXOPEN)');
					this.moveGate(KNXOPEN);
					break;
				case HKOPENING:
					log('INFO: [onHKValueChange] CurrentDoorState = 2 OPENING detected');
					// Do nothing, opening already
					break;
				case HKCLOSING:
					log('INFO: [onHKValueChange] CurrentDoorState = 3 CLOSING detected --> reOpen ');
					this.moveGate(KNXOPEN);
					break;
				default:
					log('EORR: [onHKValueChange] CurrentDoorState = not recognized');
				}
				break;
			
			case HKCLOSE: 

				switch(myCurrentDoorState){

				case HKOPEN:
					// send pulse for Closing
					log('INFO: [onHKValueChange] Calling this.moveGate(KNXCLOSE)');
					this.moveGate(KNXCLOSE);
					break;
				case HKCLOSE:
					log('INFO: [onHKValueChange] CurrentDoorState = 1 CLOSED detected - no change');
					break;
				case HKOPENING:
					log('INFO: [onHKValueChange] CurrentDoorState = 2 OPENING detected - need to await fulll cycle');
					this.moveGate(KNXCLOSE);
					break;
				case HKCLOSING:
					log('INFO: [onHKValueChange] CurrentDoorState = 3 CLOSING detected');
					// Do nothing, closing already
					break;
				default:
					log('ERROR: [onHKValueChange] CurrentDoorState = not recognized');

				} 
			} // switch newValue

		} else {
			log('WARNING: [onHKValueChange] changed field is not recognized:'+field);

		} // TargetDoorState
		
	} // onHKValueChange


	/*
	 * moveGate is used to send an pulse for open/close to the bus
	 *
	 */
	async moveGate(toOpen)
	{
	  
		log('INFO: moveGate called. toOpen = ' + toOpen);

		switch (toOpen) {
		case KNXOPEN:
			log('INFO: moveGate writes KNXOPEN as TargetDoorState');
			this.myAPI.knxWrite("TargetDoorState", KNXOPEN, "DPT1"); 

			if(this.AutoClose)
			{
				log('INFO: AutoClose enabled with 200 + '+ this.ExtendedOpen+' ms. delay.');

				// button press should be a certain minimum time (200 ms)
				await new Promise (resolve => { setTimeout(resolve, this.ExtendedOpen+200) });
				// simulate close event; ie. release of open button --> to close
				this.onHKValueChange("TargetDoorState", HKOPEN, HKCLOSE);
			}
			break;
		case KNXCLOSE:
			log('INFO: moveGate writes KNXCLOSE as TargetDoorState');
			this.myAPI.knxWrite("TargetDoorState", KNXCLOSE, "DPT1");
			break;
		}
	}

} 


module.exports=	Fadini;

/*
 * your knx_config.json should contain something along the line of
 *

        {
            "DeviceName"	: "Bridge",
            "Services"		: [
			{
				"ServiceType"		: "GarageDoorOpener",
				"Handler"			: "Fadini",
				"ServiceName"		: "Gate",
				"Characteristics"	: [
				{
					"Type"	: "TargetDoorState",
					"Set"	: [ "1/0/42" ],
					"Listen": [ "1/1/42" ],
					"DPT"	: "DPT1"
				},
				{
					"Type"	: "CurrentDoorState",
					"DPT"	: "DPT5"
				}],
				"KNXReadRequests"	: [ "1/1/42" ],
				"LocalConstants"	: {
					"TravelTime"	: 10,
					"OpenTime"		: 30,
					"AutoClose" 	: true,
					"ExtendOpen" 	: 30
				}
			}]
        }

*/
