/* Sample module - Simple handler for rolling shutter actuator  
 * 
 */
'use strict';

/**
 * @type {HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('WindowCoveringTilt');

/**
 * @class A custom handler for the "Jalousie Aktor" (rolling shutter/blinds actuator) - including Tilt
 * @extends HandlerPattern
 */
class WindowCoveringTilt extends HandlerPattern {

	/*******************************************************************************************************************
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 * 
	 */
	onKNXValueChange(field, oldValue, knxValue) {
		// value for HomeKit
		var newValue;

		log('INFO: onKNXValueChange(' + field + ", "+ oldValue + ", "+ knxValue+ ")");

		if (field === "TargetPosition") {
			// TargetPosition is DPT5.001 Percentage (0..255)
			// need to convert to (0..100) first
			// Homekit is using %-open, meaning 0% is closed/down
			
			newValue = 100 - knxValue*100 / 255;
			
			if (newValue > this.myAPI.getValue("CurrentPosition")) {
				// newValue is higher, shutter's moving up
				this.myAPI.setValue("PositionState", 1);

			} else if (newValue < this.myAPI.getValue("CurrentPosition")){
				// newValue is higher, shutter's moving down
				this.myAPI.setValue("PositionState", 0);

			}
			
			this.myAPI.setValue("TargetPosition", newValue);

		} else if (field === "CurrentPosition") {
			// Current Position is sent by the actuator if the Movement has stopped a new postion is reached
			
			// CurrentPosition is DPT5.001 Percentage (0..255)
			// need to convert to (0..100) first
			// Homekit is using %-open, meaning 0% is closed/down
			newValue = 100 - knxValue*100 / 255;
			
			this.myAPI.setValue("CurrentPosition", newValue); // inform homekit
			this.myAPI.setValue("PositionState", 2); //stopped


			// return to stopped immediately, and set the Target to Current
			this.myAPI.setValue("TargetPosition", this.myAPI.getValue("CurrentPosition"));

		} else if (field==="ShutterMove") {
			// this isn't a characteristic, we need this extra object to catch switch use, too
			// The actuator is lowering the rolling shutters if a 1 is received, and 
			// raises on a 0

			switch (knxValue) {
				case 0:
					this.myAPI.setValue("TargetPosition", 100); // top position, so home shows "opening"
					this.myAPI.setValue("PositionState", 0); //up
					break;

				case 1:
					this.myAPI.setValue("TargetPosition", 0); // low position, so home shows "closing"
					this.myAPI.setValue("PositionState", 1); //down
					break;

			} // switch

		} else if (field === "TargetHorizontalTiltAngle") {
			// TargetPosition is DPT5.001 Percentage (0..255)
			// need to convert to (-90..90) first
			// Homekit is using degrees

			var ninetyDegRotation = this.myAPI.getLocalConstant("ninetyDegRotation");
			
			// is the Shutter one with a full rotation or one with 90° only?
			if (ninetyDegRotation==="true") {		
				newValue = 0 + knxValue/255 * 90;
			} else {
				newValue = -90 + knxValue/255 * 180;
			}
			
			this.myAPI.setValue("TargetHorizontalTiltAngle", newValue);

		} else if (field==="CurrentHorizontalTiltAngle") {
			// Current Position is sent by the actuator if the Movement has stopped a new postion is reached
			
			// CurrentPosition is DPT5.001 Percentage (0..255)
			// need to convert to (-90..90) first
			// Homekit is using degrees, meaning
			
			var ninetyDegRotation = this.myAPI.getLocalConstant("ninetyDegRotation");

			// is the Shutter one with a full rotation or one with 90° only?
			if (ninetyDegRotation==="true") {		
				newValue = 0 + knxValue/255 * 90;
			} else {
				newValue = -90 + knxValue/255 * 180;
			}
			
			this.myAPI.setValue("CurrentHorizontalTiltAngle", newValue); // inform homekit
			this.myAPI.setValue("TargetHorizontalTiltAngle", newValue);
			
		} //if
	} // onBusValueChange
	
	/*******************************************************************************************************************
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 * 
	 */
	onHKValueChange(field, oldValue, newValue) {
		// homekit will only send a TargetPosition value, so we do not care about (non-) potential others


		if (field === "TargetPosition") {
			log('INFO: onHKValueChange(' + field + ", "+ oldValue + ", "+ newValue + ")");
			// update the PositionState characteristic:		
			// get the last current Position
			var lastPos = this.myAPI.getValue("CurrentPosition");

			if (newValue > lastPos) {
				// newValue is higher, shutter's moving up
				this.myAPI.setValue("PositionState", 1); //up

			} else if (newValue < lastPos){
				// newValue is higher, shutter's moving down
				this.myAPI.setValue("PositionState", 0); //down

			}

			var knxValue = (255 - newValue*255 / 100);
			
			log('INFO: onHKValueChange after calc ('  + knxValue+ ")");
			this.myAPI.knxWrite("TargetPosition", knxValue, "DPT5"); // send the new position to the KNX bus

		} else if (field==="TargetHorizontalTiltAngle") {
			//TargetHorizontalTiltAngle
			log('INFO: onHKValueChange(' + field + ", "+ oldValue + ", "+ newValue + ")");

			var knxValue;
			var ninetyDegRotation = this.myAPI.getLocalConstant("ninetyDegRotation");

			// is the Shutter one with a full rotation or one with 90° only?
			if (ninetyDegRotation==="true") {		
				if (newValue > 0){
					knxValue = newValue/90 * 255;
				} else {
					knxValue = 0;
				}
			} else {
				knxValue = (newValue+90)/180 * 255;
			}
			
			log('INFO: onHKValueChange after calc ('  + knxValue+ ")");
			this.myAPI.knxWrite("TargetHorizontalTiltAngle", knxValue, "DPT5"); // send the new position to the KNX bus

		}
		
	} // onHKValueChange
} // class	
module.exports=	WindowCoveringTilt;

	
/* **********************************************************************************************************************
 * The config for that should look like: LocalConstants is now used in this sample 
 * Reverse keyword is not allowed for custom handlers
 * 
"Services": [
{
    "ServiceType": "WindowCovering",
    "Handler": "WindowCoveringTilt",
    "ServiceName": "Jalousie Wohnzimmer",
    "Characteristics": [
        {
            "Type": "TargetPosition",
            "Set": [
                "2/1/32"
            ],
            "Listen": [
                "2/1/32"
            ],
            "DPT": "DPT5"
        },
        {
            "Type": "CurrentPosition",
            "Listen": [
                "2/1/33"
            ],
            "DPT": "DPT5"
        },
        {
            "Type": "PositionState"
        },
        {
            "Type": "TargetHorizontalTiltAngle",
            "Set": [
                "2/1/34"
            ],
            "Listen": [
                "2/1/34"
            ],
            "DPT": "DPT5"
        },
        {
            "Type": "CurrentHorizontalTiltAngle",
            "Listen": [
                "2/1/35"
            ],
            "DPT": "DPT5"
        }
    ],
    "KNXObjects": [
        {
            "Type": "ShutterMove",
            "Listen": "2/1/30",
            "DPT": "DPT1"
        }
    ],
    "KNXReadRequests": [
        "2/1/33",
        "2/1/35"
    ],
    "LocalConstants": {
        "ninetyDegRotation": "true"
    }
}
 * 
 * 
 */
