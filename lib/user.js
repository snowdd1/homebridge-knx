'use strict';
/*
 *  proudly copied from nfarina's homebridge
 *  all mistakes are later added by me.
 */
var path = require('path');
var fs = require('fs');



module.exports = {
	User : User
};

/**
 * Manages user settings and storage locations.
 */

// global cached config
var config;

// optional custom storage path
var customStoragePath;

function User() {
}

User.config = function() {
	return config || (config = this.loadConfig());
};

User.storagePath = function() {
	if (customStoragePath) {
		return customStoragePath;
	}
	var home = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
	return path.join(home, ".homebridge");
};

User.configPath = function() {
	return path.join(User.storagePath(), "knx_config.json");
};

User.persistPath = function() {
	return path.join(User.storagePath(), "knx_persist");
};

User.setStoragePath = function(path) {
	customStoragePath = path;
};

User.loadConfig = function() {

	// Look for the configuration file
	var configPath = User.configPath();

	// Complain and exit if it doesn't exist yet
	if (!fs.existsSync(configPath)) {
		console.log("Couldn't find file at '" + configPath + ".");
		process.exit(1);
	}

	// Load up the configuration file
	try {
		config = JSON.parse(fs.readFileSync(configPath));
	} catch (err) {
		console.log("There was a problem reading your " + configPath + " file.");
		console.log("Please try pasting your file here to validate it: http://jsonlint.com");
		console.log("");
		throw err;
	}

	console.log("---");

	return config;
};

User.storeConfig = function() {
	// Look for the configuration file
	var configPath = User.configPath();

	// Complain and exit if it doesn't exist yet
	if (!fs.existsSync(configPath)) {
		console.log("Couldn't find file at '" + configPath + ".");
		process.exit(1);
	}

	// write the configuration file
	try {
		fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
	} catch (err) {
		console.log("ERROR: There was a problem writing your " + configPath + " file.");
		console.log("");
		throw err;
	}

	console.log("---");
};

User.LogHomebridgeKNXSTarts = function() {
	var startLogPath = path.join(this.storagePath(),"homebridge-knx.startlog");
	var startLog = {};
	if (fs.existsSync(startLogPath)) {
		try {
			// load that file as JSON
			startLog = JSON.parse(fs.readFileSync(startLogPath));
			if (startLog.starts!==undefined) {
				startLog.starts.push(new Date().toJSON());
			}
		} catch (e) {
			console.error("Cannot load startlog at "+ startLogPath + " or format error: " + e);
		}
	} else {
		startLog.starts = [];
		startLog.starts.push(new Date().toJSON());
	}
	try {
		fs.writeFileSync(startLogPath, JSON.stringify(startLog, null, 4));
	} catch (e) {
		console.error("Cannot write startlog at "+ startLogPath + ". Error: " + e);
		}		
};
