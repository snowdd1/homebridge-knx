/* Contact sensor
 *  Challenge: ContactSensorState is not a boolean, but a UINT8 with two allowed values - 0 and 1
 *  The default "Reverse: true" pattern does not match here, because that interprets UINT8 as a value range 0..255,
 *  and reversal is not defined for that.
 */
/* jshint esversion: 6, strict: true, node: true */

'use strict';
/**
 * @type {HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('BJWavelineContact');

/**
 * @class A custom handler for the "Busch Jaeger Waveline Contact Sensors"
 * @extends HandlerPattern
 */
class BJWavelineContact extends HandlerPattern {

	/*******************************************************************************************************************
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 * 
	 */
	onKNXValueChange(field, oldValue, knxValue) {
                var newValue;
                console.log('INFO: onKNXValueChange(' + field + ", "+ oldValue + ", "+ knxValue+ ")");

                newValue = knxValue * 100 / 255;

		if (newValue > 0) newValue = 1;
		if (field==="ContactSensorState") {
			if (this.myAPI.getLocalConstant("Reverse")) {
				newValue = 1-newValue;
			} else {
				newValue = newValue;
			}
			this.myAPI.setValue("ContactSensorState", newValue);
		} //if
	} // onBusValueChange
	
	/*******************************************************************************************************************
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 * 
	 */
	onHKValueChange(field, oldValue, newValue) {
		console.log('Contact Sensor State is not writable: onHKValueChange(' + field + ", "+ oldValue + ", "+ newValue + ")");
	} // onHKValueChange
} // class	
module.exports=	BJWavelineContact;

	
/* **********************************************************************************************************************
 * The config for that should look like: LocalConstants is now used in this sample 
 * Reverse is used as a constant in this custom handler
 * 
 * 
"Services": [{
                    "ServiceType": "ContactSensor",
                    "ServiceName": "Studio Fenster Kontakt",
                    "Handler": "BJWavelineContact",
                    "Characteristics": [
                        {
                            "Type": "ContactSensorState",
                            "Listen": [
                                "5/3/5"
                            ]
                        }
                    ],
                    "KNXReadRequests": [
                        "5/3/5"
                    ],
                    "LocalConstants": {
                        "Reverse": false
                    }
                }]
 * 
 * 
 * 
 */
