 /* jshint esversion: 6, strict: true, node: true */
 
'use strict';
/**
 * @type {HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('PulseLight');

/**
 * @class A custom handler that always sends a 1 to KNX to iterate the same pulse trigger   
 * @extends HandlerPattern
 */
class PulseLight extends HandlerPattern {

	constructor(knxAPI) {
		super(knxAPI); // call the super constructor first. Always.
	}

	/****
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 * 
	 */
	onKNXValueChange(field, oldValue, knxValue) {
        var newValue; //Value for Homekit
        if(field === "On"){
            if((knxValue? 1:0) !== (oldValue? 1:0)){
               this.myAPI.setValue('On', newValue);
            }
       }
	} // onBusValueChange
	
	/****
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 * 
	 */
	onHKValueChange(field, oldValue, newValue) {
		if(oldValue === undefined) oldValue = false; //For automation to work, else undefined will be compared to newValue if the light has the same state as adjusted by automation

		log('INFO: onHKValueChange(' + field + ", "+ oldValue + ", "+ newValue + ")");
		if(field === "On" && oldValue !== newValue){
			this.myAPI.knxWrite(field, 1);
		}
	} // onHKValueChange

} // class	
module.exports = PulseLight;