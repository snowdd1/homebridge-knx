/* HistoryPower - Resets a switch after a given Timeout
 * 
 * This can be used for motion sensor that only send a "1" on motion, but never resets itself by sending a "0"
 * 
 */
/* jshint esversion: 6, strict: true, node: true */

'use strict';
/**
 * @type {HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('HistoryPower');
var moment = require('moment');

/**
 * @class A custom handler that can be used together with eve custom characteristics and allow to reset the 
 *        total consumption
 *
 * @extends HandlerPattern
 */
class HistoryPower extends HandlerPattern {

	constructor(knxAPI) {
		super(knxAPI); // call the super constructor first. Always.

		this.normalizeValue = undefined;
	}
	
	/****
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 * 
	 */
	onKNXValueChange(field, oldValue, knxValue) {
		var newValue;

		newValue = knxValue;

		log('INFO: HistoryPower - onKNXValueChange(' + field + ", "+ oldValue + ", "+ knxValue+ ")");

		// If we got the total consumption - e.g. meter count
		if (field == 'eveTotalConsumption') {

			// Init normalizeValue if not set before
			if (! this.normalizeValue) {
				var normalizeOnLaunch = this.myAPI.getLocalConstant("NormalizeOnLaunch") || false;

				if (normalizeOnLaunch) {
					log('INFO: HistoryPower - Got TotalConsumption for the first time...use this to normalize values');
					this.normalizeValue = knxValue;
				} else {
					this.normalizeValue = 0;
				}
			}

			// Normalize value
			newValue = newValue - this.normalizeValue;
		}


		this.myAPI.setValue(field, newValue);
		
	} // onBusValueChange
	
	/****
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 * 
	 */
	onHKValueChange(field, oldValue, newValue) {

		log('INFO: HistoryPower - onHKValueChange(' + field + ", "+ oldValue + ", "+ newValue + ")");

		// Handle request to clear the internal counter - onHKValueChange(eveResetTotal, null, 550568819)
		if (field === "eveResetTotal") {
			this.normalizeValue = this.myAPI.getValue("eveTotalConsumption") ;
			this.myAPI.setValue('eveTotalConsumption', 0);
			log('INFO: HistoryPower - Resetting TotalConsumption');
		}
	} // onHKValueChange
} // class	
module.exports=	HistoryPower;

/*

	Setting "NormalizeOnLaunch" to true will use the current meter count as a base 
	instead of using the absolute readings. So you will see relative consumtption
	from the time you launched Homebridge


        {
            "DeviceName": "Eve Power EEE",
            "Services": [
                {
                    "ServiceType": "evePowerMeter",
                    "Handler": "HistoryPower",
                    "ServiceName": "EVE Power EEE",
                    "Characteristics": [
                        {
                            "Type": "eveCurrentConsumption",
                            "Listen": [
                                "6/6/69"
                            ]
                        },
                        {
                            "Type": "eveTotalConsumption",
                            "Listen": [
                                "6/6/66"
                            ],
			    "DPT": "DPT14"
                        },
                        {
                            "Type": "eveVoltage"
                        },
                        {
                            "Type": "eveElectricCurrent"
                        },
                        {
                            "Type": "eveResetTotal"
                        }
                    ],
                    "LocalConstants": {
                        "NormalizeOnLaunch": true
                    }
                }
            ]
            "HistoryType": "energy",
	}


*/
	
