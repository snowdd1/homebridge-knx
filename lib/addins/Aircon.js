/* Aircon
 * 
 */
'use strict';

/**
 * @type {HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('Aircon');

/**
 * @class A custom handler for a Aircon
 * @extends HandlerPattern
 */
class Aircon extends HandlerPattern {

	constructor(knxAPI) {
		super(knxAPI); // call the super constructor first. Always.
		
		// debug-name
		this.debugName = undefined;

		this.AirconLev1 = undefined;
		this.AirconLev3 = undefined;
	}

	/*******************************************************************************************************************
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 * 
	 */
	onKNXValueChange(field, oldValue, knxValue) {

		// set debugName
		this.debugName = this.myAPI.getLocalConstant("debugName");

		console.log('INFO ' + this.debugName + ': on KNX Value Change(' + field + ", old="+ oldValue + ", new="+ knxValue+ ")");

		if (field === "On") {
			//Just set the value accordingly
			this.myAPI.setValue("On", knxValue);
			if (knxValue === 0){
				this.myAPI.knxWrite("KNXAirconLev1", 0, "DPT1");
				this.myAPI.knxWrite("KNXAirconLev2", 0, "DPT1"); // Dummy only
				this.myAPI.knxWrite("KNXAirconLev3", 0, "DPT1");
			} else {
				this.myAPI.knxWrite("KNXAirconLev2", 1, "DPT1"); // Dummy only
			}

		} else if (field === "KNXAirconLev1") {
			//Just set the value accordingly
			this.AirconLev1 = knxValue;

			if (knxValue === 1){
				this.myAPI.knxWrite("KNXAirconLev2", 0, "DPT1"); // Dummy only
				this.myAPI.knxWrite("KNXAirconLev3", 0, "DPT1");
			}

		} else if (field === "KNXAirconLev3") {
			//Just set the value accordingly
			this.AirconLev3 = knxValue;

			if (knxValue === 1){
				this.myAPI.knxWrite("KNXAirconLev1", 0, "DPT1");
				this.myAPI.knxWrite("KNXAirconLev2", 0, "DPT1"); // Dummy only
			}

		}

		// Set current RotationSpeed
		var myAirconLev1 = this.AirconLev1;
		var myAirconLev3 = this.AirconLev3;
		var myAirconOn = this.myAPI.getValue("On");

		if (myAirconOn){
			if (myAirconLev1) {
				// Level 1
				this.myAPI.setValue("RotationSpeed", 33);
			} else if (myAirconLev3) {
				// Level 3
				this.myAPI.setValue("RotationSpeed", 100);
			} else if (!myAirconLev1 && !myAirconLev3) {
				// Level 2
				this.myAPI.setValue("RotationSpeed", 66);
			} 

		} else {
			this.myAPI.setValue("RotationSpeed", 0);
		}


	} // onBusValueChange
	
	/*******************************************************************************************************************
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 * 
	 */
	onHKValueChange(field, oldValue, newValue) {

		// set debugName
		this.debugName = this.myAPI.getLocalConstant("debugName");

		console.log('INFO ' + this.debugName + ': on KNX Value Change(' + field + ", old="+ oldValue + ", new="+ newValue+ ")");

		if (field === "On") {
			//Just set the value accordingly
			this.myAPI.knxWrite("On", newValue, "DPT1"); 

		} else if (field === "RotationSpeed") {
			//Just set the value accordingly
			if (newValue > 0 && newValue <= 33) {
				this.myAPI.knxWrite("KNXAirconLev1", 1, "DPT1");
				setTimeout(function(){
					console.log('INFO ' + this.debugName + ': Resetting RotationSpeed');
					this.myAPI.setValue("RotationSpeed", 33);
				}.bind(this), 500);	
			} else if (newValue > 33 && newValue <= 66) {
				this.myAPI.knxWrite("KNXAirconLev1", 0, "DPT1");
				this.myAPI.knxWrite("KNXAirconLev3", 0, "DPT1");
				setTimeout(function(){
					console.log('INFO ' + this.debugName + ': Resetting RotationSpeed');
					this.myAPI.setValue("RotationSpeed", 66);
				}.bind(this), 500);	
			} else if (newValue > 66) {
				this.myAPI.knxWrite("KNXAirconLev3", 1, "DPT1");
				setTimeout(function(){
					console.log('INFO ' + this.debugName + ': Resetting RotationSpeed');
					this.myAPI.setValue("RotationSpeed", 100);
				}.bind(this), 500);	
			}  
		}
		
	} // onHKValueChange
} // class

module.exports =	Aircon;

	
/*****************************************************************************
The config for that should look like this in knx_config.json:


{
  "DeviceName": "Aircon",
  "Services": [
    {
      "ServiceType": "Fan",
      "Handler": "Aircon",
      "ServiceName": "Lüftung",
      "Characteristics": [
	      {
          "Type": "On",
          "Set": [
              "0/0/10"
          ],
          "Listen": [
              "0/0/11"
          ]
	      },
        {
            "Type": "RotationSpeed"
        }
      ],
      "KNXObjects": [
        {
          "Type": "KNXAirconLev1",
          "Set": "0/0/12",
          "Listen": "0/0/13",
          "DPT": "DPT1"
        },
        {
          "Type": "KNXAirconLev2",
          "Set": "0/0/21",
          "Listen": "0/0/21",
          "DPT": "DPT1"
        },
        {
          "Type": "KNXAirconLev3",
          "Set": "0/0/14",
          "Listen": "0/0/15",
          "DPT": "DPT1"
        }
      ],
      "KNXReadRequests": [
        "0/0/11",
        "0/0/13",
        "0/0/15"
      ],
	    "LocalConstants": {
        "debugName": "Lüftung"
	    }
    }
  ]
},


*****************************************************************************/







