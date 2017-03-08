/**
 * Test for a custom service type
 */
'use strict';

var inherits = require('util').inherits;
var log = require('debug')('KNXThermostat custom service/characteristic');

/** 
 *  @param {homebridge/lib/api~API} API
 */
module.exports = function(API) {

	
	// we are going to extend API.hap.Characteristic and API.hap.Service

	var Characteristic = API.hap.Characteristic;
	var Service = API.hap.Service;

	Characteristic.KNXThermAtHome = function() {
		Characteristic.call(this, 'At Home', '00001025-0000-1000-8000-0026BB765292');
		this.setProps({
			format : Characteristic.Formats.BOOL,
			perms : [
				Characteristic.Perms.READ,
				Characteristic.Perms.WRITE,
				Characteristic.Perms.NOTIFY ]
		});
		this.value = this.getDefaultValue();
	};
	inherits(Characteristic.KNXThermAtHome, Characteristic);
	Characteristic.KNXThermAtHome.UUID = '00001025-0000-1000-8000-0026BB765292';

	log('Done');
};


// preparation for online type updater

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
    		/* ****
    		 * Here the magic will happen
    		 */
    		
    		
    	} catch (err) {
    		console.log("Loading custom types: Got an parser error: ", err);
    		console.log("Don't care, continue...");
    	}

    });
}).on('error', function(e){
      console.log("Loading custom types: Got an error: ", e);
});


