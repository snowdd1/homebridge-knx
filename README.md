# homebridge-knx Version 0.3 
[![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url][![Dependency status][david-dm-image]][david-dm-url]   

KNX platform shim for homebridge.
**This cannot run stand-alone in node!**

Please also visit [homebridge github homepage](https://github.com/nfarina/homebridge) first.

Latest to homebridge-knx changes can be found in the [CHANGELOG.md](CHANGELOG.md)

### This can only be used with homebridge >=0.4.28 and Node >=10.19.0

### Prerequisites
This node module requires a running (and properly configured) **knx daemon (knxd)**. You can find the latest version [here](https://github.com/knxd/knxd).  
I cannot support the knxd. Please address issues directly at the [knxd issue pages](https://github.com/knxd/knxd/issues). It might help to search the existing issues, as your problem might have been solved already.  

### Installation and running
-  Install homebridge first, [see there](https://github.com/nfarina/homebridge); nfarina recommends a global install as super user. It's a server tool, so we can safely assume that the person that installes it is sufficiently  priviledged to do so. `sudo npm install -g homebridge`
-  then install this package to `<any>` directory you want; If you installed homebridge globally I recommend to do so with homebridge-knx: `sudo npm install -g homebridge-knx`
-  configure homebridge and its plugins. You might start by copying the [`KNX-sample-config.json`](https://github.com/snowdd1/homebridge-knx/blob/master/KNX-sample-config.json) to a new folder `.homebridge` in your user folder (on a default installation raspberry, it's `/home/pi`) and rename it to config.json
- Then put the configuration file*knx_config.json* into `~/.homebridge`, and adapt them to your needs (knxd address and some test devices in `knx_config.json`). You do not need a `platform` section in `config.json`any more!
-  Eliminate everything (especially all group addresses) that might harm your KNX installation. Sending bus telegrams to your alarm device might wake the neighbourhood unpleasantly!
-  when done, start homebridge with `homebridge`. If you have chosen a local install, go to the homebridge folder and do a `bin/homebridge --plugin-path <any>/homebridge-knx` with the path to the homebridge-knx installation.


# Assumptions
Without using a special handler (add-in) for the service, homebridge-knx assumes the following:

HomeKit type | KNX addresses DPT   
-------- | ------  
Boolean | DPT1  
Integer | DPT5  
Percentage | DPT5.001  
Float | DPT9  


# knx_config.json
See the [complete Doc!](https://github.com/snowdd1/homebridge-knx/blob/plugin-2.0/knx_config.json.md).


# Add-ins
Add-in (aka "handlers") can change the default behavior. [See the article](https://github.com/snowdd1/homebridge-knx/blob/plugin-2.0/handler-add-in.md)

Happy testing!

# Removing stale accessories from homebridge cache
The new (well, 1/2016) API of homebridge allows homebridge to cache the accessories for platforms that can add or remove accessories during runtime. As a next step in evolution, homebridge-knx already connects to that API.  

**Allow homebridge-knx to start the webserver by adding `"AllowWebserver":true,` at the beginning of your knx_config.json!**

As a consequence remain devices, that homebridge-knx does not reconnnect to at start-up, stale and unreachable in HomeKit. To remove those shadows from HomeKit, use the little web server at `<your-homebridge>:18081/list`. You might change the web server port with `"WebserverPort":18082` or whatever port suits you. 

![image](https://cloud.githubusercontent.com/assets/11786396/19836160/5d1ddcde-9e98-11e6-8dc2-e621aceb1055.png)  
Clicking on the `delete from cache` link will **only** remove the devices from the current homebridge instance and their cache, **not** from the *knx_config.json*, that means they will be rediscovered upon next startup as new device in the default room!

# Looking up service types and characteristics  
If you have the webserver enabled (see above), you can get an auto-generated web-page with all the service types and their characteristics from homebridge. See the links at the bottom of your server's list page.


# Killing homebridge
**This is for debugging of your knx_config.json only.** If you need homebridge to restart, you can use the setting `"AllowKillHomebridge":true` in your knx_config.json (right on top where the knxd properties are).  
You'll get a new link at the bottom of the page at `<your-homebridge>:18081/list` that will homebridge-knx to throw an exception ("Committed_Suicide") which then causes homebridge to fail.  
*You should remove this setting after completing your knx_config.json for security reasons!* 


[npm-url]: https://npmjs.org/package/homebridge-knx
[downloads-image]: http://img.shields.io/npm/dm/homebridge-knx.svg
[npm-image]: http://img.shields.io/npm/v/homebridge-knx.svg
[david-dm-url]: https://david-dm.org/snowdd1/homebridge-knx
[david-dm-image]: https://david-dm.org/snowdd1/homebridge-knx.svg
