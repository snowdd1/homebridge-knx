#Changelog for Version 0.3.x

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
