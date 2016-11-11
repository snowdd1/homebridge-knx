# homebridge-knx Version 0.3.0 
[![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url][![Dependency status][david-dm-image]][david-dm-url]   

## NEW
This **is** something completely new.

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

# Installation
If you have read through here, you probably qualify as intrepid enough to install insufficiently tested software on your device.
  
I recommend using a dedicated directory, and do not install it *globally* as root.  
Here's my sample installation for the beta on a **raspberry pi** (that has everything installed to use the non-beta, like **node**):  

```shell
pi@homebridge-dev:~ $ mkdir z_test
pi@homebridge-dev:~ $ cd z_test/
pi@homebridge-dev:~/z_test $ npm install homebridge
...
pi@homebridge-dev:~/z_test $ npm install homebridge-knx@beta
homebridge-knx@0.3.0-beta2 ../node_modules/homebridge-knx
├── eibd@0.3.5
└── debug@2.2.0 (ms@0.7.1)
pi@homebridge-dev:~/z_test $
```

Then put the configuration files *knx_config.json* and *KNX-sample-config.json* (as *config.json*) into `~/.homebridge`, and adapt them to your needs (knxd address and some test devices in `knx_config.json`). You do not need a `platform` section in `config.json`any more!

Happy testing!

# Removing stale accessories from homebridge cache
The new (well, 1/2016) API of homebridge allows homebridge to cache the accessories for platforms that can add or remove accessories during runtime. As a next step in evolution, homebridge-knx already connects to that API.  

**Allow homebridge-knx to start the webserver by adding `"AllowWebserver":true,` at the beginning of your knx_config.json!**

As a consequence remain devices, that homebridge-knx does not reconnnect to at start-up, stale and unreachable in HomeKit. To remove those shadows from HomeKit, use the little web server at `<your-homebridge>:18081/list`

![image](https://cloud.githubusercontent.com/assets/11786396/19836160/5d1ddcde-9e98-11e6-8dc2-e621aceb1055.png)  
Clicking on the `delete from cache` link will **only** remove the devices from the current homebridge instance and their cache, **not** from the *knx_config.json*, that means they will be rediscovered upon next startup as new device in the default room!

# Killing homebridge
**This is for debugging of your knx_config.json only.** If you need homebridge to restart, you can use the setting `"AllowKillHomebridge":true` in your knx_config.json (right on top where the knxd properties are).  
You'll get a new link at the bottom of the page at `<your-homebridge>:18081/list` that will homebridge-knx to throw an excpetion ("Committed_Suicide") which then causes homebridge to fail.  
*You should remove this setting after completing your knx_config.json for security reasons!* 


[npm-url]: https://npmjs.org/package/homebridge-knx
[downloads-image]: http://img.shields.io/npm/dm/homebridge-knx.svg
[npm-image]: http://img.shields.io/npm/v/homebridge-knx.svg
[david-dm-url]:https://david-dm.org/snowdd1/homebridge-knx
[david-dm-image]:https://david-dm.org/snowdd1/homebridge-knx.svg
