/* ThermostatMode
 * 
 */
'use strict';

/**
 * @type {HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('ThermostatMode');

/**
 * @class A custom handler for a ThermostatMode
 * @extends HandlerPattern
 */
class ThermostatMode extends HandlerPattern {


	/*******************************************************************************************************************
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 * 
	 */
	onKNXValueChange(field, oldValue, knxValue) {

		// set LocalConstants
		this.debugName = this.myAPI.getLocalConstant("debugName");
		this.mode = this.myAPI.getLocalConstant("mode");
		this.tempsetting = this.myAPI.getLocalConstant("tempsetting");
		this.knxheatingon = this.myAPI.getLocalConstant("knxheatingon");
		this.basetemp = this.myAPI.getLocalConstant("basetemp");

		console.log('INFO ' + this.debugName + ': on KNX Value Change(' + field + ", old="+ oldValue + ", new="+ knxValue+ ")");

		if (field === "CurrentTemperature") {
			//Just set the value accordingly
			this.myAPI.setValue("CurrentTemperature", knxValue);
		} else if (field === "TargetTemperature") {
			//Just set the value accordingly
			this.myAPI.setValue("TargetTemperature", knxValue);
		} else if (field === "KNXHeatingCooling" && this.mode === "overknx") {
			//Just set the value accordingly

			// knx-heating on
			this.knxheatingon = this.myAPI.getLocalConstant("knxheatingon");

			if (knxValue === this.knxheatingon) {
				this.myAPI.setValue("CurrentHeatingCoolingState", 1);
				this.myAPI.setValue("TargetHeatingCoolingState", 1);
			} else {
				this.myAPI.setValue("CurrentHeatingCoolingState", 2);
				this.myAPI.setValue("TargetHeatingCoolingState", 2);
			}
		}

		var myCurrentTemperature = this.myAPI.getValue("CurrentTemperature");
		var myTargetTemperature = this.myAPI.getValue("TargetTemperature");

		// The value property of CurrentHeatingCoolingState must be one of the following:
		// Characteristic.CurrentHeatingCoolingState.OFF = 0;
		// Characteristic.CurrentHeatingCoolingState.HEAT = 1;
		// Characteristic.CurrentHeatingCoolingState.COOL = 2;

		if (this.mode === "heating"){
			if (myCurrentTemperature < myTargetTemperature) {
				this.myAPI.setValue("CurrentHeatingCoolingState", 1);
				this.myAPI.setValue("TargetHeatingCoolingState", 1);
			} else {
				this.myAPI.setValue("CurrentHeatingCoolingState", 0);
				this.myAPI.setValue("TargetHeatingCoolingState", 0);
			}
		} else if (this.mode === "cooling"){
			if (myCurrentTemperature > myTargetTemperature) {
				this.myAPI.setValue("CurrentHeatingCoolingState", 2);
				this.myAPI.setValue("TargetHeatingCoolingState", 2);
			} else {
				this.myAPI.setValue("CurrentHeatingCoolingState", 0);
				this.myAPI.setValue("TargetHeatingCoolingState", 0);
			}
		} 
		else if (this.mode === "auto"){
			// in iOS 13, setting temperature is only enabled if device is "on" -> set to auto 
			this.myAPI.setValue("TargetHeatingCoolingState", 3);
		}

	} // onBusValueChange
	
