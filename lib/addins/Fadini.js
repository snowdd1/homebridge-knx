/* 
 * HOMEKIT-KNX Addin Module
 *
 * This is a module to handle my Fadini Gate opener.
 * 
 * Normal operation is when push-contact on intercom or button on Fadini remote is pressed
 *
 * - opening gate
 * - remain open for 30 seconds
 * - closing gate
 *
 * I use a KNX actuator to 'shortcut' the intercom push-contact.
 * I use KNX switch module to sense when pysical button on intercom is pressed
 *
 * As long as the button is pressed (actuator = ON) gate remains open
 * When button released (actuator = OFF ) 'closing ritual' starts with the 30 seconds timer
 * This 30 seconds is configured in the hardware of the gate driver
 * 
 * Parameters for this module are :
 *
 * - KNX GA addresses
 * - TravelTime   - time it take to complete opening/closeing - defaults to 15 seconds
 * - OpenTime     - time gate remains open after contact is released - defaults to 30 seconds
 * - AutoClose    - simulate push button contact (true) or open/close switch (off) - default on
 * - ExtendedOpen - extra open time before starting closing ritual - defaults to 0
 *
 * ExtendedOpen can be usefull if your gate hardware is configured to close after say 30 seconds,
 * but you'd prefer 45. ExtendedOpen should then be set to 15.
 *
 * All information is based on timing, no feedback/state sensors are used
 */

/* jshint esversion: 6, strict: true, node: true */

'use strict';
/** * @type {HandlerPattern}

 */

var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('fadini');

// some HOMEKIT constants

const HKOPEN = 0
const HKCLOSE = 1
const HKOPENING = 2
const HKCLOSING = 3

// KNX values

const KNXCLOSE = 0
const KNXOPEN = 1

/**
 * @class A custom handler for a fadini conected to a KNX actuator
 * @extends HandlerPattern
 */
class fadini extends HandlerPattern 
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
			if (!this.AutoClose) {
				this.AutoClose = 1; // default to true if not given in config
			} else {
				this.AutoClose = 0
			}
		}
		log(`fadini module initialized with traveltime=${this.TravelTime} OpenTime=${this.OpenTime} AutoClose=${this.AutoClose} ExtendedOpen=${this.ExtendedOpen}`);
    }

		
	/****
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 *
	 */
	async onKNXValueChange(field, oldValue, knxValue) {
		
		var myCurrentDoorState=this.myAPI.getValue("CurrentDoorState");

		// The value property of TargetDoorState must be one of the following:

		// Characteristic.TargetDoorState.KNXOPEN = 0;
		// Characteristic.TargetDoorState.KNXCLOSE = 1;

		log('INFO: on KNX Value Change(' + field + ", old="+ oldValue + ", new="+ knxValue+ ")");
		log('INFO: myCurrentDoorState = ' + myCurrentDoorState);

		if (field === "TargetDoorState") {
			switch (knxValue ) {
            case KNXOPEN :
				log('KNX bus receive value KNXOPEN --> TargetState = OPEN');

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

 				// wait for potential opening ritual to complete

				while ( (myCurrentDoorState = this.myAPI.getValue("CurrentDoorState")) != HKOPEN )
				{
					log('INFO: Will check again in 2 seconds ' + myCurrentDoorState);
					await new Promise (resolve => { setTimeout(resolve, 2000) });
				}

				// received KNXCLOSE is actually just end of open, which starts the staircase timer
				// start staircase timer - no state change 

				log('INFO: Closing from open state - starting staircase timer '+this.OpenTime+'msec');
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

	/****
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 *
	 */
	onHKValueChange(field, oldValue, newValue) {
		
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
					log('INFO: [onHKValueChange] Calling this.moveGate(KNXOPEN)');
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


	/****
	 * moveGate is used to send an pulse for open/close to the bus
	 *
	 */
	async moveGate(toOpen) {
	  
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

} // class


module.exports=	fadini;

/*
 * your knx_config.json should contain something along the line of
 *

        {
            "DeviceName": "Bridge",
            "Services": [
                {
                    "ServiceType": "GarageDoorOpener",
                    "Handler": "fadini",
                    "ServiceName": "Gate",
                    "Characteristics": [
                        {
                            "Type": "TargetDoorState",
                            "Set": [
                                "1/0/62"
                            ],
                            "Listen": [
                                "1/1/62"
                            ],
                            "DPT": "DPT1"
                        },
                        {
                            "Type": "CurrentDoorState",
                            "DPT": "DPT5"
                        }
                    ],
                    "KNXReadRequests": [
                        "1/1/62"
                    ],
                    "LocalConstants": {
                        "TravelTime": 10,
                        "OpenTime": 30,
						"AutoClose" : true,
						"ExtendOpen" : 30
                    }
                }
            ]
        }
}



*/
