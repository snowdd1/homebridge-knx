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

###this.myAPI.setValue (field, value)  
Sets a **homekit** value for a local characteristic
- {string} field - The type/name of the characteristic, like "On" for lightbulb power
- {number} value - the value for the characteristic, dependent on the characteristic's type

