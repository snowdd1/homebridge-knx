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
	...
}
``` 

 


## API

