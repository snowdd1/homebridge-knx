# Changelog for Version 0.3.x

## 0.3.27
- @CyberChris79 found a breaking change in HAP-nodeJS (the HAP protocol implementation which homebridge is build on) which broke the tiny web server that can display HAP Services and such (see https://github.com/snowdd1/homebridge-knx#looking-up-service-types-and-characteristics) *Note to self: the webserver implementation is ugly and has grown too much for kind-of inline code in index.js*

## 0.3.26
- @giase82 updated the ThermostatMode handler in #169 to be able to update the Bus value also from HomeKit
- Found another glitch in the knxaccess.js library where KNXJS was used even if it was not specified (regression from 0.3.24)

## 0.3.25
- martijndierkx contributed an MDTJalousieActuator handler in PR #167 - Big thanks to him!
- I updated the SimpleGarageDoor handler to accept two new local constants: "ResetOpenDoorContactTime" and "ResetCloseDoorContactTime" in Milliseconds if you want to issue an KNX "0" after a givin time, in case you don't want or must not have a relay powered all the time. Fixes German issue 65 from homebridge-knx-de at [https://github.com/snowdd1/homebridge-knx-de/issues/65]
- And I updated the handler API doc to reflect the changes from v0.3.21; Actually the SimpleGarageDoor handler uses the new init event.

## 0.3.24 
- patched configuration to default to knxd again. Fixes [#162](https://github.com/snowdd1/homebridge-knx/issues/162). See also changed documentation in [knx_config.json.md](https://github.com/snowdd1/homebridge-knx/blob/master/knx_config.json.md)

## 0.3.23 
- With PR [#160](https://github.com/snowdd1/homebridge-knx/pull/161) Luehrsen added the ability to have local add-in directories. I hope that you all still continue to share your add-ins ("handler"s) via PRs here, so that all of us can benefit from the developments.
- Homebridge made a leap to version 1.0.0 - with **bracking changes**:
  - you all need to change your config.json and add the KNX platform manually! See updated sample file [https://github.com/snowdd1/homebridge-knx/blob/master/KNX-sample-config.json](https://github.com/snowdd1/homebridge-knx/blob/master/KNX-sample-config.json) and issue [#163](https://github.com/snowdd1/homebridge-knx/issues/163)
  - node version needs to be at least 10.0 now!
- Dependency bump to current versions


## 0.3.22 
- thanks to [Paul](https://github.com/c-o-m-m-a-n-d-e-r)'s PR #152, now knxd is not mandatory any more. Documentation will follow!
- And he also fixed the typo in the GarageDoorAdvanced handler in #158. 

## 0.3.21
- new call hooks for custom handlers. Invented by [ctschach](https://github.com/ctschach/homebridge-knx/commit/5829bf2a1ccf2fa34e37b4d55d87c763a0d5e786), the custom handlers now get informed when the service is ready 
  - `onServiceInit()`  
  and when all devices are loaded and initialized
  - `onHomeKitReady()`

## 0.3.20
- thanks to hints in #149 I found another glitch in the dimmer handler, which was there for ... well, let's settle for "a long time" :-)

## 0.3.19
- new feature: [EIBHomeControl](https://github.com/EIBHomeControl) contributed a simple security system handler.

## 0.3.18
- bugfix for shutter state (opening/closing) being shown in home app reversed (yes, home app now uses the PositionState value in ios12.1+)

## 0.3.17
- bugfix for an issue in which external KNX switching off of a dimmable light was not recognized by the dimmer handler. Thanks to [Michael](https://github.com/misc2000) for his [PR 136](https://github.com/snowdd1/homebridge-knx/pull/136)

## 0.3.16
- bugfix for a scaling issue with the new handler in 0.3.15

## 0.3.15
- new handler for Dimmers to avoid Apple's **Home**(c) app's disastrous handling of On and Brightness events. Thanks [dlt-](https://github.com/dlt-) for [pointing that out](https://github.com/snowdd1/homebridge-knx/issues/47#issuecomment-325161018). I rewrote it to make it more customizable, and to avoid flickering of the slider in the app due to knx responses. 
- new Readme design :-)

## 0.3.14
- fix [bug #122](https://github.com/snowdd1/homebridge-knx/issues/122) with wrongly spelled service reference in custom API
- fix [bug #123]() with  missing integer typer UINT12 and UINT32 which are now used in Homekit(c) types
- bump dependencies to actual versions

## 0.3.13
- bump required packages to new versions: 
  - node-eibd to 0.3.9 (regression!)
  - debug to 3.1.0 

## 0.3.12

- changed logging of KNX value changes: [type INFO changed to DEBUG to avoid filling the logs, #93](https://github.com/snowdd1/homebridge-knx/issues/93) 
- commented out the code stub [throwing an exception at homebridge start, #89](https://github.com/snowdd1/homebridge-knx/issues/89)
- ~~allow **Reverse keyword** for UINT8 homekit types that have only 0,1 as valid values [(treat as boolean) #91](https://github.com/snowdd1/homebridge-knx/issues/91#issuecomment-305266948)~~ *Had to be skipped for complete rework of data value validation in HAP-nodeJS v.0.4.32 and beyond* 
- The parameter "AllowWebserver" now has a companion "WebserverPort" if you want to use something different than 18081 (or want to run two instances in parallel as I did)
- requires homebridge 0.4.28
- [merged fix](https://github.com/snowdd1/homebridge-knx/pull/103) from [gkuehn001](https://github.com/gkuehn001) for [true/false vs. 1/0 responses from Siri and home app](https://github.com/nfarina/homebridge/commit/b6f382950ceba1b640808ffdc1de358c4738ec09) for OneWaySwitch handler


## 0.3.11
- tiny internal web server has new pages:
  - /availservices shows the services from hap-nodejs 
  - /availcharacteristics shows the characteristics from hap-nodejs
  - these pages are linked
  - localization is prepared but not implemented yet
  - properties of the characteristics are listed but not explained

### 0.3.10-b
- Just pushing dependency to eibd to beyond 0.3.8, which was faulty (and it was my fault.)  

## 0.3.10
- New Add-in
  - From the German [knx-user-forum.de](https://knx-user-forum.de/forum/projektforen/knxd/1068186-zentral-aus) the idea of having a one-way switch to shut off central functions such as switching lights off all at once was voiced, so here it is: [**OneWaySwitch** handler](https://github.com/snowdd1/homebridge-knx/blob/master/lib/addins/OneWaySwitch.js)
  
- Ignore Option
  -  For those who want to (for whatever reason) run multiple homebridge instances on the same machine whilst having them globally installed, now a file named `**knx-ignore.txt**` in the homebridge-configuration folder (of the respective instance, defaults to `~/.homebridge` ) prevents the loading of homebridge-knx.
   
## 0.3.9
- New Add-in!
  - for CO2Sensors, thanks to [Matevz Gacnik](https://github.com/matevzg)! He was so kind to put it in [Issue 85](https://github.com/snowdd1/homebridge-knx/issues/85) for me to publish it.
  - Translates definable limits to HomeKit specific status values. See the [example in the code](https://github.com/snowdd1/homebridge-knx/blob/master/lib/addins/AirQualityCO2.js#L44)
   
## 0.3.8
- Documentation of knx_config.json changed: [Recommend to place all services in a room into one device](https://github.com/snowdd1/homebridge-knx/blob/master/knx_config.json.md#devices). [Issue 83](https://github.com/snowdd1/homebridge-knx/issues/83)  
Thanks to [Matevž Gačnik](https://github.com/matevzg) for pointing that out.
- Version bumped to 0.3.8 as npm does not like 0.3.7-a (no update on `npm update homebridge-knx, see #82)

### 0.3.7-a
- Fixed the dependency to homebridge, which was already somewhat futuristic:  
  -  Current is 0.4.16  
  -  Required 0.4.19  
did not work, fixed now.

## 0.3.7
- Enhancements
  - Does not send values to homekit that haven't changed. Might take some pressure from the Lightbulb with dimmer-going-havoc issue, though it doesn't solve it completely.
  
## 0.3.6
- Bugfixes
  - #79 Wrong assumption about FORMAT and UNIT of homekit types referring to PERCENTAGES

### 0.3.5-a
- Enhancements
  - #60 Experimental RBG light controller updated. Should now convert from HomeKit to RGB and from KNX RGB to Homekit HSB. Untested. Have no hardware.  
    
## 0.3.5
- Enhancements
  - #72 Allow 16 bit addresses (extended address structure, might be incompatible with older devices; in case of doubt restrict your address range to (15/7/255) as in ETS 3 and before)

## 0.3.4
- Bugfixes
  - #66 Invalid values returned for enumerated-code characteristics
  - #67 `Reverse` keyword did not work at all
  - #69 group address validation is wrong

- New *mini* feature
  - new keyword "ValidValues" allows to restrict the options in homekit apps such as Apple's **Home**. Others might not yet support that (Elgato Eve 2.5.1 does not, e.g.)

## 0.3.3
- included new addins
  -  **WindowCoveringTilt** by giase82/Christof
  -  **GiaseGarageDoorOpener** by giase82/Christof
  - RGB light test addin
- some code cleaning
- Known Issues
  - `Reverse` not working reliably in some cases https://github.com/snowdd1/homebridge-knx/issues/67
  - Not filtering invalid responses before answering to homekit https://github.com/snowdd1/homebridge-knx/issues/66

## 0.3.2
- Fixed `-U <path> not being used for knx_config.json path
- added new getProperty() method to add-in API

### 0.3.1-a
Updated README only

## 0.3.1 
###maintenance/patch release
- Updated [`homebridge`](https://github.com/nfarina/homebridge) dependency to >=0.4.9, as an important bug has been fixed in that version, that especially KNX users with a lot of services (and we all have, don't we?) could affect.
- Updated `eibd` dependency to latest version 0.3.5
- Updated `debug` dependency to latest stable version 2.3.0  
- Removed a legacy line of code that was never executed

## 0.3.0
initial release


# Version numbering conventions
**First digit** - Major version; if =0 then software is assumed to be not production ready (in this case - it's open source non-commercial and therefore use at own risk!)  
**Second digit** - Minor version number; Increase of minor version should not break compatibility, unless **first digit was 0**  
**Third digit** - Patch number, unless **first digit was 0**; then minor version  
**Appendices** - Sub-Patch; usually no code change; documentation changes only! Will usually **not** be published to **NPM**
