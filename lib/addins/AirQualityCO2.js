/* Module - Simple handler for a CO2 sensor
 * AirQualityCO2.js
 * Matevz Gacnik, @matevzg
 */
/* jshint esversion: 6, strict: true, node: true */

'use strict';

/**
 * @type {HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('AirQualityCO2');

/**
 * @extends HandlerPattern
 */
class AirQualityCO2 extends HandlerPattern {

	/*******************************************************************************************************************
	 * onKNXValueChange is invoked if a bus value for one of the bound addresses is received
	 * 
	 */
	onKNXValueChange(field, oldValue, knxValue) {
		console.log('INFO: onKNXValueChange(' + field + ", "+ oldValue + ", "+ knxValue+ ")");

		if (field === "CarbonDioxideLevel") {
			// CarbonDioxideLevel is DPT9.001
			
			if (knxValue > this.myAPI.getLocalConstant("PoorAirQuality")) this.myAPI.setValue("AirQuality", 5);
			else if (knxValue >= this.myAPI.getLocalConstant("InferiorAirQuality")) this.myAPI.setValue("AirQuality", 4);
			else if (knxValue >= this.myAPI.getLocalConstant("FairAirQuality")) this.myAPI.setValue("AirQuality", 3);
			else if (knxValue >= this.myAPI.getLocalConstant("GoodAirQuality")) this.myAPI.setValue("AirQuality", 2);
			else if (knxValue >= this.myAPI.getLocalConstant("ExcellentAirQuality")) this.myAPI.setValue("AirQuality", 2);
			else if (knxValue < this.myAPI.getLocalConstant("ExcellentAirQuality")) this.myAPI.setValue("AirQuality", 1);
			
			// inform HomeKit
			this.myAPI.setValue("CarbonDioxideLevel", knxValue);
		}
	}
}

module.exports = AirQualityCO2;

/* Example configuration
 * Add this service to an exitsing device
 
{
	"ServiceType": "AirQualitySensor",
	"ServiceName": "CO2 Sensor",
	"Handler": "AirQualityCO2",
	"Characteristics": [
		{
			"Type": "AirQuality"
		},
		{
			"Type": "CarbonDioxideLevel",
			"Listen": [
				"0/2/12"
			],
			"DPT": "DPT9"
		}
	],
	"KNXReadRequests": [
		"0/2/12"
	],
	"LocalConstants": {
		"ExcellentAirQuality": 900,
		"GoodAirQuality": 1000,
		"FairAirQuality": 1100,
		"InferiorAirQuality": 1300,
		"PoorAirQuality": 1500
	}
}
*/