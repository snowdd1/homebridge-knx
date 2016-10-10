# NEW
This is going to be something completely new.

This is (probably) not the repo you're looking for...

# The only thing that changes is _everything_
A lot of changes at once 
- own persistence (own file) instead of shared config.json with homebridge
- all new concept: no native services any more, but using the defaults from HAP-NodeJS
- all new concept: define group addresses with more parameters and assign them to characteristics
- tidied up the room: new keywords for the knx_config.json (buh, a lot of work for you to do!)


# Assumptions
Without using a special handler (add-in) for the service, homebridge-knx assumes the following:

|HomeKit type|KNX addresses DPT|
-----------------------------
|Boolean|DPT1|
|Integer|DPT5|
|Percentage|DPT5.001|
|Float|DPT9|


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

Like before, *Devices* have *Services*. New: The *Characteristics* are an Array.  
Characteristics are listed as objects (i.e. in braces {}), they need a *Type* like "On".  
*Set* and *Listen* can be arrays of addresses.  
For a characteristic of DPT1 and DPT5 the values can be reversed by adding the *"Reverse": true* keyword to the characteristic.  
If you need to specify the data point type (see assumptions above) you can do so with *DPT*    

```json
			"Services": [ 
				{ 
					"ServiceType": "Lightbulb", 
					"ServiceName": "Living Room North Lamp", 
					"Characteristics": [ 
						{ 
							"Type": "On", 
							"Set": "1/1/6",
							"Listen": ["1/1/63"],
							"Reverse": true,
							"DPT": "DPT1"
						 }, 

```

## "Reverse": true
instead of ~~1/2/3R~~

## DPT
Supported are DPT1, DPT5, DPT5.001, DPT9





# Add-ins
Add-in (aka handlers) can change the default behavior.
