var express = require('express');
var router = express.Router();

/*
 * GET devicelist.
 */
router.get('/devicelist', function(req, res) {
    var myStorage = req.myStorage;
    var collection = myStorage.Devices;  // get all data from JSON object -- returns also all sub-objects!
    //TODO: check if that is wanted
    res.json(collection);
});


router.get('/deviceinfos/:UUIDBase', function(req, res) {
    var result;
    // req.params.UUIDBase
    
    /**
     *  if UUID is passed, look for it; name probably isn't unique
     */
    
    // the parameters are encoded using encodeURIComponent(string) but do not need to be decoded here, is done by express.
    // an empty parameter has to be passed as NULL otherwise the path is not matched
    result = "";
    if (req.params.UUIDBase !== 'NULL') {
    	for (var iD = 0; iD < req.myStorage.Devices.length; iD++) {
			if (req.myStorage.Devices[iD].UUIDBase === req.params.UUIDBase) {
				// found one
				result = req.myStorage.Devices[iD];
				if (req.myStorage.Devices.length>(iD+1)) {
					result.nextDevice = req.myStorage.Devices[iD+1].UUIDBase ? req.myStorage.Devices[iD+1].UUIDBase:req.myStorage.Devices[iD+1].DeviceName;
				}				
			}
		}
    }
    // not found yet?
    if (result==="") {
    	// look for the DeviceName
    	for (var iD = 0; iD < req.myStorage.Devices.length; iD++) {
			if (req.myStorage.Devices[iD].DeviceName === req.params.UUIDBase) {
				// found one
				result = req.myStorage.Devices[iD];
				if (req.myStorage.Devices.length>(iD+1)) {
					result.nextDevice = req.myStorage.Devices[iD+1].UUIDBase ? req.myStorage.Devices[iD+1].UUIDBase:req.myStorage.Devices[iD+1].DeviceName;
				}			}
		}
    }
    res.json(result);
});

router.get('/services/:UUIDBase', function(req, res) {
    var result;
    // req.params.UUIDBase
    
    /**
     *  if UUID is passed, look for it; name probably isn't unique
     */
    
    // the parameters are encoded using encodeURIComponent(string) but do not need to be decoded here, is done by express.
    // an empty parameter has to be passed as NULL otherwise the path is not matched
    result = {};
    if (req.params.UUIDBase !== 'NULL') {
    	for (var iD = 0; iD < req.myStorage.Devices.length; iD++) {
			if (req.myStorage.Devices[iD].UUIDBase === req.params.UUIDBase) {
				// found one
				result = req.myStorage.Devices[iD].Services;
				//result.deviceUUID = req.myStorage.Devices[iD].UUIDBase ? req.myStorage.Devices[iD].UUIDBase : req.myStorage.Devices[iD].DeviceName;
			}
		}
    }
    // not found yet?
    if (result==="") {
    	// look for the DeviceName
    	for (var iD = 0; iD < req.myStorage.Devices.length; iD++) {
			if (req.myStorage.Devices[iD].DeviceName === req.params.UUIDBase) {
				// found one
				result = req.myStorage.Devices[iD].Services;
				//result.deviceUUID = req.myStorage.Devices[iD].UUIDBase ? req.myStorage.Devices[iD].UUIDBase : req.myStorage.Devices[iD].DeviceName;
			}
		}
    }
    res.json(result);
});

module.exports = router;
