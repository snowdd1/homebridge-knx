'use strict';
/**
 * @classdesc HandlerPattern is the prototype for all custom event handlers
 */
class HandlerPattern {
	
	/**
	 * Creates a HandlerPattern custom event handler object
	 * @param {API} knxAPI - the API instance for this handler
	 */
	constructor(knxAPI) {
		this.myAPI=knxAPI;
	}
	
	/****
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 * 
	 */
	onKNXValueChange(field, oldValue, newValue) {
		throw new Error('IMPLEMENTATION MISSING.');
	} // onBusValueChange
	
	/****
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 * 
	 */
	onHKValueChange(field, oldValue, newValue) {
		throw new Error('IMPLEMENTATION MISSING.');
		
	} // onHKValueChange
} // class	
	
module.exports = HandlerPattern;	
