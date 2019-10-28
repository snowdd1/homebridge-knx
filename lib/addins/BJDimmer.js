'use strict';
/** * @type {HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('BJDimmer');


/**
 * @class A custom handler to fix brightness/on messages and to make 1% eq 1/255 brightness
 * @extends HandlerPattern
 */
class BJDimmer extends HandlerPattern {

	constructor(knxAPI) {
		super(knxAPI); // call the super constructor first. Always.

		this.timer = undefined;
		this.timeoutsecs = 700;
	}


	/****
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 *
	 */
	onKNXValueChange(field, oldValue, knxValue) {

		log('INFO: on KNX Value Change(' + field + ", old="+ oldValue + ", new="+ knxValue+ ")");



	  	switch (field)
	  	{
		  	case "Brightness":
				this.myAPI.setValue("Brightness", parseInt((knxValue)/255*100)+1);
				break;

			case "On":
				this.myAPI.setValue("On", knxValue);
				break;

			}
		return true;
	} // onBusValueChange

	/****
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 *
	 */
	onHKValueChange(field, oldValue, newValue) {
			log('INFO: BJDimmer - on HK Value Change (' + field + ", old="+ oldValue + ", new="+ newValue + ")");

var brightnessFull = this.myAPI.getLocalConstant('BrightnessFullOn') || false;


if (field==='Brightness') {

	
	//if (oldValue != newValue) {
	if (oldValue != newValue) {

		if (newValue > 2) {

console.log('INFO: BJDimmer - got brightness value: ' + newValue);

			if (this.timer) {
				clearTimeout(this.timer); // Remove existing timer
			}

			this.timer = setTimeout(function(field) {
console.log('INFO: BJDimmer - setting brighrness after timeout to: ' + newValue);
					this.myAPI.knxWrite(field, parseInt(newValue/100*255-1), "DPT5");
				this.timer = undefined;
			}.bind(this), this.timeoutsecs, field);


		
		} else {

// Turn device of when Brightness is '0'
	//			this.myAPI.setValue("On", 0);
//this.myAPI.setValue("Brightness", 0);

		}
	}


}

if (field==='On') {
console.log('In On: ' + newValue);
console.log(brightnessFull);

	if (newValue == 1 && brightnessFull) {
		this.myAPI.setValue("Brightness", 100);
		this.myAPI.knxWrite(field, newValue, "DPT1");
	}
	if (newValue == 0 && brightnessFull) {
		this.myAPI.setValue("Brightness",   0);
		this.myAPI.knxWrite(field, newValue, "DPT1");
	}
}


/*
		  	switch (field)
		  	{
		  		case "Brightness":
		  			// to make 1% -> 1/255 (more precise dimming)
					this.myAPI.knxWrite(field, parseInt(newValue/100*255-1), "DPT5");

					// set "brightness has just been set" flag to true for next 0.2s
					this.brightnessSet=true;
					var that = this;
					if (this.timer) clearTimeout(this.timer);
					this.timer = setTimeout(function () { 
						that.brightnessSet=false;
					},200);
					return true;
					break;

				case "On":
					//skip "turn on" knx message if brightness has just been set
					if (newValue == 1 && this.brightnessSet)
					{
						return true;
					}
					this.myAPI.knxWrite(field, newValue, "DPT1");
					break;
			}
*/

			return true;

	
	} // onHKValueChange
} // class
module.exports=	BJDimmer;

