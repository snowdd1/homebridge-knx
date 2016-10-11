# General structure
homebridge-knx expects the following structure in the `knx_config.json`:

```
{
    "platform": "KNX",
    "name": "KNX",
    "knxd_ip": "192.168.1.1",
    "knxd_port": 6720,
    "Devices": [
    ]
}
```
`192.168.1.1` has to be changed to your [knxd](https://github.com/knxd/knxd) installation, and `6720` to the port you are using (6720 is default).  
`platform` and `name` need exactly to be as above.

`Devices` is an array of objects, each representing an *homekit accessory*. 

#Devices
`Devices` must have a unique `DeviceName`. The name cannot be changed in the config file after pairing with homekit, because homekit *copies* it into its database. You can change the name of the device in homekit afterwards; unless you erase your home or un-pair homebridge it will keep the changed name.  
In Apple's `Home` app (or other homekit enabled apps) devices can get assigned to rooms.

Each device needs a section `Services`. Here all functionality of the device is defined.

#Services
`Services` again is an array of objects, each representing a *homekit service*.  
Each service **must** have:
- a unique `ServiceName` (regarding changing names in a paired instance [see Devices](#devices) )
- a known *homekit* `ServiceType`
- a `Characteristics` section, containing all the variables that homekit can handle.    
A service **can** have:  
- an `handler` entry, pointing to an add-in to handle all requests for the service.  
- a `KNXObjects` array containing KNX group addresses used by the handler and not directly connected to a characteristic.  
- a `KNXReadRequests` array containing group addresses that should be read upon startup of homebridge, to sync the status of characteristics with the physical devices.   

Service types are regularly amended by Apple, to get new service types into homebridge-knx we need to update homebridge using npm.
There is a Javascript file containing all valid services and characteristics located here: https://github.com/KhaosT/HAP-NodeJS/blob/master/lib/gen/HomeKitTypes.js

 
##Characteristics
Each characteristic is an object containing at least a `Type` field. Types can be "On" for power, "Brightness" for dimmable lights etc.  
Characteristics **can** have assigned group addresses in the `Set` and `Listen` arrays.
For the group addresses it is possible to define a *data point type* `DPT` (currently valid are DPT1, DPT5, DPT5.001, DPT9).

Characteristics without group addresses can only be used by a `handler`

##handler
New in version 0.3 of homebridge-knx is a little add-in concept, allowing additional functionality to be added without changing the big mass of the code.  
`handler`s are defined as javascript files in `/lib/addins` and need to follow some restrictions *[more to come here]*
To assign a handler to a service the **handler** keyword is used, see example below.

##KNXObjects
Handlers can make use of KNX group addresses that are not connected directly to characteristics. To allow references to those addresses, they are defined as if they were characteristics. 
- The `Type` field is a freely definable name field (uniqueness within the service required). 
- Definition of `DPT` **is mandatory** as the data point type cannot be inferred from a homekit characteristic!  

##LocalConstants
Handlers can use service-local constants in their code. This allows using the same handler for alike-but-not-equal use cases. 


#Example
```
{
    "platform": "KNX",
    "name": "KNX",
    "knxd_ip": "192.168.178.212",
    "knxd_port": 6720,
    "Devices": [
        {
            "DeviceName": "Arbeitszimmerlampe",
            "Services": [
                {
                    "ServiceType": "Lightbulb",
                    "ServiceName": "Bürolampe",
                    "Characteristics": [
                        {
                            "Type": "On",
                            "Set": [
                                "1/3/5"
                            ],
                            "Listen": [
                                "1/3/5"
                            ]
                        }
                    ]
                }
            ]
        },
        {
            "DeviceName": "Arbeitszimmerrollo",
            "Services": [
                {
                    "ServiceType": "WindowCovering",
                    "Handler": "GiraJalousieActuator",
                    "ServiceName": "Büro-Rollo",
                    "Characteristics": [
                        {
                            "Type": "TargetPosition",
                            "Set": [
                                "2/3/46"
                            ],
                            "DPT": "DPT5"
                        },
                        {
                            "Type": "CurrentPosition",
                            "Listen": [
                                "2/3/26"
                            ]
                        },
                        {
                            "Type": "PositionState"
                        }
                    ],
                    "KNXObjects": [
                        {
                            "Type": "ShutterMove",
                            "Listen": "2/3/6",
                            "DPT": "DPT1"
                        }
                    ],
                    "KNXReadRequests": [
                        "2/3/26",
                        "2/3/46"
                    ],
                    "LocalConstants": {
                        "SomeVariable_notUsedHere": "SomeValue",
                        "OtherBlinds_notUsedHere": "OfficeShutter"
                    }
                }
            ]
        }
    ],
    "GroupAddresses": []

}
```