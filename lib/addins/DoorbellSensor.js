/* Contact sensor
 *  Challenge: When a KNX sensor is used for ProgrammableSwitchEvent, the event is triggered on all value changes, 
 *  also on release (0) changes
 */
/* jshint esversion: 6, strict: true, node: true */

'use strict';
/**
 * @type {HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('DoorbellSensor');

/**
 * @class A custom handler for sensors that have "reversed" output (at least compared to HomeKit defaults)
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
		if (field==="SinglePress") {
			if ((this.myAPI.getLocalConstant("Reverse")==true) ^ (knxValue==true)) {
                this.myAPI.setValue("ProgrammableSwitchEvent", 0);
			}
        } //if
		if (field==="DoublePress") {
			if ((this.myAPI.getLocalConstant("Reverse")==true) ^ (knxValue==true)) {
                this.myAPI.setValue("ProgrammableSwitchEvent", 1);
			}
        } //if        
		if (field==="LongPress") {
			if ((this.myAPI.getLocalConstant("Reverse")==true) ^ (knxValue==true)) {
                this.myAPI.setValue("ProgrammableSwitchEvent", 2);
			}
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
 * Reverse: false: Trigger on 1
 *          true:  Trigger on 0
 * 
 * 
"Services": [{
                "ServiceType": "Doorbell",
                "ServiceName": "Doorbell1",
                "Handler": "DoorbellSensor",
                "Characteristics": [
                    {
                        "Type": "ProgrammableSwitchEvent",
                        "Listen": [
                        ]
                    }
                ],
                "KNXObjects": [
                    {
                        "Type":"SinglePress",
                        "Listen": "8/4/4",
                        "DPT":"DPT1"
                    }
        
                    {"Type":"DoublePress",
                        "Listen": "8/4/5",
                        "DPT":"DPT1"
                    },
                    {"Type":"LongPress",
                        "Listen": "8/4/6",
                        "DPT":"DPT1"
                    }
                ],
                "LocalConstants": {
                    "Reverse": false
                }
            }]
 * 
 * 
 * 
 */
