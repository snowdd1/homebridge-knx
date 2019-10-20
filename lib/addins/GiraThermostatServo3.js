/*
 * The GiraThermostatServo3 is a mounted servo to a heater. It only has a
 * heating mode and therefore is rather difficult to apply in a HomeKit world.
 */

/* jshint esversion: 6, strict: true, node: true */

'use strict';
/**
 * @type {HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('GiraThermostatServo3Handler');

/**
 * @class A custom handler to modify HomeKit's annoying dimmer control
 * @extends HandlerPattern
 */
class GiraThermostatServo3 extends HandlerPattern {

	constructor(knxAPI) {
		super(knxAPI); // call the super constructor first. Always.
	}

	/****
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 */
	onKNXValueChange(field, oldValue, knxValue) {
		log('INFO: onKNXValueChange(' + field + ", "+ oldValue + ", "+ knxValue+ ") ");

		if ( field === 'TargetTemperature' ) {
			this.myAPI.setValue( 'TargetTemperature', knxValue );
		} else if ( field === 'CurrentTemperature' ) {
			this.myAPI.setValue( 'CurrentTemperature', knxValue );
		} else if ( field === 'CommandValue' ) {
			// The command value should be bound to function object 56 of
			// the GiraThermostatServo3. Allthough the type of output can either be
			// DTP 1.001 or DTP 5.001, we can safely assume that a value of 0 means
			// that the servo is cooling.
			//
			// The value property of CurrentHeatingCoolingState must be one of the following:
			// Characteristic.CurrentHeatingCoolingState.HEAT = 1;
			// Characteristic.CurrentHeatingCoolingState.COOL = 2;
			//
			// The state should not be OFF, as that makes an input of temperature impossible
			// in the Apple Home.app of iOS13.

			if ( knxValue === 0 ) {
				// The thermostat is closed, therefore cooling
				this.myAPI.setValue("CurrentHeatingCoolingState", 2);
			} else {
				// The thermostat is open, therfore heating
				this.myAPI.setValue("CurrentHeatingCoolingState", 1);
			}
		}

		// The device should not be 'off'.
		if ( this.myAPI.getValue( 'TargetHeatingCoolingState' ) === 0 ){
			this.myAPI.setValue("TargetHeatingCoolingState", 3);
		}

	} // onBusValueChange

	/****
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 */
	onHKValueChange(field, oldValue, newValue) {
		//
		log('INFO: onHKValueChange(' + field + ", "+ oldValue + ", "+ newValue + ")");

		if ( field === 'TargetTemperature' ) {
			this.myAPI.knxWrite( 'TargetTemperature', newValue );

			// Determine if we want the temerature to heat or cool
			var currentTemperature = this.myAPI.getValue( 'CurrentTemperature' );
			log( currentTemperature, newValue );
			if( currentTemperature < newValue ) {
				// We want it hotter
				this.myAPI.setValue("TargetHeatingCoolingState", 1);
			} else if ( currentTemperature >= newValue ) {
				// We want it cooler
				this.myAPI.setValue("TargetHeatingCoolingState", 2);
		}
		}
	} // onHKValueChange

} // class
module.exports=GiraThermostatServo3;

/* **********************************************************************************************************************
 *
 *
 *
 */
