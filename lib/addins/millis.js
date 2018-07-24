'use strict';
/** * @type {HandlerPattern}
 * Source for brightness fix: https://knx-user-forum.de/forum/öffentlicher-bereich/knx-eib-forum/diy-do-it-yourself/998030-homebridge-knx-0-3-0-alpha-apple-homekit-interface?p=1182183#post1182183
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('dltDIM');


/**
 * @class A custom handler to fix brightness/on messages and to make 1% eq 1/255 brightness
 * @extends HandlerPattern
 */
class dltDIM extends HandlerPattern {

    constructor(knxAPI) {
        super(knxAPI); // call the super constructor first. Always.
    }


    /****
     * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
     *
     */
    onKNXValueChange(field, oldValue, knxValue) {
        console.log('INFO: on KNX Value Change(' + field + ", old="+ oldValue + ", new="+ knxValue+ ")");

        switch (field)
        {
            case "Brightness":
                this.myAPI.setValue("Brightness", parseInt((knxValue)/255*100)+1);
                break;
            case "On":
                this.myAPI.setValue("On", knxValue);
                break;
        }
        return true;
    } // onBusValueChange

    /****
     * onHKValueChange is invoked if HomeKit is changing characteristic values
     *
     */
    onHKValueChange(field, oldValue, newValue) {
        console.log('INFO: on HK Value Change (' + field + ", old="+ oldValue + ", new="+ newValue + ")");

        switch (field)
        {
            case "Brightness":

                // to make 1% -> 1/255 (more precise dimming)
                this.myAPI.knxWrite(field, parseInt(newValue/100*255-1), "DPT5");

                // set "brightness has just been set" flag to true for next 0.2s
                this.brightnessSet=true;
                var that = this;
                if (this.timer) clearTimeout(this.timer);
                this.timer = setTimeout(function () {
                    that.brightnessSet=false;
                },200);
                return true;
                break;
            case "On":
                //skip "turn on" knx message if brightness has just been set
                if (newValue == 1 && this.brightnessSet)
                {
                    return true;
                }
                this.myAPI.knxWrite(field, newValue, "DPT1");
                break;
        }

        return true;


    } // onHKValueChange
} // class
module.exports=    dltDIM;
