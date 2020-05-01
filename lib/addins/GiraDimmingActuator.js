/* The Dimmer issue is one of the oldest annoyances with Homekit:
 * HomeKit assumes that everyone wants to have each dimmable light switched on at 100% brightness,
 * and that an additional ON command is good also when adjusting the brightness.
 * Both are wrong.
 *
 *
 */

/* jshint esversion: 6, strict: true, node: true */

'use strict';
/**
 * @type {HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('GiraDimmingActuatorHandler');

/**
 * @class A custom handler to modify HomeKit's annoying dimmer control
 * @extends HandlerPattern
 */
class GiraDimmingActuator extends HandlerPattern {

	constructor(knxAPI) {
		super(knxAPI); // call the super constructor first. Always.

		this.OnOfDebounce = undefined;
		try {
			this.debounceTime = this.myAPI.getLocalConstant('DebounceMS');
		} catch  (e) {
			this.debounceTime = 300;
		}

		this.lastKnownValue = {
			On: false,
			Brightness: 0,
		}
	}

	/****
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 *
	 */
	onKNXValueChange(field, oldValue, knxValue) {
		log('INFO: onKNXValueChange(' + field + ", "+ oldValue + ", "+ knxValue+ ") ");

		// Handle On Change
		if ( field === 'On' ) {
			this.myAPI.setValue('On', knxValue ? true : false);
			this.lastKnownValue.On = knxValue ? true : false;
		}

		// Handle Brightness Change
		if ( field === 'Brightness' ) {
			// The brightness value received is 0..255, HK expects 0..100
			var brightnessValue = knxValue / 255 * 100;
			this.myAPI.setValue('Brightness', brightnessValue);
			this.lastKnownValue.Brightness = brightnessValue;
		}
	} // onBusValueChange

	/****
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 *
	 * The major change against the normal Lightbulb is the fact that we debounce
	 * 'On' writes after we set a brightness. This is needed due to the behavior
	 * of the Apple Home.app, where an 'On' command is sent after each brightness
	 * change.
	 *
	 */
	onHKValueChange(field, oldValue, newValue) {
		//
		log('INFO: onHKValueChange(' + field + ", "+ oldValue + ", "+ newValue + ")");


		if ( field === 'On' ) {
			if ( this.OnOfDebounce === undefined ) {
				this.myAPI.knxWrite( 'On', newValue ? true : false, 'DPT1' );
			}
		}

		if ( field === 'Brightness' ) {
			this.myAPI.knxWrite('Brightness', newValue, 'DPT5.001');

			if( this.myAPI.getValue( 'On' ) ) {
				this.debounce();
			}
		}
	} // onHKValueChange

	debounce() {
		this.OnOfDebounce = setTimeout(function() {
			this.OnOfDebounce = undefined;
		}.bind( this ), this.debounceTime);
	} // debounce
} // class
module.exports=GiraDimmingActuator;

/* **********************************************************************************************************************
 *
 *
 *
 */
