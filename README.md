
[![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url]  [![Build status][appveyor-image]][appveyor-url] [![Build status][codeship-image]][codeship-url] [![Dependency status][david-dm-image]][david-dm-url]   

# homebridge-knx Version 0.2.x
KNX platform shim for homebridge.  
This cannot run stand-alone!  
*If you are looking for Version 0.3.x please go to https://github.com/snowdd1/homebridge-knx/tree/plugin-2.0 !*

## This Work In Progress, use carefully.
Please also visit [homebridge github homepage](https://github.com/nfarina/homebridge) first.

Latest to homebridge-knx changes can be found in the [CHANGELOG.TXT](https://github.com/snowdd1/homebridge-knx/blob/master/CHANGELOG.TXT)

### This can only be used with the new homebridge >=0.2.0 and Node >=4.0.0

### Prerequisites
This node module requires a running (and properly configured) knx daemon (knxd). You can find the latest version [here](https://github.com/knxd/knxd). I have mirrored an ancient snapshot that runs stable *with my configuration* (raspberry 1b, busware pigator single with knx module) but has not been tested otherwise. I cannot support the knxd. Please address issues directly at the [knxd issue pages](https://github.com/knxd/knxd/issues). It might help to search the existing issues, as your problem might have been solved already.  

### Installation and running
-  Install homebridge first, [see there](https://github.com/nfarina/homebridge); nfarina recommends a global install as super user. It's a server tool, so we can safely assume that the person that installes it is sufficiently  priviledged to do so. `sudo npm install -g homebridge`
-  then install this package to `<any>` directory you want; If you installed homebridge globally I recommend to do so with homebridge-knx: `sudo npm install -g homebridge-knx`
-  configure homebridge and its plugins. You might start by copying the [`KNX-sample-config.json`](https://github.com/snowdd1/homebridge-knx/blob/master/KNX-sample-config.json) to a new folder `.homebridge` in your user folder (on a default installation raspberry, it's `/users/pi`) and rename it to config.json
-  Eliminate everything (especially all group addresses) that might harm your KNX installation. Sending bus telegrams to your alarm device might wake the neighbourhood unpleasantly!
-  when done, start homebridge with `homebridge`. If you have chosen a local install, go to the homebridge folder and do a `bin/homebridge --plugin-path <any>/homebridge-knx` with the path to the homebridge-knx installation.

### Limitations
Since homebridge-knx is not an Apple-certified HomeKit device some functions are limited:
- remote access is only possible using a local device as HomeKit "router" (i.e. an AppleTV 3rd/4th gen)
 
# Configuration 
The configuration of the homebridge-knx plugin is done in the global config.json of homebridge. If you did not pass the -U parameter to homebridge, the directory for the config.json is /home/<user>/.homebridge
 
# Syntax of the config.json
In the platforms section, you can insert a KNX type platform. 
You need to configure all devices directly in the config.json. You can find a sample file here: https://github.com/snowdd1/homebridge-knx/blob/master/KNX-sample-config.json

````json
    "platforms": [
        {
            "platform": "KNX",
            "name": "KNX",
            "knxd_ip": "192.168.1.1", 
            "knxd_port": 6720,
            "knxd_do_not_read_set_groups":true,
            "accessories": [
                {
                    "name": "Living Room North Lamp",
                    "services": [
                        {
                            "type": "Lightbulb",
                            "description": "iOS8 Lightbulb type, supports On (Switch) and Brightness",
                            "name": "Living Room North Lamp",
                            "On": {
                                "Set": "1/1/6",
                                "Listen": ["1/1/63"]
                            },
                            "Brightness": {
                                "Set": "1/1/62",
                                "Listen": ["1/1/64"]
                            }
                        }
                    ]
                }
             ]
        }
````
In the accessories section (the array within the brackets [ ]) you can insert as many objects as you like in the following form
````json
    {
	    "name": "Here goes your display name, this will be shown in HomeKit apps",
	    "services": [
	        {      
	        }
	    ]
    }
````                 
The "name" of the "service" object is what Siri will observe. Depending on the app either the "service" or the "accessories" name might be displayed. Do no mix languages here!

You have to add services in the following syntax:
````json
    {
        "type": "SERVICENAME",
        "description": "This is just for you to remember things",
        "name": "beer tap thermostat",
        "CHARACTERISTIC1": {
            "Set": "1/1/6",
            "Listen": [
                "1/1/63"
            ]
        },
        "CHARACTERISTIC2": {
            "Set": "1/1/62",
            "Listen": [
                "1/1/64"
            ]
        }
    }
````
`CHARACTERISTICx` are properties that are dependent on the service type, so they are listed below.

Two kinds of addresses are supported: `"Set":"1/2/3"` is a writable group address, to which changes are sent if the service supports changing values. Changes on the bus are listened to, too.
`"Listen":["1/2/3","1/2/4","1/2/5"]` is an array of addresses that are listened to additionally. To these addresses never values get written, but the on startup the service will issue *KNX read requests* to ALL addresses listed in `Set:` and in `Listen:`  


For two characteristics there are additional minValue and maxValue attributes. These are CurrentTemperature and TargetTemperature, and are used in TemperatureSensor and Thermostat.

So the charcteristic section may look like:

 ````json
    {
        "type": "Thermostat",
        "description": "Sample thermostat",
        "name": "We need a name for each service, though it usually shows only if multiple services are present in one accessory",
        "CurrentTemperature": {
            "Set": "1/1/6",
            "Listen": [
                "1/1/63"
            ],
            "minValue": -18,
            "maxValue": 30
        },
        "TargetTemperature": {
            "Set": "1/1/62",
            "Listen": [
                "1/1/64"
            ],
            "minValue": -4,
            "maxValue": 12
        }
    }
````


## reversal of values for characteristics
In general, all DPT1 types can be reversed. If you need a 1 for "contact" of a contact senser, you can append an "R" to the group address.
Likewise, all percentages of DPT5 can be reversed, if you need a 100% (=255) for window closed, append an "R" to the group address. Do not forget the listening addresses!
 ````json
    {
        "type": "ContactSensor",
        "description": "Sample ContactSensor with 1 as contact (0 is Apple's default)",
        "name": "WindowContact1",
        "ContactSensorState": {
            "Listen": [
                "1/1/100R"
            ]
        }
    }
````
## Unique names required
If the names of your devices are not unique, or you think they might not be unique for all times, or you think you going to need to change them without loosing the settings in homekit - then you will need to set the **uuid_base** parameter for each device.

````json
            "accessories": [
                {
                    "name": "Living Room North Lamp",
                    "uuid_base":"LIVROOMLAMP00001"
                    "services": [
                        {

````
Then you can change the name of the device without harm to your device database in homekit, as the internal IDs are based on the *uuid_base* field instead of the *name* field. 

# Supported Services and their characteristics
## ContactSensor
-  ContactSensorState: DPT 1.002, 0 as contact 
-  ~~ContactSensorStateContact1: DPT 1.002, 1 as contact~~

-  StatusActive: DPT 1.011, 1 as true
-  StatusFault: DPT 1.011, 1 as true
-  StatusTampered: DPT 1.011, 1 as true
-  StatusLowBattery: DPT 1.011, 1 as true

## GarageDoorOpener
-  CurrentDoorState: DPT5 integer value in range 0..4  
	//			Characteristic.CurrentDoorState.OPEN = 0;  
	//			Characteristic.CurrentDoorState.CLOSED = 1;  
	//			Characteristic.CurrentDoorState.OPENING = 2;  
	//			Characteristic.CurrentDoorState.CLOSING = 3;  
	//			Characteristic.CurrentDoorState.STOPPED = 4;  

-  TargetDoorState: DPT5 integer value in range 0..1  
	// Characteristic.TargetDoorState.OPEN = 0;  
	// Characteristic.TargetDoorState.CLOSED = 1;  

-  ObstructionDetected: DPT1, 1 as true

-  LockCurrentState: DPT5 integer value in range 0..3  
    - Characteristic.LockCurrentState.UNSECURED = 0;  
    - Characteristic.LockCurrentState.SECURED = 1;  
    - Characteristic.LockCurrentState.JAMMED = 2;  
    - Characteristic.LockCurrentState.UNKNOWN = 3;  

-  LockTargetState: DPT5 integer value in range 0..1  
	//			Characteristic.LockTargetState.UNSECURED = 0;  
	//			Characteristic.LockTargetState.SECURED = 1;  



## Lightbulb
 -  On: DPT 1.001, 1 as on, 0 as off
 -  Brightness: DPT5.001 percentage, 100% (=255) the brightest

## LightSensor
-  CurrentAmbientLightLevel: DPT 9.004, 0 to 100000 Lux 
 
## LockMechanism (This is poorly mapped!)
-  LockCurrentState: DPT 1, 1 as secured  
-  ~~LockCurrentStateSecured0: DPT 1, 0 as secured~~
-  LockTargetState: DPT 1, 1 as secured 
-  ~~LockTargetStateSecured0: DPT 1, 0 as secured~~

*ToDo here: correction of mappings, HomeKit reqires lock states UNSECURED=0, SECURED=1, JAMMED = 2, UNKNOWN=3*

## MotionSensor
-  MotionDetected: DPT 1.002, 1 as motion detected

-  StatusActive: DPT 1.011, 1 as true
-  StatusFault: DPT 1.011, 1 as true
-  StatusTampered: DPT 1.011, 1 as true
-  StatusLowBattery: DPT 1.011, 1 as true

## Outlet
 -  On: DPT 1.001, 1 as on, 0 as off
 -  OutletInUse: DPT 1.011, 1 as on, 0 as off
 
## Switch
 -  On: DPT 1.001, 1 as on, 0 as off

## TemperatureSensor
-  CurrentTemperature: DPT9.001 in °C [listen only]
  
## Thermostat
-  CurrentTemperature: DPT9.001 in °C [listen only], -40 to 80°C if not overriden as shown above
-  TargetTemperature: DPT9.001, values 0..40°C only, all others are ignored
-  CurrentHeatingCoolingState: DPT20.102 HVAC, because of the incompatible mapping only off and heating (=auto) are shown, [listen only]
-  TargetHeatingCoolingState: DPT20.102 HVAC, as above

## Window
-  CurrentPosition: DPT5.001 percentage
-  TargetPosition: DPT5.001 percentage
-  PositionState: DPT5.005 value [listen only: 0 Increasing, 1 Decreasing, 2 Stopped]

## WindowCovering
-  CurrentPosition: DPT5.001 percentage
-  TargetPosition: DPT5.001 percentage
-  PositionState: DPT5.001 value [listen only: 0 Closing, 1 Opening, 2 Stopped]
*As of iOS9.1 Siri does not support window covering properly.*

### not yet supported
-  HoldPosition
-  TargetHorizontalTiltAngle
-  TargetVerticalTiltAngle
-  CurrentHorizontalTiltAngle
-  CurrentVerticalTiltAngle
-  ObstructionDetected

# Status Web Server
You can see the last telegrams' values on port 3000, as in http://YOURIP:3000  


# DISCLAIMER
**This is work in progress!**

[npm-url]: https://npmjs.org/package/homebridge-knx

[downloads-image]: http://img.shields.io/npm/dm/homebridge-knx.svg

[npm-image]: http://img.shields.io/npm/v/homebridge-knx.svg

[appveyor-image]:https://ci.appveyor.com/api/projects/status/bsu9w9ar8pboc2nj?svg=true
[appveyor-url]:https://ci.appveyor.com/project/snowdd1/homebridge-knx

[codeship-image]:https://codeship.com/projects/79da7240-5481-0132-ea32-42ab35009c21/status
[codeship-url]:https://codeship.com/projects/49203

[david-dm-url]:https://david-dm.org/snowdd1/homebridge-knx
[david-dm-image]:https://david-dm.org/snowdd1/homebridge-knx.svg
