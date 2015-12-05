/*****
 * Platform shim for use with nfarina's homebridge plugin system 
 * This is the version for plugin support
 * ******************************************************************************************** 
 * 
New 2015-09-16: Welcome iOS9.0
new features include:
-  services: 
-  Window
-  WindowCovering
-  ContactSensor
New 2015-09-18: 
-  Services Switch and Outlet
-  Code cleanup
New 2015-09-19:
-  GarageDoorOpener Service
-  MotionSensor Service
New 2015-10-02:
- Check for valid group addresses
- new "R" flag allowed for Boolean addresses: 1/2/3R is the boolean not(1/2/3), i.e. 0 and 1 switched on read and write
New 2015-11-05:
- now fully supports the official homebridge version 0.2.0
New 2015-11-18:
- get rid of obsolete "knxdevice" accessory_type (there is only one anyhow!)
  accessory_type is not required in config.json section platform KNX accessories any more.
New 2015-12-01
- new flag for 'knxd_do_not_read_set_groups' true or false:
  when true neither READ requests are sent to the bus nor is listened to "SET" group addresses (you might duplicate them to "Listen":[] if required)
 * 
 */



/**** TO DO s
 *   Generate own persiistence layer, see:
 *   https://github.com/simonlast/node-persist#factory-method
 */



'use strict';
//var types = require("HAP-NodeJS/accessories/types.js"); // is not to be used any more
var knxd = require('eibd');
var Hapi = require('hapi');

var Service, Characteristic; // passed default objects from hap-nodejs



function KNXPlatform(log, config){
	this.log = log;
	this.config = config;

}


function registry(homebridge) {
	//console.log("HERE: hombridge-knx/index.js/registry()");
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	homebridge.registerPlatform("homebridge-knx", "KNX", KNXPlatform); //update signature for homebridge 0.2.0
}

KNXPlatform.prototype = {
		accessories: function(callback) {
			this.log("Fetching KNX devices.");
			var that = this;


			// iterate through all devices the platform my offer
			// for each device, create an accessory

			// read accessories from file !!!!!
			var foundAccessories = this.config.accessories; 


			//create array of accessories
			var myAccessories = [];

			for (var int = 0; int < foundAccessories.length; int++) {
				this.log("parsing acc " + int + " of " + foundAccessories.length);
				// instantiate and push to array

				this.log("push new device "+foundAccessories[int].name);
				// push knxd connection setting to each device from platform
				foundAccessories[int].knxd_ip = this.config.knxd_ip;
				foundAccessories[int].knxd_port = this.config.knxd_port;
				foundAccessories[int].knxd_do_not_read_set_groups = this.config.knxd_do_not_read_set_groups; // new
				//var accConstructor = require('./knxdevice.js');
				var acc = new KNXDevice(this.log,foundAccessories[int]);
				this.log("created "+acc.name+" accessory");	
				myAccessories.push(acc);
			}	
			// if done, return the array to callback function
			this.log("returning "+myAccessories.length+" accessories");
			callback(myAccessories);
		}
};


/**
 * The buscallbacks module is to expose a simple function to listen on the bus and register callbacks for value changes
 * of registered addresses.
 * 
 * Usage:
 *	 You can start the monitoring process at any time
	 startMonitor({host: name-ip, port: port-num });

 *	 You can add addresses to the subscriptions using 

registerGA(groupAddress, callback)

 *	 groupAddress has to be an groupAddress in common knx notation string '1/2/3'
 *	 the callback has to be a 
 *	 	var f = function(value) { handle value update;}
 *	 so you can do a 
 *	 	registerGA('1/2/3', function(value){
 *	 		console.log('1/2/3 got a hit with '+value);
 *	 		});
 *	 but of course it is meant to be used programmatically, not literally, otherwise it has no advantage
 *	
 *	 You can also use arrays of addresses if your callback is supposed to listen to many addresses:

registerGA(groupAddresses[], callback)

 *	as in 
 *	 	registerGA(['1/2/3','1/0/0'], function(value){
 *	 		console.log('1/2/3 or 1/0/0 got a hit with '+value);
 *	 		});
 *  if you are having central addresses like "all lights off" or additional response objects
 *  
 *  
 *  callbacks can have a signature of
 *  function(value, src, dest, type) but do not have to support these parameters (order matters)
 *  src = physical address such as '1.1.20'
 *  dest = groupAddress hit (you subscribed to that address, remember?), as '1/2/3'
 *  type = Data point type, as 'DPT1' 
 *  
 *  	
 */



//array of registered addresses and their callbacks
var subscriptions = []; 
//check variable to avoid running two listeners
var running; 

function groupsocketlisten(opts, callback) {
	var conn = knxd.Connection();
	conn.socketRemote(opts, function(err) {
		if (err) {
			// a fatal error occurred
			console.log("FATAL: knxd or eibd not reachable");
			throw new Error("Cannot reach knxd or eibd service, please check installation and config.json");
		}
		conn.openGroupSocket(0, callback);
	});
}


var registerSingleGA = function registerSingleGA (groupAddress, callback, reverse) {
	subscriptions.push({address: groupAddress, callback: callback, reverse:reverse });
};

/*
 * public busMonitor.startMonitor()
 * starts listening for telegrams on KNX bus
 * 
 */ 
