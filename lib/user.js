/* jshint esversion: 6, strict: true, node: true */
'use strict';
/*
 *  proudly copied from nfarina's homebridge
 *  all mistakes are later added by me.
 */
//const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('node:path')



module.exports = {
    User: User
};


/**
 * Manages user settings and storage locations.
 */

// global cached config
var config;

// optional custom storage path
var customStoragePath;

function looksLikeYAML(filename) {
    console.debug("checking filename: " + filename)
    return (filename.endsWith(".yml") || filename.endsWith(".yaml"))
}

function getAllFiles(dir, allFilesList = []) {
    const files = fs.readdirSync(dir);
    files.map(file => {
        const name = dir + '/' + file;
        if (fs.statSync(name).isDirectory()) { // check if subdirectory is present
            getAllFiles(name, allFilesList);     // do recursive execution for subdirectory
        } else {
            allFilesList.push(name);           // push filename into the array
        }
    })

    return allFilesList;
}
function export_config(data, filepath) {
    console.debug("exporting: " + data)
    if (looksLikeYAML(filepath)) {
        fs.writeFileSync(filepath, yaml.dump(data))
    } else {
        // export as JSON
        fs.writeFileSync(filepath, JSON.stringify(data, null, 4));
    }
}
function User() {
}

User.config = function (platformconfig = undefined) {
    return config || (config = this.loadConfig(platformconfig));
};

User.storagePath = function (platformconfig = undefined) {
    if (customStoragePath) {
        return customStoragePath;
    }
    var home = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
    return path.join(home, ".homebridge");
};

User.configPath = function (platformconfig = undefined) {
    //console.log("platformconfig=")
    //console.log(platformconfig)
    if (platformconfig && platformconfig.config_path) {
        console.log("platformconfig.config_path")
        console.log(platformconfig.config_path)
        if (fs.existsSync(platformconfig.config_path)) {
            return platformconfig.config_path
        }
    }
    return path.join(User.storagePath(), "knx_config.json");
};

User.persistPath = function () {
    return path.join(User.storagePath(), "knx_persist");
};

User.addinsPath = function () {
    return path.join(User.storagePath(), "knx_addins");
}

User.setStoragePath = function (path) {
    customStoragePath = path;
};

User.loadConfig = function (platformconfig = undefined) {

    // Look for the configuration file
    var configPath = User.configPath(platformconfig);
    //let config = {}
    // Complain and exit if it doesn't exist yet
    if (!fs.existsSync(configPath)) {
        console.log("Couldn't find file at '" + configPath + ".");
        process.exit(1);
    }

    // Load up the configuration file(s)

    let stats = fs.lstatSync(configPath)
    if (stats.isFile()) {
        // single file, return directly
        try {
            config = JSON.parse(fs.readFileSync(configPath));
        } catch (err) {
            console.log("There was a problem reading your " + configPath + " file.");
            console.log("Please try pasting your file here to validate it: http://jsonlint.com");
            console.log("");
            throw err;
        }
        return config
    } else if (stats.isDirectory()) {
        // load multiple files and merge them
        let fileslist = getAllFiles(configPath)

        let devices = []
        for (var int = 0; int < fileslist.length; int++) {
            // @type String
            let currfile = fileslist[int];
            console.debug("Reading from config: " + i + " of " + fileslist.length + ", file " + currfile);
            if (currfile.endsWith(".json") || looksLikeYAML(currfile)) {
                globs.debug("extension fits");
                let readContent = yaml.load(fs.readFileSync(currfile))
                if ("Devices" in readContent) {
                    for (let idev = 0; idev < readContent.Devices.length; idev++) {
                        // add the current path name to each of the devices
                        readContent.Devices[i].sourcefilepath = currfile
                    }
                    devices.concat(readContent.Devices)
                    delete readContent.Devices
                }
                if ("GroupAddresses" in readContent) {
                    delete readContent.GroupAddresses // legacy never used, delete it.
                }
                if (Object.getOwnPropertyNames(readContent).length > 0) {
                    // still properties there
                    globs.debug("settings are in " + currfile)
                    readContent.sourcefilepath = currfile
                }
                Object.assign(config, readContent)
            }
        }
    }


    console.log("---");

    return config;
};




User.storeConfig = function (platformconfig = undefined) {
    // Look for the configuration file
    var configPath = User.configPath(platformconfig);

    // Complain and exit if it doesn't exist yet
    if (!fs.existsSync(configPath)) {
        console.log("Couldn't find file at '" + configPath + ".");
        process.exit(1);
    }

    // write the configuration file
    let stats = fs.lstatSync(configPath)
    if (stats.isFile()) {
        try {
            export_config(config, configPath);
        } catch (err) {
            console.log("ERROR: There was a problem writing your " + configPath + " file.");
            console.log("");
            throw err;
        }
        return
    } else if (stats.isDirectory()) {
        let globalsourcefilename = path.join(configPath, "knx-settings.yaml");
        if ("sourcefilename" in config) {
            globalsourcefilename = config.sourcefilename
        }

        // export all but the devices here
        let config_setting = {}
        Object.assign(config_setting, config)
        delete config_setting.Devices
        export_config(config_setting, globalsourcefilename)

        // export the devices

        //collect the file names from devices
        let filenames_in_config = {}
        config.Devices.forEach(element => {
            if (element.sourcefilename) {
                if (filenames_in_config["element.sourcefilename"]) {
                    // exists, append
                    filenames_in_config["element.sourcefilename"].push(element)
                } else {
                    // new
                    filenames_in_config["element.sourcefilename"] = [element]
                }
            }
        });
        // export for each filename
        Object.getOwnPropertyNames(filenames_in_config).forEach(filename => {
            export_config(filenames_in_config[filename], filename)
        })

    }
    console.log("---");
};

User.LogHomebridgeKNXSTarts = function () {
    var startLogPath = path.join(this.storagePath(), "homebridge-knx.startlog");
    var startLog = {};
    if (fs.existsSync(startLogPath)) {
        try {
            // load that file as JSON
            startLog = JSON.parse(fs.readFileSync(startLogPath));
            if (startLog.starts !== undefined) {
                startLog.starts.push(new Date().toJSON());
            }
        } catch (e) {
            console.error("Cannot load startlog at " + startLogPath + " or format error: " + e);
        }
    } else {
        startLog.starts = [];
        startLog.starts.push(new Date().toJSON());
    }
    try {
        fs.writeFileSync(startLogPath, JSON.stringify(startLog, null, 4));
    } catch (e) {
        console.error("Cannot write startlog at " + startLogPath + ". Error: " + e);
    }
};
