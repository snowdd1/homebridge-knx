/* Sample module - colour temperature light (Homekit)
 *
 * Source for brightness fix: https://knx-user-forum.de/forum/öffentlicher-bereich/knx-eib-forum/diy-do-it-yourself/998030-homebridge-knx-0-3-0-alpha-apple-homekit-interface?p=1182183#post1182183
 *
 * EXPERIMENTAL maturity state!
 */
/* jshint esversion: 6, strict: true, node: true */
'use strict';
/**
 * @type {./handlerpattern.js~HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('CTLight');

/**
 * @classdesc A custom handler for a color temperature Light with 3 group addresses: "On" DPT1 (0,1), "Brightness" and "ColorTemperature" DPT7.600 (0..65535)
 * @extends HandlerPattern
 */
class CTLight extends HandlerPattern {

    /****
     * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
     *
     */
    onKNXValueChange(field, oldValue, knxValue) {
        log('INFO: onKNXValueChange(' + field + ", "+ oldValue + ", "+ knxValue+ ")");
        switch (field) {
            case "Brightness":
                this.myAPI.setValue(field, parseInt((knxValue) / 255 * 100) + 1);
                break;
            case "On":
                this.myAPI.setValue(field, knxValue);
                break;
            case "ColorTemperature":
                this.myAPI.setValue(field, this.convertBetweenKelvinAndMired(knxValue));
                break;
        }
    }

    convertBetweenKelvinAndMired(value) {
        return Math.pow(10, 6) / value;
    }

// onBusValueChange

    /****
     * onHKValueChange is invoked if HomeKit is changing characteristic values
     *
     */
    onHKValueChange(field, oldValue, newValue) {
        log('INFO: onHKValueChange(' + field + ", "+ oldValue + ", "+ newValue + ")");
        switch (field) {
            case "Brightness":
                this.setBrightnessToKNX(field, newValue)
                break;
            case "On":
                this.setSwitchToKNX(field, newValue)
                break;
            case "ColorTemperature":
                this.setColorTemperatureToKNX(field, newValue);
                break;
        }
    }

    setBrightnessToKNX(field, newValue) {
        // to make 1% -> 1/255 (more precise dimming)
        this.myAPI.knxWrite(field, parseInt(newValue / 100 * 255 - 1), "DPT5");

        // set "brightness has just been set" flag to true for next 0.2s
        this.brightnessSet = true;
        var that = this;
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(function () {
            that.brightnessSet = false;
        }, 200);
    }


    setSwitchToKNX(field, newValue) {
        //skip "turn on" knx message if brightness has just been set
        if (newValue !== 1 || !this.brightnessSet) {
            this.myAPI.knxWrite(field, newValue, "DPT1");
        }
    }

    setColorTemperatureToKNX(field, newValue) {
        let kelvin = this.convertBetweenKelvinAndMired(newValue);
        log('INFO Writing color temperature in kelvin value of ' + kelvin + ' to KNX bus');
        this.myAPI.knxWrite(field, kelvin, 'DPT7.600');
    }

// onHKValueChange
} // class
module.exports = CTLight;


/* **********************************************************************************************************************
 * The config for that should look like this
 * Reverse keyword is not allowed for custom handlers
 *
 *
"Services": [
    {
        "ServiceType": "Lightbulb",
        "Handler": "CTLight",
        "ServiceName": "ikea",
        "Characteristics": [
            {
                "Type": "On",
                "Set": [
                    "0/0/13"
                ],
                "Listen": [
                    "0/0/14"
                ],
                "DPT": "DPT1"
            },
            {
                "Type": "Brightness",
                "Set": [
                    "0/0/20"
                ],
                "Listen": [
                    "0/0/17"
                ],
                "DPT": "DPT5.001"
            },
            {
                "Type": "ColorTemperature",
                "Set": [
                    "0/0/19"
                ],
                "Listen": [
                    "0/0/16"
                ],
                "DPT": "DPT7.600"
            }
        ],
        "KNXReadRequests": [
            "0/0/14",
            "0/0/17",
            "0/0/16"
        ],
        "subtype": "SUB_d0dc9d33-5f71-4e67-a127-b7a3b7849d33"
    }
]
 *
 *
 *
 */
