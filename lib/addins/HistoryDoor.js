/* Door contact sensor with support for eve additional characteristics and history
 *
 */
/* jshint esversion: 6, strict: true, node: true */

'use strict';
/**
 * @type {HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('HistoryDoor');
var moment = require('moment');

/**
 * @class A custom handler for the "Busch Jaeger Waveline Contact Sensors"
 * @extends HandlerPattern
 */
class HistoryDoor extends HandlerPattern {

	/*******************************************************************************************************************
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 * 
	 */
	onKNXValueChange(field, oldValue, knxValue) {
                var newValue;
                console.log('HistoryDoor: onKNXValueChange(' + field + ", "+ oldValue + ", "+ knxValue+ ")");

                newValue = knxValue;
		// Some contact sensors send 255 instead of 1
		if (newValue > 0) newValue = 1;
		if (field==="ContactSensorState") {
			if (this.myAPI.getLocalConstant("Reverse")) {
				newValue = 1-newValue;
			} else {
				newValue = newValue;
			}
			this.myAPI.setValue("ContactSensorState", newValue);

			// Increase eve counter when door opened
			if (newValue == 1) {
				this.myAPI.setValue("eveTimesOpened", (this.myAPI.getValue("eveTimesOpened") + 1));
			}

			// when door is closed, set internal timer - used for "last activation" in eve 
			// only do this if the state has changed. This will ignore recured sended protocols
			if (newValue == 0 && oldValue != knxValue) {
  				var lastActivation = moment().unix() - this.myAPI.serviceKNX.platformAccessory.loggingService.getInitialTime();
  				this.myAPI.setValue("eveLastActivation", lastActivation);
			}
		} //if
	} // onBusValueChange
	
	/*******************************************************************************************************************
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 * 
	 */
	onHKValueChange(field, oldValue, newValue) {
                console.log('HistoryDoor: onHKValueChange(' + field + ", "+ oldValue + ", "+ newValue+ ")");

		// Handle request to clear the internal counter - onHKValueChange(eveResetTotal, null, 550568819)
		if (field === "eveResetTotal") {
			this.myAPI.setValue("eveTimesOpened", 0);
		}
	} // onHKValueChange
} // class	
module.exports=	HistoryDoor;

	
/* **********************************************************************************************************************
 * Sample config to simulate and elgato eve door accessory with full history
 * 
 * You can still use the regular "ContactSensor" ServiceType, however, this this will generate a warning about adding
 * additional Characteristics

        {
            "DeviceName": "Demo Contact",
            "Services": [
                {
                    "ServiceType": "eveContactSensor",
                    "Handler": "HistoryDoor",
                    "ServiceName": "Demo Contact",
                    "Characteristics": [
                        {
                            "Type": "ContactSensorState",
                            "Listen": [
                                "7/0/14"
                            ],
                            "DPT": "DPT5.001"
                        },
                        {
                            "Type": "eveTimesOpened"
                        },
                        {
                            "Type": "eveLastActivation"
                        },
                        {
                            "Type": "eveResetTotal"
                        }
                    ],
                    "KNXReadRequests": [
                        "7/0/14"
                    ],
                    "LocalConstants": {
                        "Reverse": false
                    }
                }
            ],
            "HistoryType": "door"
        }


*
*
*/
