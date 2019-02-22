/* Push Button Switch
 * 
 */
'use strict';

/**
 * @type {HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('PushButtonSwitch');

/**
 * @class A custom handler for a PushButtonSwitch
 * @extends HandlerPattern
 */
class PushButtonSwitch extends HandlerPattern {

	/*******************************************************************************************************************
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 * 
	 */
	onKNXValueChange(field, oldValue, knxValue) {

		console.log('INFO ' + this.debugName + ': on KNX Value Change(' + field + ", old="+ oldValue + ", new="+ knxValue+ ")");

		if (field === "On") {
			//Just set the value accordingly
			this.myAPI.setValue("On", knxValue);
		} 
	} // onBusValueChange
	
	/*******************************************************************************************************************
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 * 
	 */
	onHKValueChange(field, oldValue, newValue) {

		console.log('INFO ' + this.debugName + ': on KNX Value Change(' + field + ", old="+ oldValue + ", new="+ newValue+ ")");

		// Define the length for a pulse.
		this.pulseLength = this.myAPI.getLocalConstant("pulseLength");

		// set debugName
		this.debugName = this.myAPI.getLocalConstant("debugName");

		if (field === "On") {
			// Send Pulse to KNX	
			var date = new Date();
			console.log('INFO ' + this.debugName + ': KNXPulse = 1, ' + date.getSeconds() +'s:'+ date.getMilliseconds() +'ms');
			
			this.myAPI.knxWrite("On", 1, "DPT1");

			setTimeout(function(){
				date = new Date();
				console.log('INFO ' + this.debugName + ': KNXPulse = 0, ' + date.getSeconds() +'s:'+ date.getMilliseconds() +'ms');
				this.myAPI.knxWrite("On", 0, "DPT1");
				this.myAPI.setValue("On", 0);
			}.bind(this), this.pulseLength);		
		} 
		
	} // onHKValueChange
} // class

module.exports =	PushButtonSwitch;

	

/*****************************************************************************
The config for that should look like this in knx_config.json:

{
  "DeviceName": "Impuls Garage",
  "Services": [
		{
		    "ServiceType": "Switch",
		    "Handler": "PushButtonSwitch",
		    "ServiceName": "Impuls Garage",
		    "Characteristics": [
		      {
	          "Type": "On",
	          "Set": [
	              "1/0/30"
	          ],
	          "Listen": [
	              "1/0/30"
	          ]
		      }
		    ],
		    "LocalConstants": {
	        "pulseLength": 500,
	        "debugName": "Impuls Garage"
	    }
		}
	]
}



*****************************************************************************/







