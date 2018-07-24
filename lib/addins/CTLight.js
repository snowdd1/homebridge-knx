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
 * @classdesc A custom handler for a color temperature Light with 3 group addresses: "On" DPT1 (0,1), "Brightness" and "ColorTemperature" DPT5.001 (0..100%)
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
                this.setColorTemperatureToHK(field, knxValue);
                break;
        }
    }

    setColorTemperatureToHK(field, knxValue) {
        var mired = Math.pow(10, knxValue / this.getFactor()) + this.getMinMired();
        mired = this.squeezeIntoMaxMinMiredRange(mired);
        log('INFO Writing ColorTemperature in mired value of ' + mired + ' to HomeKit ');
        this.myAPI.setValue(field, mired);
    }

    getFactor() {
        return 100 / Math.log10(this.getMaxMired() - this.getMinMired());
    }

    convertBetweenKelvinAndMired(value) {
        return Math.pow(10, 6) / value;
    }

    squeezeIntoMaxMinMiredRange(value) {
        var maxMired = this.getMaxMired();
        var minMired = this.getMinMired();
        return value < minMired ? minMired : value > maxMired ? maxMired : value;
    }

    getMinMired() {
        return Math.ceil(this.convertBetweenKelvinAndMired(this.myAPI.getLocalConstant("maxKelvin")));
    }

    getMaxMired() {
        return Math.floor(this.convertBetweenKelvinAndMired(this.myAPI.getLocalConstant("minKelvin")));
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
        var sqeezedNewValue = this.squeezeIntoMaxMinMiredRange(newValue);
        var clInPercantage = this.getColdLightPercentageFromMired(sqeezedNewValue);
        log('INFO Writing color temperature in cold light percentage value of ' + clInPercantage + ' to KNX bus');
        this.myAPI.knxWrite(field, clInPercantage, 'DPT5.001');
    }

    getColdLightPercentageFromMired(newValue) {
        return newValue === this.getMaxMired() ? 0 : Math.log10(this.getMaxMired() - newValue) * this.getFactor();
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
                    "0/0/18"
                ],
                "Listen": [
                    "0/0/15"
                ],
                "DPT": "DPT5.001"
            }
        ],
        "KNXReadRequests": [
            "0/0/14",
            "0/0/17",
            "0/0/15"
        ],
        "LocalConstants": {
            "maxKelvin": 6000,
            "minKelvin": 2200
        },
        "subtype": "SUB_d0dc9d33-5f71-4e67-a127-b7a3b7849d33"
    }
]
 *
 *
 *
 */