	/*******************************************************************************************************************
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 * 
	 */
	onHKValueChange(field, oldValue, newValue) {

		// set LocalConstants
		this.debugName = this.myAPI.getLocalConstant("debugName");
		this.mode = this.myAPI.getLocalConstant("mode");
		this.tempsetting = this.myAPI.getLocalConstant("tempsetting");
		this.knxheatingon = this.myAPI.getLocalConstant("knxheatingon");
		this.basetemp = this.myAPI.getLocalConstant("basetemp");

		console.log("INFO " + this.debugName + ": on HK Value Change(" + field + ", old="+ oldValue + ", new="+ newValue+ "), tempsetting=" + this.tempsetting + ", mode=" + this.mode + ", knxheatingon=" + this.knxheatingon + ", basetemp=" + this.basetemp);

		if (field === "TargetTemperature") {
			//Just set the value accordingly
			// Potential extension: Set the KNX-Mode accordingly, use base-comfort-temp as config parameter

			if (this.tempsetting === "relative"){
				// Calculate and set
				var basetemp = this.basetemp;

				// upate basetemp if cooling
				if (this.mode === "cooling"){
					basetemp = basetemp + 2;
				}

				newValue = newValue - basetemp;
				newValue = newValue * 10;

				// convert signed int to unsinged int (8bit)
				if (newValue < 0 && newValue >= -127){
					newValue = -newValue + 128;
				}
				else if (newValue >= 0 && newValue <= 127){
					// do nothing
					newValue = newValue;
				}
				else if (newValue > 127) {
					newValue = 127;
				}
				else if (newValue < -127) {
					newValue = -127;
				}

				// This is actually DPT6, but this is currently not supported
				this.myAPI.knxWrite("KNXRelTemp", newValue, "DPT5");

				console.log('INFO ' + this.debugName + ': on HK Value Change(' + field + ", base="+ basetemp + ", new="+ newValue+ ")");

			} else {
				this.myAPI.knxWrite("TargetTemperature", newValue, "DPT9"); 
			}

			var myCurrentTemperature = this.myAPI.getValue("CurrentTemperature");
			var myTargetTemperature = this.myAPI.getValue("TargetTemperature");

			// The value property of CurrentHeatingCoolingState must be one of the following:
			// Characteristic.CurrentHeatingCoolingState.OFF = 0;
			// Characteristic.CurrentHeatingCoolingState.HEAT = 1;
			// Characteristic.CurrentHeatingCoolingState.COOL = 2;

			if (this.mode === "heating"){
				if (myCurrentTemperature < myTargetTemperature) {
					this.myAPI.setValue("CurrentHeatingCoolingState", 1);
					this.myAPI.setValue("TargetHeatingCoolingState", 1);
				} else {
					this.myAPI.setValue("CurrentHeatingCoolingState", 0);
					this.myAPI.setValue("TargetHeatingCoolingState", 0);
				}
			} else if (this.mode === "cooling"){
				if (myCurrentTemperature > myTargetTemperature) {
					this.myAPI.setValue("CurrentHeatingCoolingState", 2);
					this.myAPI.setValue("TargetHeatingCoolingState", 2);
				} else {
					this.myAPI.setValue("CurrentHeatingCoolingState", 0);
					this.myAPI.setValue("TargetHeatingCoolingState", 0);
				}
			} 
			else if (this.mode === "auto"){
				// in iOS 13, setting temperature is only enabled if device is "on" -> set to auto 
				this.myAPI.setValue("TargetHeatingCoolingState", 3);
			}

		} else if (field === "TargetHeatingCoolingState") {
			//Just set the value accordingly
			
			
			if (this.mode === "sendtoknx"){
				// if send to KNX is needed

				// knx-heating on
				this.knxheatingon = this.myAPI.getLocalConstant("knxheatingon");

				// Characteristic.CurrentHeatingCoolingState.COOL = 0?
				if (newValue === 0) { 
					this.mode = "cooling";
					this.myAPI.knxWrite("KNXHeatingCooling", !this.knxheatingon, "DPT1"); 
					this.myAPI.setValue("TargetHeatingCoolingState", 2);
				} else {
					// else: always heating
					this.mode = "heating";
					this.myAPI.knxWrite("KNXHeatingCooling", this.knxheatingon, "DPT1"); 
					this.myAPI.setValue("TargetHeatingCoolingState", 1);
				}
			} else if (this.mode === "auto") {
				this.myAPI.setValue("TargetHeatingCoolingState", 3);
			}
			else {
				// not allowed if not "sendtoknx" -> set back to original
				setTimeout(function(){
					console.log('INFO ' + this.debugName + ': Resetting TargetHeatingCoolingState');
					this.myAPI.setValue("TargetHeatingCoolingState", this.myAPI.getValue("CurrentHeatingCoolingState"));
				}.bind(this), 500);	

			}
		}

		
	} // onHKValueChange
} // class

module.exports =	ThermostatMode;

	
/*****************************************************************************
The config for that should look like this in knx_config.json:


{
  "DeviceName": "Thermostat Wohnzimmer",
  "Services": [
    {
      "ServiceType": "Thermostat",
      "Handler": "ThermostatMode",
      "ServiceName": "Thermostat Wohnzimmer",
      "Characteristics": [
        {
          "Type": "CurrentTemperature",
          "Listen": [
            "0/1/1"
          ]
        },
        {
          "Type": "TargetTemperature",
          "Set": [
            "0/1/6"
          ],
          "Listen": [
            "0/1/2"
          ]
        },
        {
            "Type": "CurrentHeatingCoolingState"
        },
        {
            "Type": "TargetHeatingCoolingState"
        }
      ],
      "KNXReadRequests": [
        "0/1/1",
        "0/1/2"
      ],
	    "LocalConstants": {
        "mode": "heating",
        "debugName": "Thermostat Wohnzimmer"
	    }
    }
  ]
},

or heating/cooling over KNX

{
  "DeviceName": "Thermostat Wohnzimmer",
  "Services": [
    {
      "ServiceType": "Thermostat",
      "Handler": "ThermostatMode",
      "ServiceName": "Thermostat Wohnzimmer",
      "Characteristics": [
        {
          "Type": "CurrentTemperature",
          "Listen": [
            "3/4/54"
          ]
        },
        {
          "Type": "TargetTemperature",
          "Set": [
            "3/4/57"
          ],
          "Listen": [
            "3/4/56"
          ]
        },
        {
            "Type": "CurrentHeatingCoolingState"
        },
        {
            "Type": "TargetHeatingCoolingState"
        }
      ],
      "KNXObjects": [
        {
          "Type": "KNXHeatingCooling",
          "Set": "2/3/0",
          "Listen": "2/3/0",
          "DPT": "DPT1"
        }
      ],
      "KNXReadRequests": [
        "2/3/0",
        "3/4/54",
        "3/4/56"
      ],
	    "LocalConstants": {
        "mode": "overknx",
        "knxheatingon": 1,
        "tempsetting": "absolute",
        "basetemp": 20,
        "debugName": "Thermostat Wohnzimmer"
	    }
    }
  ]
},

or

in iOS 13, setting temperature is only enabled if device is "on" -> set to mode to "heatingoverride"

{
  "DeviceName": "Thermostat Wohnzimmer",
  "Services": [
    {
      "ServiceType": "Thermostat",
      "Handler": "ThermostatMode",
      "ServiceName": "Thermostat Wohnzimmer",
      "Characteristics": [
        {
          "Type": "CurrentTemperature",
          "Listen": [
            "0/1/1"
          ]
        },
        {
          "Type": "TargetTemperature",
          "Set": [
            "0/1/6"
          ],
          "Listen": [
            "0/1/2"
          ]
        },
        {
            "Type": "CurrentHeatingCoolingState"
        },
        {
            "Type": "TargetHeatingCoolingState"
        }
      ],
      "KNXReadRequests": [
        "0/1/1",
        "0/1/2"
      ],
	    "LocalConstants": {
        "mode": "auto",
        "debugName": "Thermostat Wohnzimmer"
	    }
    }
  ]
},

*****************************************************************************/







