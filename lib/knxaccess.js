'use strict'
/**
 * http://usejsdoc.org/
 */

var globs;
var knxd = require('eibd');

module.exports = {
	// all purpose / all types write function	
	knxwrite : function(callback, groupAddress, dpt, value) {
		globs.info("DEBUG in knxwrite");
		var knxdConnection = new knxd.Connection();
		globs.info("DEBUG in knxwrite: created empty connection, trying to connect socket to "+globs.knxd_ip+":"+globs.knxd_port);
		knxdConnection.socketRemote({
			host : globs.knxd_ip,
			port : globs.knxd_port
		}, function(err) {
			if (err) {
				// a fatal error occurred
				console.log("FATAL: knxd or eibd not reachable: " + err);
				throw new Error("Cannot reach knxd or eibd service, please check installation and configuration .json");
			}
			var dest = knxd.str2addr(groupAddress);
			globs.info("DEBUG got dest="+dest);
			knxdConnection.openTGroup(dest, 1, function(err) {
				if (err) {
					globs.log("[ERROR] knxwrite:openTGroup: " + err);
					callback(err);
				} else {
					globs.log("DEBUG opened TGroup ");
					var msg = knxd.createMessage('write', dpt, parseFloat(value));
					knxdConnection.sendAPDU(msg, function(err) {
						if (err) {
							globs.log("[ERROR] knxwrite:sendAPDU: " + err);
							callback(err);
						} else {
							globs.info("knx data sent: Value " + value + " for GA " + groupAddress);
							callback();
						}
					});
				}
			});
		});
	},

	setBooleanState : function(value, callback, gaddress, reverseflag) {
		globs.info("setBooleanState");
		globs.info(value);
		globs.info(gaddress);
		globs.info(reverseflag);
		var numericValue = reverseflag ? 1 : 0;
		if (value) {
			numericValue = reverseflag ? 0 : 1; // need 0 or 1, not true or something
		}
		globs.log(":Setting " + gaddress + " " + reverseflag ? " (reverse)" : "" + " Boolean to " +  numericValue);
		this.knxwrite(callback, gaddress, 'DPT1', numericValue);
	},

	setPercentage : function(value, callback, gaddress, reverseflag) {

		var numericValue = 0;
		value = (value >= 0 ? (value <= 100 ? value : 100) : 0); //ensure range 0..100
		if (reverseflag) {
			numericValue = 255 - Math.round(255 * value / 100); // convert 0..100 to 255..0 for KNX bus  
		} else {
			numericValue = Math.round(255 * value / 100); // convert 0..100 to 0..255 for KNX bus  
		}
		globs.log(":Setting " + gaddress + " percentage " +  reverseflag ? " (reverse)" : "" + "  to " + value +" (" + numericValue + ")");
		this.knxwrite(callback, gaddress, 'DPT5', numericValue);
	},
	setInt : function(value, callback, gaddress) {

		var numericValue = 0;
		if (value && value >= 0 && value <= 255) {
			numericValue = value; // assure 0..255 for KNX bus  
		}
		globs.log(":Setting " + gaddress + " int to " + value +" (" + numericValue +")");
		this.knxwrite(callback, gaddress, 'DPT5', numericValue);

	},
	setFloat : function(value, callback, gaddress) {

		var numericValue = 0;
		if (value) {
			numericValue = value; // homekit expects precision of 1 decimal
		}
		globs.log(":Setting " + gaddress + " Float to %s", numericValue);
		this.knxwrite(callback, gaddress, 'DPT9', numericValue);

	},
	setHVACState : function(value, callback, gaddress) {

		var KNXvalue = 0;
		switch (value) {
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

		globs.log(":Setting " + gaddress + " HVAC to %s", KNXvalue);
		this.knxwrite(callback, gaddress, 'DPT5', KNXvalue);

	},

	// issues an all purpose read request on the knx bus
	// DOES NOT WAIT for an answer. Please register the address with a callback using registerGA() function
	knxread : function(groupAddress) {
		 globs.info("DEBUG in knxread");
		if (!groupAddress) {
			return null;
		}
		globs.info("[knxdevice:knxread] preparing knx request for " + groupAddress);
		var knxdConnection = new knxd.Connection();
		 globs.info("DEBUG in knxread: created empty connection, trying to connect socket to "+this.knxd_ip+":"+this.knxd_port);
		knxdConnection.socketRemote({
			host : this.knxd_ip,
			port : this.knxd_port
		}, function(err) {
			if (err) {
				throw {
					name : "KNXD connection failed",
					message : "The connection to the knx daemon failed. Check IP and Port."
				};
			}
			var dest = knxd.str2addr(groupAddress);
			// globs.info("DEBUG got dest="+dest);
			knxdConnection.openTGroup(dest, 1, function(err) {
				if (err) {
					globs.log("[ERROR] knxread:openTGroup: " + err);
				} else {
					// globs.info("DEBUG knxread: opened TGroup ");
					var msg = knxd.createMessage('read', 'DPT1', 0);
					knxdConnection.sendAPDU(msg, function(err) {
						if (err) {
							globs.log("[ERROR] knxread:sendAPDU: " + err);
						} else {
							globs.info("[knxdevice:knxread] knx request sent for " + groupAddress);
						}
					}.bind(this));
				}
			}.bind(this));
		}.bind(this));
	},
	// issuing multiple read requests at once 
	knxreadarray : function(groupAddresses) {
		if (groupAddresses.constructor.toString().indexOf("Array") > -1) {
			// handle multiple addresses
			for (var i = 0; i < groupAddresses.length; i++) {
				if (groupAddresses[i]) { // do not bind empty addresses
					this.knxread(groupAddresses[i].match(/(\d*\/\d*\/\d*)/)[0]); // clean address
				}
			}
		} else {
			// it's only one
			this.knxread(groupAddresses.match(/(\d*\/\d*\/\d*)/)[0]); // regex for cleaning address
		}
	},
	setGlobs : function(globsObject) {
		globs = globsObject;
	}
}
