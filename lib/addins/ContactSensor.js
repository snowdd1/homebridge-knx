/* Contact sensor
 *  Challenge: ContactSensorState is not a boolean, but a UINT8 with two allowed values - 0 and 1
 *  The default "Reverse: true" pattern does not match here, because that interprets UINT8 as a value range 0..255,
 *  and reversal is not defined for that.
 */
'use strict';
/**
 * @type {HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('ContactSensor');

/**
 * @class A custom handler for the GIRA 216100 "Jalousie Aktor" (rolling shutter/blinds actuator)
 * @extends HandlerPattern
 */
class ContactSensor extends HandlerPattern {

	/*******************************************************************************************************************
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 * 
	 */
	onKNXValueChange(field, oldValue, knxValue) {
		// value for HomeKit
		var newValue;
		log('INFO: onKNXValueChange(' + field + ", "+ oldValue + ", "+ knxValue+ ")");
		if (field==="ContactSensorState") {
			if (this.myAPI.getLocalConstant("Reverse")) {
				newValue = 1-knxValue;
			} else {
				newValue = knxValue;
			}
			this.myAPI.setValue("ContactSensorState", newValue);
		} //if
	} // onBusValueChange
	
	/*******************************************************************************************************************
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 * 
	 */
	onHKValueChange(field, oldValue, newValue) {
		log('STRANGE-THIS-SERVICE-IS-NOT-EXPECTED-TO-BE-WRITEABLE: onHKValueChange(' + field + ", "+ oldValue + ", "+ newValue + ")");
	} // onHKValueChange
} // class	
module.exports=	ContactSensor;

	
/* **********************************************************************************************************************
 * The config for that should look like: LocalConstants is now used in this sample 
 * Reverse is used as a constant in this custom handler
 * 
 * 
"Services": [{
                    "ServiceType": "ContactSensor",
                    "ServiceName": "Vasistas",
                    "Handler": "ContactSensor",
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
                        "Reverse": true
                    }
                }]
 * 
 * 
 * 
 */
