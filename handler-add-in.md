#Service Handlers

## Purpose

Several functions available in a KNX wired smart home have no 1:1 relation to Apple's homekit world. To allow easy and yet programmatic connections, there is now a little API that makes writing a custom service handler a foreseeable undertaking.

The [example](https://github.com/snowdd1/homebridge-knx/blob/plugin-2.0/lib/addins/GiraJalousieActuator.js) I prepared shows:
- Using of un-connected group addresses.
- Data manipulation 


## Structure

Any handler needs to extend HandlerPattern:

```javascript
var HandlerPattern = require('./handlerpattern.js');
/**
 * @class A custom handler for the GIRA 216100 "Jalousie Aktor" (rolling shutter/blinds actuator)   
 * @extends HandlerPattern
 */
class GiraJalousieActuator extends HandlerPattern {
	/****
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 * 
	 */
	onKNXValueChange(field, oldValue, knxValue) {
	...
	}
	/****
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 * 
	 */
	onHKValueChange(field, oldValue, newValue) {
	...
	}
}
``` 
The two methods `onKNXValueChange()` and `onHKValueChange()` are mandatory.  

## API

Using the local object `this.myAPI` the handler can talk to homekit and to the KNX bus:

###this.myAPI.setValue(field, value)  
Sets a **homekit** value for a local characteristic
- {string} field - The type/name of the characteristic, like "On" for lightbulb power
- {number} value - the value for the characteristic, dependent on the characteristic's type

###this.myAPI.getValue(field)
Returns a local characteristic's value
- {string} field - The name of the characteristic, like "On" for lightbulb power
- returns {number} - Dependent on the charceristic's type
	 
###this.myAPI.knxWrite(field, value, dptype)
Writes a value **to the KNX bus**. Requires a "Set" address in the characteristic
- {string} field - The name of the characteristic, like "On" for lightbulb power
- {primitive} value - The value to be sent.
- {string} dptype - Data Point Type like 
  -  "DPT5" for 1 byte 0..255, 
  -  "DPT5.001" for automatic conversion from decimal 0..100 to 0..255 or 
  -  "DPT1" for boolean


###this.myAPI.getGlobalValue(device, service, field)
Returns a characteristic's value from another device/service.
- {string} device - unique name of the device as in the configuration
- {string} service - unique name of the service as in the configuration
- {string} field - The name of the characteristic, like "On" for lightbulb power
- returns {number}


###this.myAPI.getLocalConstant(field)
Returns a local constant's value. Local constants are stored in the service's sub-section "LocalConstants" and can be used to store referenced services and referenced devices for use with **getGlobalValue()** if you need to make functionality of one service dependent on a value from another service/device. *Example: a homekit blocker switch: If that switch is on, all handlers refuse to send values to the KNX bus.*
- {string} field - The name of the constant
- returns {primitive} - Dependent on the constant's type  
*Comment: This is not intended to be a complete home server replacement. It is thought to be a mapping aid for homekit*

###this.myAPI.getProperty(field,property)
Get a characteristics property. Used for getting the minValue or maxValue or stepValue properties from the homekit characteristic, which might be overwritten by values in the knx_config.json file. Watch out, these use the hap-nodejs-syntax, not the knx_config-syntax. 
- {string} field - The name of the characteristic
- {string} property - The name of the property
- returns either a value, or an array, depending on *property*  
**Known homekit properties:**  
* format: <one of Characteristic.Formats>,
*  unit: <one of Characteristic.Units>,
*  minValue: <minimum value for numeric characteristics>,
*  maxValue: <maximum value for numeric characteristics>,
*  minStep: <smallest allowed increment for numeric characteristics>,
*  perms: array of [Characteristic.Perms] like [Characteristic.Perms.READ, Characteristic.Perms.WRITE]


