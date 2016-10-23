/* Sample module - Just for logging  
 * 
 * 
 */
'use strict';
/**
 * @type {HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('MonoStableMultivibrator');

/**
 * @class A custom handler that switches back a homekit switch to off after one second   
 * @extends HandlerPattern
 */
class MonoStableMultivibrator extends HandlerPattern {

	constructor(knxAPI) {
		super(knxAPI); // call the super constructor first. Always.
		this.timer = undefined;
	}
	
	/****
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 * 
	 */
	onKNXValueChange(field, oldValue, knxValue) {
		// value for HomeKit
		var newValue;
		log('INFO: onKNXValueChange(' + field + ", "+ oldValue + ", "+ knxValue+ ")");
	} // onBusValueChange
	
	/****
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 * 
	 */
	onHKValueChange(field, oldValue, newValue) {
		// 
		log('INFO: onHKValueChange(' + field + ", "+ oldValue + ", "+ newValue + ")");
		if (this.timer) {
			log("Aborting old timer!");
			clearTimeout(this.timer);
		} else if (newValue===1){
			log("Setting new timer!");
			this.timer = setTimeout(function(field) {
				// in 1000ms set the value back to off:
				log('Timer reached!');
				this.myAPI.setValue(field, 0);
				this.timer = undefined;
			}.bind(this), 1000, field);
		}
	} // onHKValueChange
} // class	
module.exports=	MonoStableMultivibrator;

	
