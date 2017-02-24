#Changelog for Version 0.3.x
###0.3.9
- New Add-in!
  - for CO2Sensors, thanks to [Matevz Gacnik](https://github.com/matevzg)! He was so kind to put it in [Issue 85](https://github.com/snowdd1/homebridge-knx/issues/85) for me to publish it.
  - Translates definable limits to HomeKit specific status values. See the [example in the code](https://github.com/snowdd1/homebridge-knx/blob/master/lib/addins/AirQualityCO2.js#L44)
   
###0.3.8
- Documentation of knx_config.json changed: [Recommend to place all services in a room into one device](https://github.com/snowdd1/homebridge-knx/blob/master/knx_config.json.md#devices). [Issue 83](https://github.com/snowdd1/homebridge-knx/issues/83)  
Thanks to [Matevž Gačnik](https://github.com/matevzg) for pointing that out.
- Version bumped to 0.3.8 as npm does not like 0.3.7-a (no update on `npm update homebridge-knx, see #82)

###0.3.7-a
- Fixed the dependency to homebridge, which was already somewhat futuristic:  
  -  Current is 0.4.16  
  -  Required 0.4.19  
did not work, fixed now.

###0.3.7
- Enhancements
  - Does not send values to homekit that haven't changed. Might take some pressure from the Lightbulb with dimmer-going-havoc issue, though it doesn't solve it completely.
  
###0.3.6
- Bugfixes
  - #79 Wrong assumption about FORMAT and UNIT of homekit types referring to PERCENTAGES

###0.3.5-a
- Enhancements
  - #60 Experimental RBG light controller updated. Should now convert from HomeKit to RGB and from KNX RGB to Homekit HSB. Untested. Have no hardware.  
    
##0.3.5
- Enhancements
  - #72 Allow 16 bit addresses (extended address structure, might be incompatible with older devices; in case of doubt restrict your address range to (15/7/255) as in ETS 3 and before)

##0.3.4
- Bugfixes
  - #66 Invalid values returned for enumerated-code characteristics
  - #67 `Reverse` keyword did not work at all
  - #69 group address validation is wrong

- New *mini* feature
  - new keyword "ValidValues" allows to restrict the options in homekit apps such as Apple's **Home**. Others might not yet support that (Elgato Eve 2.5.1 does not, e.g.)

##0.3.3
- included new addins
  -  **WindowCoveringTilt** by giase82/Christof
  -  **GiaseGarageDoorOpener** by giase82/Christof
  - RGB light test addin
- some code cleaning
- Known Issues
  - `Reverse` not working reliably in some cases https://github.com/snowdd1/homebridge-knx/issues/67
  - Not filtering invalid responses before answering to homekit https://github.com/snowdd1/homebridge-knx/issues/66

##0.3.2
- Fixed `-U <path> not being used for knx_config.json path
- added new getProperty() method to add-in API

##0.3.1-a
Updated README only

##0.3.1 
###maintenance/patch release
- Updated [`homebridge`](https://github.com/nfarina/homebridge) dependency to >=0.4.9, as an important bug has been fixed in that version, that especially KNX users with a lot of services (and we all have, don't we?) could affect.
- Updated `eibd` dependency to latest version 0.3.5
- Updated `debug` dependency to latest stable version 2.3.0  
- Removed a legacy line of code that was never executed

##0.3.0
###initial release


#Version numbering conventions
**First digit** - Major version; if =0 then software is assumed to be not production ready (in this case - it's open source non-commercial and therefore use at own risk!)  
**Second digit** - Minor version number; Increase of minor version should not break compatibility, unless **first digit was 0**  
**Third digit** - Patch number, unless **first digit was 0**; then minor version  
**Appendices** - Sub-Patch; no code change; documentation changes only! Will usually **not** be published to **NPM**
