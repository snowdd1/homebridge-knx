/**
 * Test for a custom service type
 */
/* jshint esversion: 6, strict: true, node: true */
'use strict';

var hapConstants = require('../hapConstants');
var log = require('debug')('KNXThermostat custom service/characteristic');

/**
 *  @param {homebridge/lib/api~API} API
 */
module.exports = function(API) {


	// we are going to extend API.hap.Characteristic and API.hap.Service

	var Characteristic = API.hap.Characteristic;
	var Service = API.hap.Service;

	// newer hap-nodejs versions (Homebridge 2.0+) require ES6 class inheritance instead
	// of the old Characteristic.call() / util.inherits() pattern.
	// https://github.com/snowdd1/homebridge-knx/issues/218
	class KNXThermAtHome extends Characteristic {
		constructor() {
			super('At Home', '00001025-0000-1000-8000-0026BB765292');
			this.setProps({
				format : hapConstants.Formats.BOOL,
				perms : [
					hapConstants.Perms.READ,
					hapConstants.Perms.WRITE,
					hapConstants.Perms.NOTIFY ]
			});
			this.value = this.getDefaultValue();
		}
	}
	KNXThermAtHome.UUID = '00001025-0000-1000-8000-0026BB765292';
	Characteristic.KNXThermAtHome = KNXThermAtHome;

	log('Done');
};


// preparation for online type updater
/*
var http = require('http');
var url = 'http://github.com/snowdd1/homebridge-knx/blob/master/custom/characteristics.json';

http.get(url, function(res){
    var body = '';

    res.on('data', function(chunk){
        body += chunk;
    });

    res.on('end', function(){
    	try {
    		var fbResponse = JSON.parse(body);
    		console.log("Loading online custom types: Got a response: ", fbResponse);
//    		****
//    		 * Here the magic will happen
//    		**** 
    		
    		
    	} catch (err) {
    		console.log("Loading custom types: Got an parser error: ", err);
    		console.log("Don't care, continue...");
    	}

    });
}).on('error', function(e){
      console.log("Loading custom types: Got an error: ", e);
});
*/

