var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('index', { title: 'Express' });
});
/* GET single device form. */
router.get('/device/:UUIDBase', function(req, res, next) {
	// get the right device (to start with)

	var result;
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
				}
			}
		}
	}

	res.render('formdevice', { title: 'KNX Device Form', devicedata: result });
});

/* GET list of devices form. */
router.get('/devicelist', function(req, res, next) {
	res.render('formdevicelist', { title: 'KNX Devices List', devices: req.myStorage.Devices  }); // we need to pass the Devices for JADE
});



/* GET single service from a device form. */

router.get('/device/:UUIDBase/:SERVNAME', function(req, res, next) {
	// get the right device (to start with)
	var result;
	result = {};
	if (req.params.UUIDBase !== 'NULL') {
		for (var iD = 0; iD < req.myStorage.Devices.length; iD++) {
			if (req.myStorage.Devices[iD].UUIDBase === req.params.UUIDBase) {
				// found one
				result.device = req.myStorage.Devices[iD];
				//search for the service
				for (var iS = 0; iS < req.myStorage.Devices[iD].Services.length; iS++) {
					if (req.myStorage.Devices[iD].Services[iS].ServiceName === req.params.SERVNAME) {
						result.service = req.myStorage.Devices[iD].Services[iS];
					}
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
				result.device = req.myStorage.Devices[iD];
				for (var iS = 0; iS < req.myStorage.Devices[iD].Services.length; iS++) {
					if (req.myStorage.Devices[iD].Services[iS].ServiceName === req.params.SERVNAME) {
						result.service = req.myStorage.Devices[iD].Services[iS];
					}
				}
			}
		}
	}
	if (result) {
		// we have found one

	}

	res.render('formservice', { title: 'KNX Service Form', devicedata: result, Services: req.hap.Service });
});

module.exports = router;
