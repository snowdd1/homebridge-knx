/*****
 * Testing for web interface only, IS NOT A VALID MODULE OR PLUG-IN FOR HOMEBRIDGE
 */


'use strict';

var userOpts = require('./lib/user').User;
userOpts.setStoragePath('Q:\\Lokale Benutzerdateien\\papa\\eclipse\\GithubPublic-snowdd1\\homebridge-knx');

var globs = {}; // the storage for cross module data pooling;
var iterate = require('./lib/iterate');

this.config = userOpts.loadConfig();
globs.config = this.config;
//globs.Service = Service;
require('./configserver/bin/www.js').initialize(globs)
	
