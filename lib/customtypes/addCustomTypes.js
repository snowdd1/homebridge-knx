/**
 * Test for a custom service type
 */
/* jshint esversion: 6, strict: true, node: true */
'use strict';

var inherits = require('util').inherits;
var log = require('debug')('Add local custom characteristics and services');
const CustomKNXHomeKitTypes = require('./customKNXHomeKitTypes.js');

const util = require('util')


/** 
 *  @param {homebridge/lib/api~API} API
 */
module.exports = function(API) {

	// we are going to extend API.hap.Characteristic and API.hap.Service
	var Characteristic = API.hap.Characteristic;
	var Service = API.hap.Service;

	var myKNX = new CustomKNXHomeKitTypes(API);
	var charName, serviceName;
	var myCharacteristic, myService;

        for (charName in myKNX.Characteristics) {
		log("### Processing KNX Characteristics '" + charName + "' with UUID '" + myKNX.Characteristics[charName].UUID +"'");
		var myKNXName = "KNX" + charName;
		myCharacteristic = myKNX.Characteristics[charName];
		Characteristic[myKNXName] = myCharacteristic;
		inherits(Characteristic[myKNXName], Characteristic);
		Characteristic[myKNXName].UUID = myCharacteristic.UUID;
	}


        for (serviceName in myKNX.Services) {
		log("### Processing KNX Services '" + serviceName + "' with UUID '" + myKNX.Services[serviceName].UUID + "'");
		var myKNXName = "KNX" + serviceName;

		myService = myKNX.Services[serviceName];
		Service[myKNXName] = myService;
		inherits(Service[myKNXName], Service);
		Service[myKNXName].UUID = myService.UUID;
	}

	log('Done');
};

