/**
 * Test for a custom service type
 */
/* jshint esversion: 6, strict: true, node: true */
'use strict';

var inherits = require('util').inherits;
var log = require('debug')('Elgato eve custom service/characteristic');
var homebridgeLib = require('homebridge-lib');

const util = require('util')


/** 
 *  @param {homebridge/lib/api~API} API
 */
module.exports = function(API) {

	// we are going to extend API.hap.Characteristic and API.hap.Service
	var Characteristic = API.hap.Characteristic;
	var Service = API.hap.Service;

	var eve = new homebridgeLib.EveHomeKitTypes(API);
	var charEveName, serviceEveName;
	var eCharacteristic, eService;

        for (charEveName in eve.Characteristic) {
		log("### Processing eve Characteristics '" + charEveName + "' with UUID '" + eve.Characteristic[charEveName].UUID +"'");
		var eveName = "eve" + charEveName;
		eCharacteristic = eve.Characteristic[charEveName];
		Characteristic[eveName] = eCharacteristic;
		inherits(Characteristic[eveName], Characteristic);
		Characteristic[eveName].UUID = eCharacteristic.UUID;
	}


        for (serviceEveName in eve.Service) {
		log("### Processing eve Services '" + serviceEveName + "' with UUID '" + eve.Service[serviceEveName].UUID + "'");
		var eveName = "eve" + serviceEveName;

		eService = eve.Service[serviceEveName];
		Service[eveName] = eService;
		inherits(Service[eveName], Service);
		Service[eveName].UUID = eService.UUID;
	}

	log('Done');
};

