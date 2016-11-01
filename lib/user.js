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
