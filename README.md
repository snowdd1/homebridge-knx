# homebridge-knx
[![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url]

KNX platform plugin for Homebridge, maintained by [@HolyGiraffe](https://github.com/HolyGiraffe).
**This cannot run stand-alone in Node.js!**

Please also visit the [Homebridge homepage](https://homebridge.io/) first.

Release notes can be found in the [CHANGELOG.md](CHANGELOG.md).

### Compatibility
- **Homebridge 2.0 is supported** starting with homebridge-knx 0.6.0.
- Use a Node.js version supported by your Homebridge installation. The plugin
  declares a minimum of Node.js 18 and Homebridge 1.6.0, but Homebridge 2.0 has
  higher Node.js requirements.
- Compatibility fallbacks for Homebridge 1.x remain in place, but automated tests
  cover the HAP library used by Homebridge 2.x, not a full Homebridge 1.x installation.
- Version 0.6.0 uses **one KNX configuration file per platform instance**. It does
  not include the multi-file configuration features from the separate 0.5.0
  prerelease branch.

### Prerequisites
This node module requires either 
  - a running (and properly configured) **knx daemon (knxd)**. You can find the latest version [here](https://github.com/knxd/knxd).  
  - a KNX/IP router reachable through KNX multicast, using the `knxjs` backend.

The default backend is `knxd`. To use KNX multicast instead, set
`"knxconnection": "knxjs"` in your KNX configuration file. See the
[configuration documentation](knx_config.json.md) for connection settings.

For issues with knxd itself, please use the [knxd issue pages](https://github.com/knxd/knxd/issues). Search existing issues first, as your problem might have been solved already.

### Installation and running
- Install homebridge first, from [https://homebridge.io/](https://homebridge.io/); 
- Once you have your instance running (without any devices yet), go to the `Plugins` tab and type `knx` in the search box
- `homebridge-knx` should be within the top five hits (yes, there are alternatives), please check the name before installing
- Put [knx_config.json](knx_config.json) into your **Homebridge storage directory**
  (typically `~/.homebridge`, but this depends on your installation). Adapt it to
  your KNX connection and devices. The file must be readable and writable by the
  user running Homebridge because the plugin writes generated device UUIDs and
  service subtypes back to it.
- Review all group addresses before starting. Remove sample devices and addresses
  that do not belong to your installation; sending telegrams to the wrong address
  can operate real equipment.
- Add a platform entry with `"name": "KNX"` and `"platform": "KNX"` to the
  Homebridge configuration, even when using the default KNX configuration path:

```json
{
    "platforms": [
        {
            "name": "KNX",
            "platform": "KNX"
        }
    ]
}
```

- To use a different KNX configuration file, set `config_path` to its absolute
  path. Use separate platform instances with separate files and child bridges
  when splitting accessories across bridges. Each bridge supports up to 149
  bridged accessories.
- Restart Homebridge after saving both configurations.

The following example shows two platform instances, one using a child bridge:

```json
{
    "bridge": {
        "name": "Homebridge 17AF",
        "username": "0E:0B:9B:24:17:AD",
        "port": 51485,
        "pin": "880-83-869",
        "advertiser": "avahi"
    },
    "accessories": [],
    "platforms": [
        {
            "name": "Config",
            "port": 8581,
            "auth": "form",
            "theme": "auto",
            "tempUnits": "c",
            "lang": "en",
            "platform": "config"
        },
        {
            "name": "KNX",
            "platform": "KNX",
            "config_path": "/home/pi/homebridge/dg-knx_config.json"
        },
        {
            "name": "KNX",
            "platform": "KNX",
            "config_path": "/home/pi/homebridge/og-knx_config.json",
            "_bridge": {
                "username": "0E:0B:9B:24:17:00",
                "port": 51490
            }
        }
    ]
}
```


# Assumptions
Without using a special handler (add-in) for the service, homebridge-knx assumes the following:

HomeKit type | KNX addresses DPT   
-------- | ------  
Boolean | DPT1  
Integer | DPT5  
Percentage | DPT5.001  
Float | DPT9  

Percentage means a characteristic with a percentage unit, not a separate HomeKit
format. An explicit `DPT` in the characteristic configuration overrides these defaults.


# knx_config.json
See the [configuration documentation](knx_config.json.md).


# Add-ins
Add-ins (also called "handlers") can change the default behavior. See the
[handler documentation](handler-add-in.md) and [built-in handlers](lib/addins).
For example, `LockSensor` reports a lock's state from a KNX binary input without
providing lock control.

Happy testing!


[npm-url]: https://npmjs.org/package/homebridge-knx
[downloads-image]: https://img.shields.io/npm/dm/homebridge-knx.svg
[npm-image]: https://img.shields.io/npm/v/homebridge-knx.svg
