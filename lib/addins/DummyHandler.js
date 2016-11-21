/* Sample module - Just for logging  
 * 
 * 
 */
'use strict';
/**
 * @type {HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('DummyHandler');

/**
 * @class A custom handler for the GIRA 216100 "Jalousie Aktor" (rolling shutter/blinds actuator)   
 * @extends HandlerPattern
 */
class DummyHandler extends HandlerPattern {

	/****
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 * 
	 */
	onKNXValueChange(field, oldValue, knxValue) {
		// value for HomeKit
		var newValue;
		log('INFO: onKNXValueChange(' + field + ", "+ oldValue + ", "+ knxValue+ ")");
		log('INFO: this.myAPI.getProperty(field, "minValue") returns ' + this.myAPI.getProperty(field, "minValue"));
		log('INFO: this.myAPI.getProperty(field, "maxValue") returns ' + this.myAPI.getProperty(field, "maxValue"));
		log('INFO: this.myAPI.getProperty(field, "perms") returns ' + this.myAPI.getProperty(field, "perms"));
	} // onBusValueChange
	
	/****
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 * 
	 */
	onHKValueChange(field, oldValue, newValue) {
		// homekit will only send a TargetPosition value, so we do not care about (non-) potential others
		log('INFO: onHKValueChange(' + field + ", "+ oldValue + ", "+ newValue + ")");
		log('INFO: this.myAPI.getProperty(field, "minValue") returns ' + this.myAPI.getProperty(field, "minValue"));
		log('INFO: this.myAPI.getProperty(field, "maxValue") returns ' + this.myAPI.getProperty(field, "maxValue"));
		log('INFO: this.myAPI.getProperty(field, "perms") returns ' + this.myAPI.getProperty(field, "perms"));
	} // onHKValueChange
} // class	
module.exports=	DummyHandler;

	
