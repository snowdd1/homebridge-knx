# homebridge-knx Version 0.3.0 
[![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url][![Dependency status][david-dm-image]][david-dm-url]   

KNX platform shim for homebridge.
**This cannot run stand-alone in node!**

Please also visit [homebridge github homepage](https://github.com/nfarina/homebridge) first.

Latest to homebridge-knx changes can be found in the [CHANGELOG.md](CHANGELOG.md)

### This can only be used with the new homebridge >=0.4.9 and Node >=4.0.0

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
- remote access is only possible using a local device as HomeKit "router" (i.e. an AppleTV 3rd/4th gen, or an iPad running iOS10)


## NEW VERSION 0.3.0
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
