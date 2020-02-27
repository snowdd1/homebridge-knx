/* jshint esversion: 6, strict: true, node: true */

'use strict';
/**
 * @classdesc HandlerPattern is the prototype for all custom event handlers
 */
class HandlerPattern {
	
	/**
	 * Creates a HandlerPattern custom event handler object
	 * @param {./customServiceAPI.js~API} knxAPI - the API instance for this handler
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

    /****
     * onServiceInit() is invoked when the service is done initializing in HomeKit - however, other Devices/Services are not necessarily finished.
     * Based on ctschach's code in https://github.com/ctschach/homebridge-knx/commit/5829bf2a1ccf2fa34e37b4d55d87c763a0d5e786
     * */
    onServiceInit() {
        // optional

    }


    /****
     * onHomeKitReady() is invoked after ALL devices are initiated in HomeKit and HomeKit starts normal operation
     * */
    onHomeKitReady() {
        // optional
    }

  


} // class	
	
module.exports = HandlerPattern;	
