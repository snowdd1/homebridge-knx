#Changelog for Version 0.3.x

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
**Appendices** - Sub-Patch; no code change; documentation changes only! Will **not** be published to **NPM**