var startMonitor = function startMonitor(opts) {  // using { host: name-ip, port: port-num } options object
	if (!running) {
		running = true;
	} else {
		console.log("<< knxd socket listener already running >>");
		return null;
	}
	console.log(">>> knxd groupsocketlisten starting <<<");	
	groupsocketlisten(opts, function(parser) {
		//console.log("knxfunctions.read: in callback parser");
		parser.on('write', function(src, dest, type, val){
			// search the registered group addresses
			//console.log('recv: Write from '+src+' to '+dest+': '+val+' ['+type+'], listeners:' + subscriptions.length);
			for (var i = 0; i < subscriptions.length; i++) {
				// iterate through all registered addresses
				if (subscriptions[i].address === dest) {
					// found one, notify
					//console.log('HIT: Write from '+src+' to '+dest+': '+val+' ['+type+']');
					subscriptions[i].lastValue = {vaL: val, src: src, dest: dest, type: type, date:Date()};
					subscriptions[i].callback(val, src, dest, type, subscriptions[i].reverse);
				}
			}
		});

		parser.on('response', function(src, dest, type, val) {
			// search the registered group addresses
//			console.log('recv: resp from '+src+' to '+dest+': '+val+' ['+type+']');
			for (var i = 0; i < subscriptions.length; i++) {
				// iterate through all registered addresses
				if (subscriptions[i].address === dest) {
					// found one, notify
//					console.log('HIT: Response from '+src+' to '+dest+': '+val+' ['+type+']');
					subscriptions[i].lastValue = {val: val, src: src, dest:dest, type:type, date:Date()};
					subscriptions[i].callback(val, src, dest, type, subscriptions[i].reverse);
				}
			}

		});

		
		// check if a tiny web server could show current status *******************************************************************************
		// Create a server with a host and port
		var server = new Hapi.Server();
		server.connection({ port: 3000 });

		server.route({
		    method: 'GET',
		    path: '/',
		    handler: function (request, reply) {
		    	var answer = "<html><title>Subscriptions</title><body>";
		    	var name, nextlevelname;
		    	answer += "<TABLE>";
		    	for (var i = 0; i < subscriptions.length; i++) {
		    		answer += "<TR>";
		    		for (name in  subscriptions[i]) {
		    		    if (typeof subscriptions[i][name] !== 'function') {
		    		    	if (typeof subscriptions[i][name] !== 'object' ) {
		    		    		answer += ("<TD>" + name + ': ' + subscriptions[i][name] +"</TD>"); 
		    		    	} else {
		    		    		for (nextlevelname in  subscriptions[i][name]) {
		    		    		    if (typeof subscriptions[i][name][nextlevelname] !== 'function') {
		    		    		    	if (typeof subscriptions[i][name][nextlevelname] !== 'object' ) {
		    		    		    		answer += ("<TD>" + nextlevelname + ': ' + subscriptions[i][name][nextlevelname]) + "</TD> ";
		    		    		    	} 
		    		    		    } 
		    		    		}
		    		    	}
		    		    } 
		    		}
		    		answer += "</TR>";
		    	}
		        reply(answer + "</body></html>");
		    }
		});

		server.route({
		    method: 'GET',
		    path: '/{name}',
		    handler: function (request, reply) {
		        reply('Hello, ' + encodeURIComponent(request.params.name) + '!');
		    }
		});

		server.start(function () {
		    console.log('Server running at:', server.info.uri);
		});
		
		
		
		
	}); // groupsocketlisten parser
}; //startMonitor


/*
 *  public registerGA(groupAdresses[], callback(value))
 *  parameters
 *  	callback: function(value, src, dest, type) called when a value is sent on the bus
 *  	groupAddresses: (Array of) string(s) for group addresses
 * 
 *  
 *  
 */
var registerGA = function (groupAddresses, callback) {
	// check if the groupAddresses is an array
	if (groupAddresses.constructor.toString().indexOf("Array") > -1) {
		// handle multiple addresses
		for (var i = 0; i < groupAddresses.length; i++) {
			if (groupAddresses[i] && groupAddresses[i].match(/(\d*\/\d*\/\d*)/)) { // do not bind empty addresses or invalid addresses
				// clean the addresses
				registerSingleGA (groupAddresses[i].match(/(\d*\/\d*\/\d*)/)[0], callback,groupAddresses[i].match(/\d*\/\d*\/\d*(R)/) ? true:false );
			}
		}
	} else {
		// it's only one
		if (groupAddresses.match(/(\d*\/\d*\/\d*)/)) {
			registerSingleGA (groupAddresses.match(/(\d*\/\d*\/\d*)/)[0], callback, groupAddresses.match(/\d*\/\d*\/\d*(R)/) ? true:false);
		}
	}
//	console.log("listeners now: " + subscriptions.length);
};



//module.exports.platform = KNXPlatform;
//module.exports.registerGA = registerGA;
//module.exports.startMonitor = startMonitor;
module.exports = registry;


/************************************************************************************************************************************************
 *  this section replaces the knxdevice.js file
 */


//var Service = require("HAP-NodeJS").Service;
//var Characteristic = require("HAP-NodeJS").Characteristic;
//var knxd = require("eibd");
//var knxd_registerGA = require('./KNX.js').registerGA;
//var knxd_startMonitor = require('./KNX.js').startMonitor;

var milliTimeout = 300; // used to block responses while swiping

var colorOn = "\x1b[30;47m";
var colorOff = "\x1b[0m";

function KNXDevice(log, config) {
	this.log = log;
	// everything in one object, do not copy individually
	this.config = config;
	log("Accessory constructor called");
	if (config.name) {
		this.name = config.name;
	}
	if (config.uuid_base){
		this.uuid_base = config.uuid_base;
	}
	if (config.knxd_ip){
		this.knxd_ip = config.knxd_ip;
	} else {
		throw new Error("KNX configuration fault: MISSING KNXD IP");
	}
	if (config.knxd_port){
		this.knxd_port = config.knxd_port;
	} else {
		throw new Error("MISSING KNXD PORT");
	}
	this.knxd_do_not_read_set_groups = config.knxd_do_not_read_set_groups ? true:false; // convert trueish to true

}

/*********
 *  DEBUGGER FUNCTION ONLY
 */

//inspects an object and prints its properties (also inherited properties) 
var iterate = function nextIteration(myObject, path){
	// this function iterates over all properties of an object and print them to the console
	// when finding objects it goes one level  deeper
	var name;
	if (!path){ 
		console.log("---iterating--------------------");
	}
	for (name in myObject) {
		if (typeof myObject[name] !== 'function') {
			if (typeof myObject[name] !== 'object' ) {
				console.log((path  || "") + name + ': ' + myObject[name]);
			} else {
				nextIteration(myObject[name], path ? path + name + "." : name + ".");
			}
		} else {
			console.log((path  || "") + name + ': (function)' );
		}
	}
	if (!path) {
		console.log("================================");
	}
};


// function to avoid out of bounds for fixed-value characteristics
// for float types this is already managed by hap-nodeJS itself
// returns a value that can be safely used in 
var safeSet = function(char, value) {
	console.log("DEBUG: entered safeSet");
	//iterate(char);
	if (char.props.format==="uint8") {
		console.log("DEBUG: format ok");
		// fixed-value formats use unsigned integer AFAIK
		if (!char.hasOwnProperty("validValues")) {
			console.log("DEBUG: establishing safe values");
			// we need to find those first
			// find the prototype
			var displayName = char.displayName;
			if (Characteristic.hasOwnProperty(displayName.replace(/ /g,''))) {
				var chartype = displayName.replace(/ /g,'');
				console.log("DEBUG: chartype " + chartype);
				for (var name in Characteristic[chartype]) {
					//console.log("DEBUG: chartype.name " + name);
					if (Characteristic[chartype].hasOwnProperty(name)){
						console.log("DEBUG: typeof chartype.name " + typeof Characteristic[chartype][name]);
						if (typeof Characteristic[chartype][name] === 'number' ) {
							// add it to the array
							if (char.hasOwnProperty("validValues")){
								char.validValues = char.validValues.concat(Characteristic[chartype][name]);
								console.log("DEBUG: following: length " + char.validValues.length);
							} else {
								char.validValues = [Characteristic[chartype][name]];
								console.log("DEBUG: 1st: length " + char.validValues.length);
							}
						}
					}
				}
			}
			console.log("DEBUG: " + char.displayName + " has now validValue of "+ char.validValues );
		}
		// compare value to allowed values
		if (char.hasOwnProperty("validValues")) {
			//do the check
			if (char.validValues.indexOf(value)<0) { 
				// didn't find
				console.log("DEBUG: " + char.displayName + " has validValue of "+ char.validValues );
				console.log("DEBUG: " + char.displayName + " ERROR illegal value "+ value );
				value =  char.validValues[0]; // default to first one
				console.log("DEBUG: " + char.displayName + " ERROR returned instead "+ value );
			}
		}
		
	} else {
		console.log("DEBUG: " + char.props.format + "!== uint8");
	}
	return value;
};



