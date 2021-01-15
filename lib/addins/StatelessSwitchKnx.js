/* StatelessSwitch

Published by user https://github.com/kakaki in issue https://github.com/snowdd1/homebridge-knx/issues/150
on June 19, 2020


 */
/* jshint esversion: 6, strict: true, node: true */

'use strict';
/**
 * @type {HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('StatelessSwitchKnx');

/**
 * @class A custom handler for the StatelessSwitch
 * @extends HandlerPattern
 */
class StatelessSwitchKnx extends HandlerPattern {

	constructor(knxAPI) {
		super(knxAPI); // call the super constructor first. Always.
		this.timer = undefined;
		this.timer2 = undefined;
	}
	
	/*******************************************************************************************************************
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 * 
	 */
	onKNXValueChange(field, oldValue, knxValue) {
		// value for HomeKit
		var lthis = this;
		log('INFO: onKNXValueChange(' + field + ", "+ oldValue + ", "+ knxValue+ ")");
		if (field==="ProgrammableSwitchEvent") {
			if (this.timer2) {
				clearTimeout(this.timer2);
				this.timer2 = undefined;
				log("Tripple press!");
				this.myAPI.setValue(field, 2); //set action for tripple click
			}
			else if (this.timer) {
				clearTimeout(this.timer);
				this.timer = undefined;

				log('Start double press timer!' + field);				
				this.timer2 = setTimeout(function(field) {
					// in 500ms set api to double click
					this.timer2 = undefined;
					log("Double press!");
					this.myAPI.setValue(field, 1); //set action for double click					
				}.bind(this), 500, field); // 500ms to give KNX a chance to double click
			} else {
				log('Start single press timer!' + field);
				this.timer = setTimeout(function(field) {
					// in 500ms set api to single click
					this.timer = undefined;
					log('Single press!');
					this.myAPI.setValue(field, 0); //set action for single click
					
				}.bind(this), 500, field); // 500ms to give KNX a chance to double click
			}			
		} //if
	} // onBusValueChange
	
	/*******************************************************************************************************************
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 * 
	 */
	onHKValueChange(field, oldValue, newValue) {
		log('STRANGE-THIS-SERVICE-IS-NOT-EXPECTED-TO-BE-WRITEABLE: onHKValueChange(' + field + ", "+ oldValue + ", "+ newValue + ")");
	} // onHKValueChange
} // class	
module.exports=	StatelessSwitchKnx;

	
/* **********************************************************************************************************************
 * 
"Services": [{
                    "ServiceType": "StatelessProgrammableSwitch",
                    "ServiceName": "Name",
                    "Handler": "StatelessSwitchKnx",
                    "Characteristics": [
                        {
                            "Type": "ProgrammableSwitchEvent",
                            "Set": [
                                "5/3/5"
                            ]
                            "Listen": [
                                "5/3/5"
                            ]
                        }
                    ]                    
                }]
 * 
 * 
 * 
 */
