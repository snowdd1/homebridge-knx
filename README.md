# homebridge-knx Version 0.3.0 (alpha testing state)
## NEW
This is going to be something completely new.

This is (probably) not the repo you're looking for...

# The only thing that changes is _everything_
A lot of changes at once 
- own persistence (own file) instead of shared config.json with homebridge *(knx_config.json in homebridge home directory, next to homebridge's config.json)*
- all new concept: no native services any more, but using the defaults from HAP-NodeJS
- you can now assign *any* characteristic to *any* service, until Apple's homekit says that's incomplient.
- ~~all new concept: define group addresses with more parameters and assign them to characteristics~~
- tidied up the room: new keywords for the *knx_config.json* (buh, a lot of work for you to do!)


# Assumptions
Without using a special handler (add-in) for the service, homebridge-knx assumes the following:

HomeKit type | KNX addresses DPT   
-------- | ------  
Boolean | DPT1  
Integer | DPT5  
Percentage | DPT5.001  
Float | DPT9  


# knx_config.json

*Devices* instead of *accessories*:  

```json
	"Devices": [ 
		{ 
			"DeviceName": "device name" 
			...
		}
	]
```
Changed capitalization (harmonized)!  

See the [complete Doc!](https://github.com/snowdd1/homebridge-knx/blob/plugin-2.0/knx_config.json.md).


# Add-ins
Add-in (aka handlers) can change the default behavior. [See the article](https://github.com/snowdd1/homebridge-knx/blob/plugin-2.0/handler-add-in.md)
