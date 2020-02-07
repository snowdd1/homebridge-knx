/* The Dimmer issue is one of the oldest annoyances with Homekit:
 * HomeKit assumes that everyone wants to have each dimmable light switched on at 100% brightness, 
 * and that an additional ON command is good also when adjusting the brightness.
 * Both are wrong.
 * 
 *  There are multiple KNX dimmers on the market (and gateways to dali and others) that behave differently.
 *  
 *  
 */ 

/* jshint esversion: 6, strict: true, node: true */

'use strict';
/**
 * @type {HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('DimmerHandler');

/**
 * @class A custom handler to modify HomeKit's annoying dimmer control   
 * @extends HandlerPattern
 */
class Dimmer extends HandlerPattern {

	constructor(knxAPI) {
		super(knxAPI); // call the super constructor first. Always.
		this.timer = undefined;
		try {
			this.lastKnownBrightness = this.myAPI.getLocalConstant('InitBrightness');
		} catch  (e) {
			this.lastKnownBrightness = 100.0;
		}
		this.lastState = false; // off (assumption)

	}

	/****
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 * 
	 */
	onKNXValueChange(field, oldValue, knxValue) {
		// value for HomeKit
		var newValue;
		log('INFO: onKNXValueChange(' + field + ", "+ oldValue + ", "+ knxValue+ ") ");
		if (this.timer) {  
			/**
			 * was switched on recently:
			 *   KNX may switch off again
			 *   KNX may not:
			 *   	- change brightness within the timer period
			 *      - repeat the "switch on" command
			 */
			if (this.lastState===true) {
				// still in switch on timeout period
				if (field === 'On' && knxValue === 0) {
					// switched off
					this.lastState=false;
					clearTimeout(this.timer);
					this.timer = undefined;
					this.myAPI.setValue('On', false);
				}
			}  
		} else { 
			/**
			 *  Was not recently switched on:
			 *  KNX may change all conditions
			 */
			if (this.lastState===false) {
				/**
				 *  was off before
				 *  KNX may
				 *  - switch on
				 *  - change brightness 1%..100% (Zero percent would mean switch off, and that is already the case
				 *  
				 */
				if (field === 'On' && knxValue === 1) {
					// switching on
					this.lastState=true;
					clearTimeout(this.timer);
					this.timer = undefined;
					this.myAPI.setValue('On', true);
				} else if (field === 'Brightness' && knxValue>0) {
					// Brightness > larger than 0
					this.lastState=true;
					clearTimeout(this.timer);
					this.timer = undefined;
					this.myAPI.setValue('On', true);	
					this.myAPI.setValue('Brightness', knxValue/255*100);
				}
			} else {
				/**
				 * was on before
				 * KNX may change
				 * - switch off
				 * - change brightness to any value
				 */
				if (field === 'On' && knxValue ===0) {
					// switching off outside timer
					this.lastState=false;
					clearTimeout(this.timer);
					this.timer = undefined;
					this.myAPI.setValue('On', false);
				}
				if (field === 'Brightness') {
					if (knxValue>0) {
						this.lastState=true;	
						this.myAPI.setValue('Brightness', knxValue/255*100);
					} else {
						// switch off!
						this.lastState=false;
						clearTimeout(this.timer);
						this.timer = undefined;
						this.myAPI.setValue('On', false);	
						this.myAPI.setValue('Brightness', knxValue/255*100);						
					}
				}
			}
		}

	} // onBusValueChange

	/****
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 * 
	 */
	onHKValueChange(field, oldValue, newValue) {
		// 
		log('INFO: onHKValueChange(' + field + ", "+ oldValue + ", "+ newValue + ")");

		if (field === 'On') {
			if (newValue===true) {
				if (this.timer) {
					// the timer is still running, so we do not accept any new ON commands from homekit


					//clearTimeout(this.timer);
				} else {
					if (this.lastState === false){
						// light was off before
						if (this.myAPI.getLocalConstant('RestoreLastBrightness')) {
							// use only on 1 ping, vassily
							// restore brightness 
							this.myAPI.knxWrite('Brightness', this.lastKnownBrightness);

						} else {
							// we only use the ON command once to switch the light on
							this.myAPI.knxWrite('On',true);
						}
						// start the countdown
						this.timer = setTimeout(function() {
							this.timer = undefined;
						}.bind(this), this.myAPI.getLocalConstant('FadingTimeMS'));
						this.lastState = true; 
					} else {
						// light was already on
						// filter out the command completely
						// do nothing 
					}
				}
			} else {
				// switching off
				if (this.lastState===true) {
					// if it was on before, switch it off
					this.myAPI.knxWrite('On', false);
					this.lastState=false;
					clearTimeout(this.timer);
					this.timer = undefined;
				}
			}
		} else if (field==='Brightness') {
			var knxValue = newValue;  
			if (this.lastState===false) {
				// it was off before
				if (newValue===100) {
					// HomeKit meant "On"
					if (this.myAPI.getLocalConstant('RestoreLastBrightness')) {
						// use only on 1 ping, vassily
						// restore brightness 
						this.myAPI.knxWrite('Brightness', this.lastKnownBrightness);

					} else {
						// we only use the ON command once to switch the light on
						this.myAPI.knxWrite('On',true);
					}
					// start the countdown
					this.timer = setTimeout(function() {
						this.timer = undefined;
					}.bind(this), this.myAPI.getLocalConstant('FadingTimeMS'));
					this.lastState = true; 					
				} else {
					this.myAPI.knxWrite('Brightness', knxValue);
					this.lastKnownBrightness = knxValue;
				}
				//start to count down
				this.timer = setTimeout(function() {
					this.timer = undefined;
				}.bind(this), this.myAPI.getLocalConstant('FadingTimeMS'));
				this.lastState = true; 
			} else {
				// it was already lit
				if (!(this.timer && newValue===100)) {
					// not 100% and within the timeout period, good to send!
					this.myAPI.knxWrite('Brightness', knxValue);
					this.lastKnownBrightness = knxValue;
					// start new timeout to avoid flickering by knx feedback
					clearTimeout(this.timer);
					this.timer = setTimeout(function() {
						this.timer = undefined;
					}.bind(this), this.myAPI.getLocalConstant('FadingTimeMS'));
					this.lastState = true; 
				}
			}
		}

	} // onHKValueChange
} // class	
module.exports=	Dimmer;

/* **********************************************************************************************************************
 * The config for that should look like this 
 * Reverse keyword is not allowed for custom handlers
 * 
 * Customizable Dimmer control
 * "RestoreLastBrightness":  true 
 * 			If set to true, it will resume to last known brightness on switching on (regardless of 
 * 			brightness selected in HomeKit).
 * 			If set to false, it will only use an ON command and filter any brightness from the first 
 * 			commands within FadingTimeMS milliseconds. 
 * "FadingTimeMS": 100 
 * 			The time in milliseconds that the handler will suppress brightness and ON commands when switching on. 
 * "InitBrightness": 100.0 
 * 			The Brightness that will used if the previous brightness is not known, due to restart of the handler e.g. 
 * 
 * 
"Services": [{
	"ServiceType": "Lightbulb",
	"Handler": "Dimmer",
	"ServiceName": "dimmable lunch table light",
	"Characteristics": [{
		"Type": "On",
		"Set": "1/2/1",
		"Listen": ["1/2/3"]
	},{
		"Type": "Brightness",
		"Set": "1/3/1",
		"Listen": ["1/3/3"]
	}],
    "LocalConstants": {
        "FadingTimeMS": 100,
        "InitBrightness":30.0,
        "RestoreLastBrightness":true
    }
}]
 * 
 * 
 * 
 */