KNXDevice.prototype = {

		// all purpose / all types write function	
		knxwrite: function(callback, groupAddress, dpt, value) {
			// this.log("DEBUG in knxwrite");
			var knxdConnection = new knxd.Connection();
			// this.log("DEBUG in knxwrite: created empty connection, trying to connect socket to "+this.knxd_ip+":"+this.knxd_port);
			knxdConnection.socketRemote({ host: this.knxd_ip, port: this.knxd_port }, function(err) {
				if (err) {
					// a fatal error occurred
					console.log("FATAL: knxd or eibd not reachable");
					throw new Error("Cannot reach knxd or eibd service, please check installation and config.json");
				}
				var dest = knxd.str2addr(groupAddress);
				// this.log("DEBUG got dest="+dest);
				knxdConnection.openTGroup(dest, 1, function(err) {
					if (err) {
						this.log("[ERROR] knxwrite:openTGroup: " + err);
						callback(err);
					} else {
						// this.log("DEBUG opened TGroup ");
						var msg = knxd.createMessage('write', dpt, parseFloat(value));
						knxdConnection.sendAPDU(msg, function(err) {
							if (err) {
								this.log("[ERROR] knxwrite:sendAPDU: " + err);
								callback(err);
							} else {
								this.log("knx data sent: Value "+value+ " for GA "+groupAddress);
								callback();
							}
						}.bind(this));
					}
				}.bind(this));
			}.bind(this));
		},	
		// issues an all purpose read request on the knx bus
		// DOES NOT WAIT for an answer. Please register the address with a callback using registerGA() function
		knxread: function(groupAddress){
			// this.log("DEBUG in knxread");
			if (!groupAddress) {
				return null;
			}
			this.log("[knxdevice:knxread] preparing knx request for "+groupAddress);
			var knxdConnection = new knxd.Connection();
			// this.log("DEBUG in knxread: created empty connection, trying to connect socket to "+this.knxd_ip+":"+this.knxd_port);
			knxdConnection.socketRemote({ host: this.knxd_ip, port: this.knxd_port }, function() {
				var dest = knxd.str2addr(groupAddress);
				// this.log("DEBUG got dest="+dest);
				knxdConnection.openTGroup(dest, 1, function(err) {
					if (err) {
						this.log("[ERROR] knxread:openTGroup: " + err);
					} else {
						// this.log("DEBUG knxread: opened TGroup ");
						var msg = knxd.createMessage('read', 'DPT1', 0);
						knxdConnection.sendAPDU(msg, function(err) {
							if (err) {
								this.log("[ERROR] knxread:sendAPDU: " + err);
							} else {
								this.log("[knxdevice:knxread] knx request sent for "+groupAddress);
							}
						}.bind(this));
					}
				}.bind(this));
			}.bind(this));		
		},
		// issuing multiple read requests at once 
		knxreadarray: function (groupAddresses) {
			if (groupAddresses.constructor.toString().indexOf("Array") > -1) {
				// handle multiple addresses
				for (var i = 0; i < groupAddresses.length; i++) {
					if (groupAddresses[i]) { // do not bind empty addresses
						this.knxread (groupAddresses[i].match(/(\d*\/\d*\/\d*)/)[0]); // clean address
					}
				}
			} else {
				// it's only one
				this.knxread (groupAddresses.match(/(\d*\/\d*\/\d*)/)[0]); // regex for cleaning address
			}
		},

/** Registering routines
 * 
 */
		// boolean: get 0 or 1 from the bus, write boolean
		knxregister_bool: function(addresses, characteristic) {
			this.log("knx registering BOOLEAN " + addresses);
			registerGA(addresses, function(val, src, dest, type, reverse){
				this.log("[" +this.name + "]: Received value from bus:"+val+ " for " +dest+ " from "+src+" of type "+type + " for " + characteristic.displayName);
//				iterate(characteristic);
				
				characteristic.setValue(val ? (reverse ? 0:1) : (reverse ? 1:0), undefined, 'fromKNXBus');
			}.bind(this));
		},

		// percentage: get 0..255 from the bus, write 0..100 to characteristic
		knxregister_percent: function(addresses, characteristic) {
			this.log("knx registering PERCENT " + addresses);
			registerGA(addresses, function(val, src, dest, type, reverse){
				this.log("[" +this.name + "]: Received value from bus:"+val+ " for " +dest+ " from "+src+" of type "+type+ " for " + characteristic.displayName);
				if (type !== "DPT5") {
					this.log("[ERROR] Received value cannot be a percentage value");
				} else {
					characteristic.setValue(Math.round(( reverse ? (255-val):val)/255*100), undefined, 'fromKNXBus');
				}
			}.bind(this));
		},
		// float
		knxregister_float: function(addresses, characteristic) {
			// update for props refactor https://github.com/KhaosT/HAP-NodeJS/commit/1d84d128d1513beedcafc24d2c07d98185563243#diff-cb84de3a1478a38b2cf8388d709f1c1cR50
			
			var validValue = true;
			var hk_value = 0.0;
			this.log("["+ this.name +"]:[" + characteristic.displayName+ "]:knx registering FLOAT " + addresses);
			registerGA(addresses, function(val, src, dest, type, reverse){
				this.log("["+ this.name +"]:[" + characteristic.displayName+ "]: Received value from bus:"+val+ " for " +dest+ " from "+src+" of type "+type+ " for " + characteristic.displayName);
				// make hk_value compliant to properties
				if (characteristic.props.minStep) {
					// quantize
					hk_value = Math.round(val/characteristic.props.minStep)/(1/characteristic.props.minStep);	
				} else {
					hk_value = val;
				}
				// range check
				validValue = true; // assume validity at beginning
				if (characteristic.props.minValue) {
					validValue = validValue && (hk_value>=characteristic.props.minValue);
				}
				if (characteristic.props.maxValue) {
					validValue = validValue && (hk_value<=characteristic.props.maxValue);
				}
				if (validValue) {
					characteristic.setValue(hk_value, undefined, 'fromKNXBus'); // 1 decimal for HomeKit
				} else {
					this.log("["+ this.name +"]:[" + characteristic.displayName+ "]: Value %s out of bounds %s...%s ",hk_value, characteristic.props.minValue, characteristic.props.maxValue);
				}
			}.bind(this));
		},
		//integer
		knxregister_int: function(addresses, characteristic) {
			this.log("["+ this.name +"]:[" + characteristic.displayName+ "]:knx registering INT " + addresses);
			registerGA(addresses, function(val, src, dest, type, reverse){
				this.log("["+ this.name +"]:[" + characteristic.displayName+ "]: Received value from bus:"+val+ " for " +dest+ " from "+src+" of type "+type+ " for " + characteristic.displayName);
				if (val>=(characteristic.props.minValue || 0) && val<=(characteristic.props.maxValue || 255)) {
					// use the safe setter
					characteristic.setValue(safeSet(characteristic, reverse ? (255-val):val), undefined, 'fromKNXBus'); 
				} else {
					this.log("["+ this.name +"]:[" + characteristic.displayName+ "]: Value %s out of bounds %s...%s ",val, (characteristic.props.minValue || 0), (characteristic.props.maxValue || 255));
				}
			}.bind(this));
		},
		knxregister_HVAC: function(addresses, characteristic) {
			this.log("["+ this.name +"]:[" + characteristic.displayName+ "]:knx registering HVAC " + addresses);
			registerGA(addresses, function(val, src, dest, type){
				this.log("["+ this.name +"]:[" + characteristic.displayName+ "]:Received value from bus:"+val+ " for " +dest+ " from "+src+" of type "+type+ " for " + characteristic.displayName);
				var HAPvalue = 0;
				switch (val){
				case 0: 
					HAPvalue = 1;
					break;
				case 1: 
					HAPvalue = 1;
					break;
				case 2: 
					HAPvalue = 1;
					break;
				case 3: 
					HAPvalue = 1;
					break;
				case 4: 
					HAPvalue = 0;
					break;
				default:
					HAPvalue = 0;
				}
				characteristic.setValue(HAPvalue, undefined, 'fromKNXBus');
			}.bind(this));
		},
		/** KNX HVAC (heating, ventilation, and air conditioning) types do not really match to homekit types:
//		0 = Auto
//		1 = Comfort
//		2 = Standby
//		3 = Night
//		4 = Freezing/Heat Protection
//		5 – 255 = not allowed”
		// The value property of TargetHeatingCoolingState must be one of the following:
//		Characteristic.TargetHeatingCoolingState.OFF = 0;
//		Characteristic.TargetHeatingCoolingState.HEAT = 1;
//		Characteristic.TargetHeatingCoolingState.COOL = 2;
//		Characteristic.TargetHeatingCoolingState.AUTO = 3;
		AUTO (3) is not allowed as return type from devices!
*/
		// undefined, has to match!
		knxregister: function(addresses, characteristic) {
			this.log("["+ this.name +"]:[" + characteristic.displayName+ "]:knx registering " + addresses);
			registerGA(addresses, function(val, src, dest, type){
				this.log("["+ this.name +"]:[" + characteristic.displayName+ "]:Received value from bus:"+val+ " for " +dest+ " from "+src+" of type "+type+ " for " + characteristic.displayName);
				characteristic.setValue(val, undefined, 'fromKNXBus');
			}.bind(this));
		},

/** set methods used for creating callbacks
 *  such as
 *  		var Characteristic = myService.addCharacteristic(new Characteristic.Brightness())
 *				.on('set', function(value, callback, context) {
 *					this.setPercentage(value, callback, context, this.config[index].Set)
 *				}.bind(this));
 *  
 */
		setBooleanState: function(value, callback, context, gaddress, reverseflag) {
			if (context === 'fromKNXBus') {
//				this.log(gaddress + " event ping pong, exit!");
				if (callback) {
					callback();
				}
			} else {
				var numericValue = reverseflag ? 1:0;
				if (value) {
					numericValue = reverseflag ? 0:1; // need 0 or 1, not true or something
				}
				this.log("["+ this.name +"]:Setting "+gaddress+" " + reverseflag ? " (reverse)":""+ " Boolean to %s", numericValue);
				this.knxwrite(callback, gaddress,'DPT1',numericValue);			
			}

		},

		setPercentage: function(value, callback, context, gaddress, reverseflag) {
			if (context === 'fromKNXBus') {
//				this.log(gaddress + "event ping pong, exit!");
				if (callback) {
					callback();
				}
			} else {	  
				var numericValue = 0;
				value = ( value>=0 ? (value<=100 ? value:100):0 ); //ensure range 0..100
				if (reverseflag) {
					numericValue = 255 - Math.round(255*value/100);  // convert 0..100 to 255..0 for KNX bus  
				} else {
					numericValue = Math.round(255*value/100);  // convert 0..100 to 0..255 for KNX bus  
				}
				this.log("["+ this.name +"]:Setting "+gaddress+" percentage to %s (%s)", value, numericValue);
				this.knxwrite(callback, gaddress,'DPT5',numericValue);
			}
		},
		setInt: function(value, callback, context, gaddress) {
			if (context === 'fromKNXBus') {
//				this.log(gaddress + "event ping pong, exit!");
				if (callback) {
					callback();
				}
			} else {	  
				var numericValue = 0;
				if (value && value>=0 && value<=255) {
					numericValue = value;  // assure 0..255 for KNX bus  
				}
				this.log("["+ this.name +"]:Setting "+gaddress+" int to %s (%s)", value, numericValue);
				this.knxwrite(callback, gaddress,'DPT5',numericValue);
			}
		},
		setFloat: function(value, callback, context, gaddress) {
			if (context === 'fromKNXBus') {
//				this.log(gaddress + " event ping pong, exit!");
				if (callback) {
					callback();
				}
			} else {
				var numericValue = 0;
				if (value) {
					numericValue = value; // homekit expects precision of 1 decimal
				}
				this.log("["+ this.name +"]:Setting "+gaddress+" Float to %s", numericValue);
				this.knxwrite(callback, gaddress,'DPT9',numericValue);			
			}
		},
		setHVACState: function(value, callback, context, gaddress) {
			if (context === 'fromKNXBus') {
//				this.log(gaddress + " event ping pong, exit!");
				if (callback) {
					callback();
				}
			} else {
				var KNXvalue = 0;
				switch (value){
				case 0: 
					KNXvalue = 4;
					break;
				case 1: 
					KNXvalue = 1;
					break;
				case 2: 
					KNXvalue = 1;
					break;
				case 3: 
					KNXvalue = 1;
					break;
				default:
					KNXvalue = 1;
				}

				this.log("["+ this.name +"]:Setting "+gaddress+" HVAC to %s", KNXvalue);
				this.knxwrite(callback, gaddress,'DPT5',KNXvalue);			
			}

		},
/** identify dummy
 * 
 */
		identify: function(callback) {
			this.log("["+ this.name +"]:Identify requested!");
			callback(); // success
		},
/** bindCharacteristic
 *  initializes callbacks for 'set' events (from HK) and for KNX bus reads (to HK)
 */
		bindCharacteristic: function(myService, characteristicType, valueType, config, defaultValue) {
			var myCharacteristic = myService.getCharacteristic(characteristicType);
			var setGA = "";
			var setReverse = false;
			var listenaddresses;
			if (myCharacteristic === undefined) {
				throw new Error("unknown characteristics cannot be bound");
			}
			if (defaultValue) {
				myCharacteristic.setValue(defaultValue);
			}
			if (config.Set) {
				// can write
				// extract address and Reverse flag
				setGA = config.Set.match(/\d*\/\d*\/\d*/);
				if (setGA===null) {
					this.log(colorOn + "["+ this.name +"]:["+myCharacteristic.displayName+"] Error in group adress: ["+ config.Set +"] "+colorOff);
					throw new Error("EINVGROUPADRESS - Invalid group address given");
				} else {
					setGA=setGA[0]; // first element of returned array is the group address
				}
					
				setReverse = config.Set.match(/\d*\/\d*\/\d*(R)/) ? true:false;
				
				switch (valueType) {
				case "Bool":
					myCharacteristic.on('set', function(value, callback, context) {
						this.setBooleanState(value, callback, context, setGA, setReverse); //NEW
					}.bind(this));
					break;

				case "Percent":
					myCharacteristic.on('set', function(value, callback, context) {
						this.setPercentage(value, callback, context, setGA, setReverse);
						myCharacteristic.timeout = Date.now()+milliTimeout;
					}.bind(this));	
					break;
				case "Float":
					myCharacteristic.on('set', function(value, callback, context) {
						this.setFloat(value, callback, context, config.Set);
					}.bind(this));
					break;
				case "Int":
					myCharacteristic.on('set', function(value, callback, context) {
						this.setInt(value, callback, context, config.Set);
					}.bind(this));
					break;
				case "HVAC":
					myCharacteristic.on('set', function(value, callback, context) {
						this.setHVACState(value, callback, context, config.Set);
					}.bind(this));
					break;
				default: {
					this.log(colorOn + "[ERROR] unknown type passed: [" + valueType+"]"+ colorOff);
					throw new Error("[ERROR] unknown type passed");
					}
				} 
			}
			if (this.knxd_do_not_read_set_groups) {
				listenaddresses = config.Listen || []; // listen to LISTEN addresses only;
				
			} else {
				listenaddresses = [config.Set].concat(config.Listen || []); // listen to all, even SET addresses 
				
			}
			if (listenaddresses.length>0) {
				//this.log("Binding LISTEN");
				// can read
				switch (valueType) {
				case "Bool":
					this.knxregister_bool(listenaddresses, myCharacteristic);
					break;				
				case "Percent":
					this.knxregister_percent(listenaddresses, myCharacteristic);
					break;
				case "Float":
					this.knxregister_float(listenaddresses, myCharacteristic);
					break;
				case "Int":
					this.knxregister_int(listenaddresses, myCharacteristic);
					break;
				case "HVAC":
					this.knxregister_HVAC(listenaddresses, myCharacteristic);
					break;
				default:
					this.log(colorOn+ "[ERROR] unknown type passed: ["+valueType+"]"+colorOff);
					throw new Error("[ERROR] unknown type passed");
				} 
				this.log("["+ this.name +"]:["+myCharacteristic.displayName+"]: Issuing read requests on the KNX bus...");
				this.knxreadarray(listenaddresses);
			}
			return myCharacteristic; // for chaining or whatsoever
		},
/**
 *  function getXXXXXXXService(config)
 *  returns a configured service object to the caller (accessory/device)
 *  
 *  @param config
 *  pass a configuration array parsed from config.json
 *  specifically for this service
 *  
 */
		getContactSenserService: function(config) {
//			Characteristic.ContactSensorState.CONTACT_DETECTED = 0;
//			Characteristic.ContactSensorState.CONTACT_NOT_DETECTED = 1;
			
			// some sanity checks 
			if (config.type !== "ContactSensor") {
				this.log("[ERROR] ContactSensor Service for non 'ContactSensor' service called");
				return undefined;
			}
			if (!config.name) {
				this.log("[ERROR] ContactSensor Service without 'name' property called");
				return undefined;
			}
			
			var myService = new Service.ContactSensor(config.name,config.name);
			if (config.ContactSensorState) {
				this.log("["+ this.name +"]:ContactSensor ContactSensorState characteristic enabled");
				this.bindCharacteristic(myService, Characteristic.ContactSensorState, "Bool", config.ContactSensorState);
			} else if (config.ContactSensorStateContact1) {
				this.log(colorOn+ "[ERROR] outdated type passed: [ContactSensorStateContact1]"+colorOff);
				throw new Error("[ERROR] outdated type passed");
			} 
			//optionals
			if (config.StatusActive) {
				this.log("["+ this.name +"]:ContactSensor StatusActive characteristic enabled");
				myService.addCharacteristic(Characteristic.StatusActive);
				this.bindCharacteristic(myService, Characteristic.StatusActive, "Bool", config.StatusActive);
			} 
			if (config.StatusFault) {
				this.log("["+ this.name +"]:ContactSensor StatusFault characteristic enabled");
				myService.addCharacteristic(Characteristic.StatusFault);
				this.bindCharacteristic(myService, Characteristic.StatusFault, "Bool", config.StatusFault);
			} 
			if (config.StatusTampered) {
				this.log("["+ this.name +"]:ContactSensor StatusTampered characteristic enabled");
				myService.addCharacteristic(Characteristic.StatusTampered);
				this.bindCharacteristic(myService, Characteristic.StatusTampered, "Bool", config.StatusTampered);
			} 
			if (config.StatusLowBattery) {
				this.log("["+ this.name +"]:ContactSensor StatusLowBattery characteristic enabled");
				myService.addCharacteristic(Characteristic.StatusLowBattery);
				this.bindCharacteristic(myService, Characteristic.StatusLowBattery, "Bool", config.StatusLowBattery);
			} 
			return myService;
		},		
		getGarageDoorOpenerService: function(config) {
//			  // Required Characteristics
//			  this.addCharacteristic(Characteristic.CurrentDoorState);
//			  this.addCharacteristic(Characteristic.TargetDoorState);
//			  this.addCharacteristic(Characteristic.ObstructionDetected);
//			Characteristic.CurrentDoorState.OPEN = 0;
//			Characteristic.CurrentDoorState.CLOSED = 1;
//			Characteristic.CurrentDoorState.OPENING = 2;
//			Characteristic.CurrentDoorState.CLOSING = 3;
//			Characteristic.CurrentDoorState.STOPPED = 4;
//			//
//			  // Optional Characteristics
//			  this.addOptionalCharacteristic(Characteristic.LockCurrentState);
//			  this.addOptionalCharacteristic(Characteristic.LockTargetState);
			// The value property of LockCurrentState must be one of the following:
//			Characteristic.LockCurrentState.UNSECURED = 0;
//			Characteristic.LockCurrentState.SECURED = 1;
//			Characteristic.LockCurrentState.JAMMED = 2;
//			Characteristic.LockCurrentState.UNKNOWN = 3;
			
			// some sanity checks 
			if (config.type !== "GarageDoorOpener") {
				this.log("[ERROR] GarageDoorOpener Service for non 'GarageDoorOpener' service called");
				return undefined;
			}
			if (!config.name) {
				this.log("[ERROR] GarageDoorOpener Service without 'name' property called");
				return undefined;
			}
			
			var myService = new Service.GarageDoorOpener(config.name,config.name);
			if (config.CurrentDoorState) {
				this.log("["+ this.name +"]:GarageDoorOpener CurrentDoorState characteristic enabled");
				this.bindCharacteristic(myService, Characteristic.CurrentDoorState, "Int", config.CurrentDoorState);
			}
			if (config.TargetDoorState) {
				this.log("["+ this.name +"]:GarageDoorOpener TargetDoorState characteristic enabled");
				//myService.getCharacteristic(Characteristic.TargetDoorState).minimumValue=0; // 
				//myService.getCharacteristic(Characteristic.TargetDoorState).maximumValue=4; // 
				this.bindCharacteristic(myService, Characteristic.TargetDoorState, "Int", config.TargetDoorState);
			}
			if (config.ObstructionDetected) {
				this.log("["+ this.name +"]:GarageDoorOpener ObstructionDetected characteristic enabled");
				this.bindCharacteristic(myService, Characteristic.ObstructionDetected, "Bool", config.ObstructionDetected);
			}
			//optionals
			if (config.LockCurrentState) {
				this.log("["+ this.name +"]:GarageDoorOpener LockCurrentState characteristic enabled");
				myService.addCharacteristic(Characteristic.LockCurrentState);
				this.bindCharacteristic(myService, Characteristic.LockCurrentState, "Int", config.LockCurrentState);
			} 
			if (config.LockTargetState) {
				this.log("["+ this.name +"]:GarageDoorOpener LockTargetState characteristic enabled");
				myService.addCharacteristic(Characteristic.LockTargetState);
				this.bindCharacteristic(myService, Characteristic.LockTargetState, "Bool", config.LockTargetState);
			} 
			return myService;
		},	
		getLightbulbService: function(config) {
			// some sanity checks
			//this.config = config;

			if (config.type !== "Lightbulb") {
				this.log("[ERROR] Lightbulb Service for non 'Lightbulb' service called");
				return undefined;
			}
			if (!config.name) {
				this.log("[ERROR] Lightbulb Service without 'name' property called");
				return undefined;
			}
			var myService = new Service.Lightbulb(config.name,config.name);
			// On (and Off)
			if (config.On) {
				this.log("["+ this.name +"]:Lightbulb on/off characteristic enabled");
				this.bindCharacteristic(myService, Characteristic.On, "Bool", config.On);
			} // On characteristic
			// Brightness if available
			if (config.Brightness) {
				this.log("["+ this.name +"]:Lightbulb Brightness characteristic enabled");
				myService.addCharacteristic(Characteristic.Brightness); // it's an optional
				this.bindCharacteristic(myService, Characteristic.Brightness, "Percent", config.Brightness);
			}
			// Hue and Saturation could be added here if available in KNX lamps
			//iterate(myService);
			return myService;
		},
		getLightSensorService: function(config) {

			// some sanity checks 
			if (config.type !== "LightSensor") {
				this.log("[ERROR] LightSensor Service for non 'LightSensor' service called");
				return undefined;
			}
			if (!config.name) {
				this.log("[ERROR] LightSensor Service without 'name' property called");
				return undefined;
			}
			var myService = new Service.LightSensor(config.name,config.name);
			// CurrentTemperature)
			if (config.CurrentAmbientLightLevel) {
				this.log("["+ this.name +"]:LightSensor CurrentAmbientLightLevel characteristic enabled");
				this.bindCharacteristic(myService, Characteristic.CurrentAmbientLightLevel, "Float", config.CurrentAmbientLightLevel);
			} 
			return myService;
		},	
		getLockMechanismService: function(config) {

/**			//this.config = config;
//			Characteristic.LockCurrentState.UNSECURED = 0;
//			Characteristic.LockCurrentState.SECURED = 1;
*/			
			// some sanity checks
			if (config.type !== "LockMechanism") {
				this.log("[ERROR] LockMechanism Service for non 'LockMechanism' service called");
				return undefined;
			}
			if (!config.name) {
				this.log("[ERROR] LockMechanism Service without 'name' property called");
				return undefined;
			}
			
			var myService = new Service.LockMechanism(config.name,config.name);
			// LockCurrentState
			if (config.LockCurrentState) {
				// for normal contacts: Secured = 1
				this.log("["+ this.name +"]:LockMechanism LockCurrentState characteristic enabled");
				this.bindCharacteristic(myService, Characteristic.LockCurrentState, "Bool", config.LockCurrentState);
			} else if (config.LockCurrentStateSecured0) { 
				// for reverse contacts Secured = 0
				this.log(colorOn+ "[ERROR] outdated type passed: [LockCurrentStateSecured0]"+colorOff);
				throw new Error("[ERROR] outdated type passed");
			} 
			//  LockTargetState
			if (config.LockTargetState) {
				this.log("["+ this.name +"]:LockMechanism LockTargetState characteristic enabled");
				this.bindCharacteristic(myService, Characteristic.LockTargetState, "Bool", config.LockTargetState);
			} else 	if (config.LockTargetStateSecured0) {
				this.log(colorOn+ "[ERROR] outdated type passed: [LockTargetStateSecured0]"+colorOff);
				throw new Error("[ERROR] outdated type passed");
			}

			//iterate(myService);
			return myService;
		},
		getMotionSensorService: function(config) {
//			Characteristic.ContactSensorState.CONTACT_DETECTED = 0;
//			Characteristic.ContactSensorState.CONTACT_NOT_DETECTED = 1;
			
			// some sanity checks 
			if (config.type !== "MotionSensor") {
				this.log("[ERROR] MotionSensor Service for non 'MotionSensor' service called");
				return undefined;
			}
			if (!config.name) {
				this.log("[ERROR] MotionSensor Service without 'name' property called");
				return undefined;
			}
			
			var myService = new Service.MotionSensor(config.name,config.name);
			if (config.MotionDetected) {
				this.log("["+ this.name +"]:MotionSensor MotionDetected characteristic enabled");
				this.bindCharacteristic(myService, Characteristic.MotionDetected, "Bool", config.MotionDetected);
			}
			//optionals
			if (config.StatusActive) {
				this.log("["+ this.name +"]:MotionSensor StatusActive characteristic enabled");
				myService.addCharacteristic(Characteristic.StatusActive);
				this.bindCharacteristic(myService, Characteristic.StatusActive, "Bool", config.StatusActive);
			} 
			if (config.StatusFault) {
				this.log("["+ this.name +"]:MotionSensor StatusFault characteristic enabled");
				myService.addCharacteristic(Characteristic.StatusFault);
				this.bindCharacteristic(myService, Characteristic.StatusFault, "Bool", config.StatusFault);
			} 
			if (config.StatusTampered) {
				this.log("["+ this.name +"]:MotionSensor StatusTampered characteristic enabled");
				myService.addCharacteristic(Characteristic.StatusTampered);
				this.bindCharacteristic(myService, Characteristic.StatusTampered, "Bool", config.StatusTampered);
			} 
			if (config.StatusLowBattery) {
				this.log("["+ this.name +"]:MotionSensor StatusLowBattery characteristic enabled");
				myService.addCharacteristic(Characteristic.StatusLowBattery);
				this.bindCharacteristic(myService, Characteristic.StatusLowBattery, "Bool", config.StatusLowBattery);
			} 
			return myService;
		},	
		getOutletService: function(config) {
			/**
			 *   this.addCharacteristic(Characteristic.On);
			 *   this.addCharacteristic(Characteristic.OutletInUse);
			 */
			// some sanity checks
			if (config.type !== "Outlet") {
				this.log("[ERROR] Outlet Service for non 'Outlet' service called");
				return undefined;
			}
			if (!config.name) {
				this.log("[ERROR] Outlet Service without 'name' property called");
				return undefined;
			}
			var myService = new Service.Outlet(config.name,config.name);
			// On (and Off)
			if (config.On) {
				this.log("["+ this.name +"]:Outlet on/off characteristic enabled");
				this.bindCharacteristic(myService, Characteristic.On, "Bool", config.On);
			} // OutletInUse characteristic
			if (config.OutletInUse) {
				this.log("["+ this.name +"]:Outlet on/off characteristic enabled");
				this.bindCharacteristic(myService, Characteristic.OutletInUse, "Bool", config.OutletInUse);
			}
			return myService;
		},
		getSwitchService: function(config) {
			// some sanity checks
			if (config.type !== "Switch") {
				this.log("[ERROR] Switch Service for non 'Switch' service called");
				return undefined;
			}
			if (!config.name) {
				this.log("[ERROR] Switch Service without 'name' property called");
				return undefined;
			}
			var myService = new Service.Switch(config.name,config.name);
			// On (and Off)
			if (config.On) {
				this.log("["+ this.name +"]:Switch on/off characteristic enabled");
				this.bindCharacteristic(myService, Characteristic.On, "Bool", config.On);
			} // On characteristic

			return myService;
		},
		getThermostatService: function(config) {
/**
			// Optional Characteristics
			this.addOptionalCharacteristic(Characteristic.CurrentRelativeHumidity);
			this.addOptionalCharacteristic(Characteristic.TargetRelativeHumidity);
			this.addOptionalCharacteristic(Characteristic.CoolingThresholdTemperature);
			this.addOptionalCharacteristic(Characteristic.HeatingThresholdTemperature);
*/

			// some sanity checks 
			if (config.type !== "Thermostat") {
				this.log("[ERROR] Thermostat Service for non 'Thermostat' service called");
				return undefined;
			}
			if (!config.name) {
				this.log("[ERROR] Thermostat Service without 'name' property called");
				return undefined;
			}

			var myService = new Service.Thermostat(config.name,config.name);
			// CurrentTemperature)
			// props update for https://github.com/KhaosT/HAP-NodeJS/commit/1d84d128d1513beedcafc24d2c07d98185563243#diff-cb84de3a1478a38b2cf8388d709f1c1cR108
			if (config.CurrentTemperature) {
				this.log("["+ this.name +"]:Thermostat CurrentTemperature characteristic enabled");
				myService.getCharacteristic(Characteristic.CurrentTemperature).setProps({
					minValue: config.CurrentTemperature.minValue || -40,
					maxValue: config.CurrentTemperature.maxValue || 60
				}); // °C by default
				this.bindCharacteristic(myService, Characteristic.CurrentTemperature, "Float", config.CurrentTemperature);
			} 
			// TargetTemperature if available 
			if (config.TargetTemperature) {
				this.log("["+ this.name +"]:Thermostat TargetTemperature characteristic enabled");
				// default boundary too narrow for thermostats
				// props update for https://github.com/KhaosT/HAP-NodeJS/commit/1d84d128d1513beedcafc24d2c07d98185563243#diff-cb84de3a1478a38b2cf8388d709f1c1cR108
				myService.getCharacteristic(Characteristic.TargetTemperature).setProps({
					minValue: config.TargetTemperature.minValue || 0,
					maxValue: config.TargetTemperature.maxValue || 40
				});
				
				this.bindCharacteristic(myService, Characteristic.TargetTemperature, "Float", config.TargetTemperature);
			}
			// HVAC 
			if (config.CurrentHeatingCoolingState) {
				this.log("["+ this.name +"]:Thermostat CurrentHeatingCoolingState characteristic enabled");
				this.bindCharacteristic(myService, Characteristic.CurrentHeatingCoolingState, "HVAC", config.CurrentHeatingCoolingState);
			}
			// HVAC 
			if (config.TargetHeatingCoolingState) {
				this.log("["+ this.name +"]:Thermostat TargetHeatingCoolingState characteristic enabled");
				this.bindCharacteristic(myService, Characteristic.TargetHeatingCoolingState, "HVAC", config.TargetHeatingCoolingState);
			}
			return myService;
		},
		getTemperatureSensorService: function(config) {

			// some sanity checks 
			if (config.type !== "TemperatureSensor") {
				this.log("[ERROR] TemperatureSensor Service for non 'TemperatureSensor' service called");
				return undefined;
			}
			if (!config.name) {
				this.log("[ERROR] TemperatureSensor Service without 'name' property called");
				return undefined;
			}
			var myService = new Service.TemperatureSensor(config.name,config.name);
			// CurrentTemperature)
			// props update for https://github.com/KhaosT/HAP-NodeJS/commit/1d84d128d1513beedcafc24d2c07d98185563243#diff-cb84de3a1478a38b2cf8388d709f1c1cR108
			if (config.CurrentTemperature) {
				this.log("["+ this.name +"]:TemperatureSensor CurrentTemperature characteristic enabled");
				myService.getCharacteristic(Characteristic.CurrentTemperature).setProps({
					minValue: config.CurrentTemperature.minValue || -40,
					maxValue: config.CurrentTemperature.maxValue || 60
				}); // °C by default
				this.bindCharacteristic(myService, Characteristic.CurrentTemperature, "Float", config.CurrentTemperature);
			} 

			return myService;
		},		
		getWindowService: function(config) {
/**			
		Optional Characteristics
		this.addOptionalCharacteristic(Characteristic.HoldPosition);
		this.addOptionalCharacteristic(Characteristic.ObstructionDetected);
		this.addOptionalCharacteristic(Characteristic.Name);
		
		PositionState values: The KNX blind actuators I have return only MOVING=1 and STOPPED=0
		Characteristic.PositionState.DECREASING = 0;
		Characteristic.PositionState.INCREASING = 1;
		Characteristic.PositionState.STOPPED = 2;
*/

			// some sanity checks 


			if (config.type !== "Window") {
				this.log("[ERROR] Window Service for non 'Window' service called");
				return undefined;
			}
			if (!config.name) {
				this.log("[ERROR] Window Service without 'name' property called");
				return undefined;
			}
			var myService = new Service.Window(config.name,config.name);

			if (config.CurrentPosition) {
				this.log("["+ this.name +"]:Window CurrentPosition characteristic enabled");
				this.bindCharacteristic(myService, Characteristic.CurrentPosition, "Percent", config.CurrentPosition);
			} 
			if (config.TargetPosition) {
				this.log("["+ this.name +"]:Window TargetPosition characteristic enabled");
				this.bindCharacteristic(myService, Characteristic.TargetPosition, "Percent", config.TargetPosition);
			} 
			if (config.PositionState) {
				this.log("["+ this.name +"]:Window PositionState characteristic enabled");
				this.bindCharacteristic(myService, Characteristic.PositionState, "Int", config.PositionState);
			} 
			return myService;
		},			
		getWindowCoveringService: function(config) {
			/**
			  // Optional Characteristics
			  this.addOptionalCharacteristic(Characteristic.HoldPosition);
			  this.addOptionalCharacteristic(Characteristic.TargetHorizontalTiltAngle);
			  this.addOptionalCharacteristic(Characteristic.TargetVerticalTiltAngle);
			  this.addOptionalCharacteristic(Characteristic.CurrentHorizontalTiltAngle);
			  this.addOptionalCharacteristic(Characteristic.CurrentVerticalTiltAngle);
			  this.addOptionalCharacteristic(Characteristic.ObstructionDetected);
	*/
			// some sanity checks 
			if (config.type !== "WindowCovering") {
				this.log("[ERROR] WindowCovering Service for non 'WindowCovering' service called");
				return undefined;
			}
			if (!config.name) {
				this.log("[ERROR] WindowCovering Service without 'name' property called");
				return undefined;
			}

			var myService = new Service.WindowCovering(config.name,config.name);
			if (config.CurrentPosition) {
				this.log("["+ this.name +"]:WindowCovering CurrentPosition characteristic enabled");
				this.bindCharacteristic(myService, Characteristic.CurrentPosition, "Percent", config.CurrentPosition);
			} 
			if (config.TargetPosition) {
				this.log("["+ this.name +"]:WindowCovering TargetPosition characteristic enabled");
				this.bindCharacteristic(myService, Characteristic.TargetPosition, "Percent", config.TargetPosition);
			} 
			if (config.PositionState) {
				this.log("["+ this.name +"]:WindowCovering PositionState characteristic enabled");
				this.bindCharacteristic(myService, Characteristic.PositionState, "Int", config.PositionState);
			} 
			return myService;
		},		
		
		
	
		
/* assemble the device ***************************************************************************************************/
		getServices: function() {

			// you can OPTIONALLY create an information service if you wish to override
			// the default values for things like serial number, model, etc.

			var accessoryServices = [];

			var informationService = new Service.AccessoryInformation();

			informationService
			.setCharacteristic(Characteristic.Manufacturer, "Opensource Community")
			.setCharacteristic(Characteristic.Model, "KNX Universal Device")
			.setCharacteristic(Characteristic.SerialNumber, "Version 1.1.4");

			accessoryServices.push(informationService);

			//iterate(this.config);

			if (!this.config.services){
				this.log("No services found in accessory?!");
			}
			var currServices = this.config.services;
			this.log("Preparing Services: " + currServices.length);
			// go through the config thing and look for services
			for (var int = 0; int < currServices.length; int++) {
				var configService = currServices[int];
				// services need to have type and name properties
				if (!configService.type && !configService.name) {
					this.log("[ERROR] must specify 'type' and 'name' properties for each service in config.json. KNX platform section fault ");
					throw new Error("Must specify 'type' and 'name' properties for each service in config.json");
				}
				this.log("Preparing Service: " + int + " of type "+configService.type);
				switch (configService.type) {
				case "ContactSensor":
					accessoryServices.push(this.getContactSenserService(configService));
					break;				
				case "GarageDoorOpener":
					accessoryServices.push(this.getGarageDoorOpenerService(configService));
					break;
				case "Lightbulb":
					accessoryServices.push(this.getLightbulbService(configService));
					break;
				case "LightSensor":
					accessoryServices.push(this.getLightSensorService(configService));
					break;
				case "LockMechanism":
					accessoryServices.push(this.getLockMechanismService(configService));
					break;
				case "MotionSensor":
					accessoryServices.push(this.getMotionSensorService(configService));
					break;	
				case "Outlet":
					accessoryServices.push(this.getOutletService(configService));
					break;	
				case "Switch":
					accessoryServices.push(this.getSwitchService(configService));
					break;					
				case "TemperatureSensor":
					accessoryServices.push(this.getTemperatureSensorService(configService));
					break;
				case "Thermostat":
					accessoryServices.push(this.getThermostatService(configService));
					break;
				case "Window":
					accessoryServices.push(this.getWindowService(configService));
					break;
				case "WindowCovering":
					accessoryServices.push(this.getWindowCoveringService(configService));
					break;
				default:
					this.log("[ERROR] unknown 'type' property of ["+configService.type+"] for service ["+ configService.name + "] in config.json. KNX platform section fault ");
				    throw new Error("[ERROR] unknown 'type' property of ["+configService.type+"] for service '"+ configService.name + "' in config.json. KNX platform section fault ");
				}
			}
			// start listening for events on the bus (if not started yet - will prevent itself)
			startMonitor({ host: this.knxd_ip, port: this.knxd_port });
			return accessoryServices;
		}
};
