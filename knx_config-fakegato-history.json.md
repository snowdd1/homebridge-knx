# Overview
This fork integrates Elgato Eve history service and extended attributes for devices attaches via homebridge-knx. This will only show up in the Eve.app. Other HomeKit apps do not support the history.

Please have a look at [fakegato-history](https://github.com/simont77/fakegato-history) to understand more about the history services.


## Eve specific Homekit services & characteristics
In order to add additional services, the Eve specific services and characteristics have been added to homebridge-knx. You can add them by adding an "eve" in front of the ServiceType:

```
eveWeather
eveHistory
eveAirPressureSensor
eveContactSensor
eveMotionSensor
eveOutlet
eveTemperatureSensor
```

You can find all services via the homebridge-knx internal webserver:

http://homebridge.domain.com.net:18081/availservices

Click on any of the eve-Services to see their homebridge and eve specific characteristics.


## Configuration

Each device can have an optional parameter called "HistoryType". So far fakegato-history service supports the following types: "weather", "energy", "room", "door", motion", "switch" or "thermo".

In homebridge-knx the following history types have been successfully tested and can be fully used without any additional implementations: "weather", "door", "motion" and "switch".


## Temperature & Humidity sensor (weather history)

<img src="https://raw.githubusercontent.com/ctschach/homebridge-knx/master/documentation/screenshots/Screenshot-Weather.PNG" width="33%" align="right" alt="Weather Service">Below is a sample configuration for capturing Temperature history. By adding additional ServiceTypes you can also add humidity and/or air pressure. If you don't have any of those values on your KNX-bus, just remove them from the config. 

```
    "Devices": [
        {
            "DeviceName": "Außen Klima",
            "Services": [
                {
                    "ServiceType": "TemperatureSensor",
                    "ServiceName": "Temperatur Außen",
                    "Characteristics": [
                        {
                            "Type": "CurrentTemperature",
                            "Listen": [
                                "5/1/1"
                            ],
                            "DPT": "DPT9"
                        }
                    ]
                },
                {
                    "ServiceType": "HumiditySensor",
                    "ServiceName": "Luftfeuchtigkeit Außen",
                    "Characteristics": [
                        {
                            "Type": "CurrentRelativeHumidity",
                            "Listen": [
                                "5/1/2"
                            ],
                            "DPT": "DPT5.001"
                        }
                    ]
                },
                {
                    "ServiceType": "eveAirPressureSensor",
                    "ServiceName": "Luftdruck Außen",
                    "Characteristics": [
                        {
                            "Type": "eveAirPressure",
                            "Listen": [
                                "5/1/25"
                            ],
                            "DPT": "DPT9"
                        }
                    ]
                }
            ],
            "HistoryType": "weather"
        },
```


## Motion Sensor (motion history)

<img src="https://raw.githubusercontent.com/ctschach/homebridge-knx/master/documentation/screenshots/Screenshot-Motion.PNG" width="33%" align="right" alt="Motion Sensor">Using the eveMotionSensor ServiceType you can capture the history of your motion sensor. You'll see a graph, the time since the last time motion was detected and can also get a detailed table with the times when motion was detected.

The custom handler "HistoryMotion" will take care of updating the "LastActivation". If you set the parameter "ResetTime", the handler will ignore all "off" values from the motion sensor. Instead, it will launch an internal timer which will reset itself if no motion has been seen for the given amount of seconds (300 seconds = 5 minutes). Inside of the Eve.app you can overwrite this values in the device settings. The value changes via Eve will not be stored and will be set back to the value given in the config if you restart homebridge.

```
        {
            "DeviceName": "Bewegung Wohnzimmer",
            "Services": [
                {
                    "ServiceType": "eveMotionSensor",
                    "Handler": "HistoryMotion",
                    "ServiceName": "Bewegung Wohnzimmer",
                    "Characteristics": [
                        {
                            "Type": "MotionDetected",
                            "Listen": [
                                "6/1/7"
                            ]
                        },
                        {
                            "Type": "eveDuration"
                        },
                        {
                            "Type": "eveLastActivation"
                        }
                    ],
                    "LocalConstants": {
                        "ResetTime": 300
                    }
                }
            ],
            "HistoryType": "motion"
        },
```




## ContactSensor (door history)

<img src="https://raw.githubusercontent.com/ctschach/homebridge-knx/master/documentation/screenshots/Screenshot-Contact.PNG" width="33%" align="right" alt="Contact Sensor">If you have a contact sensor which can detect when you entrance door has been opened you can see the open durration, the exact times and the times opened in the Eve.app. 

The custom handler "HistoryDoor" will take care of increasing the counter for "TimesOpened" and will update the "LastActivation" time. The additional characteristic "ResetTotal" is used by eve to clear the "TimesOpened" counter. Those characteristics will not need a groupaddress as they do not send or receive anything from the KNX-bus.

```
        {
            "DeviceName": "Eingangstür",
            "Services": [
                {
                    "ServiceType": "eveContactSensor",
                    "Handler": "HistoryDoor",
                    "ServiceName": "Eingangstür",
                    "Characteristics": [
                        {
                            "Type": "ContactSensorState",
                            "Listen": [
                                "7/0/14"
                            ],
                            "DPT": "DPT5.001"
                        },
                        {
                            "Type": "eveTimesOpened"
                        },
                        {
                            "Type": "eveLastActivation"
                        },
                        {
                            "Type": "eveResetTotal"
                        }
                    ],
                    "KNXReadRequests": [
                        "7/0/14"
                    ],
                    "LocalConstants": {
                        "Reverse": false
                    }
                }
            ],
            "HistoryType": "door"
        },
```



## Outlet (power history)

This is just sample config to capture power consumption with an switch/outlet. This has not fully tested, but if you send the values for the below characteristics onto the KNX-bus you can see how Eve is updating the values. Depending on what values you have available for your outlets, a custom handler might be a good idea to take care of the various caluclations and settings.

```
        {
            "DeviceName": "EVE.Outlet Q No5",
            "Services": [
                {
                    "ServiceType": "Outlet",
                    "Handler": "DummyHandler",
                    "ServiceName": "EVE.Outlet Q No5",
                    "Characteristics": [
                        {
                            "Type": "On",
                            "Set": [
                                "4/1/51"
                            ],
                            "Listen": [
                                "4/1/51"
                            ]
                        },
                        {
                            "Type": "InUse"
                        },
                        {
                            "Type": "eveVoltage",
                            "Listen": [
                                "4/7/222"
                            ]
                        },
                        {
                            "Type": "eveCurrentConsumption",
                            "Listen": [
                                "4/7/223"
                            ],
                            "DPT": "DPT13"
                        },
                        {
                            "Type": "eveTotalConsumption",
                            "Listen": [
                                "4/7/224"
                            ],
                            "DPT": "DPT14"
                        },
                        {
                            "Type": "eveElectricCurrent",
                            "Set": [
                                "4/7/225"
                            ],
                            "Listen": [
                                "4/7/225"
                            ]
                        },
                        {
                            "Type": "eveResetTotal"
                        }
                    ]
                }
            ],
            "HistoryType": "energy",
        },

```



