/* Sample module - RGB light from HSB (Homekit)
 * Cannot convert back from RGB to HSB right now
 * 
 * So no update of homekit if KNX changes values
 * 
 * EXPERIMENTAL maturity state!
 */
'use strict';
/**
 * @type {./handlerpattern.js~HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('RGBLight');

/**
 * @class A custom handler for the GIRA 216100 "Jalousie Aktor" (rolling shutter/blinds actuator)   
 * @extends HandlerPattern
 */
class RGBLight extends HandlerPattern {

	/****
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 * 
	 */
	onKNXValueChange(field, oldValue, knxValue) {
		// value for HomeKit
		var newValue;
		log('INFO: onKNXValueChange(' + field + ", "+ oldValue + ", "+ knxValue+ ")");
		log('INFO: this.myAPI.getProperty(field, "minValue") returns ' + this.myAPI.getProperty(field, "minValue"));
		log('INFO: this.myAPI.getProperty(field, "maxValue") returns ' + this.myAPI.getProperty(field, "maxValue"));
		log('INFO: this.myAPI.getProperty(field, "perms") returns ' + this.myAPI.getProperty(field, "perms"));
	} // onBusValueChange
	
	/****
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 * 
	 */
	onHKValueChange(field, oldValue, newValue) {
		// homekit will only send a TargetPosition value, so we do not care about (non-) potential others
		log('INFO: onHKValueChange(' + field + ", "+ oldValue + ", "+ newValue + ")");
//		log('INFO: this.myAPI.getProperty(field, "minValue") returns ' + this.myAPI.getProperty(field, "minValue"));
//		log('INFO: this.myAPI.getProperty(field, "maxValue") returns ' + this.myAPI.getProperty(field, "maxValue"));
//		log('INFO: this.myAPI.getProperty(field, "perms") returns ' + this.myAPI.getProperty(field, "perms"));
		
		// calculate RGB values
		
		var hue = this.myAPI.getValue("Hue");
		var sat = this.myAPI.getValue("Saturation")/100;
		var val = this.myAPI.getValue("Brightness")/100;
		
		var c = val*sat;
		var x = c*(1-Math.abs((hue/60) % 2 - 1));
		var m = val - c;
		
		var r2,g2,b2;
		if (hue < 60) {
			r2 = c;
			g2 = x;
			b2 = 0;
		} else if (hue<120) {
			r2 = x;
			g2 = c;
			b2 = 0;
		} else if (hue<180) {
			r2 = 0;
			g2 = c;
			b2 = x;
		} else if (hue<240) {
			r2 = 0;
			g2 = x;
			b2 = c;
		} else if (hue<300) {
			r2 = x;
			g2 = 0;
			b2 = c;
		} else {
			r2 = c;
			g2 = 0;
			b2 = x;
		}
		var r = (r2 + m)*255;
		var g = (g2 + m)*255;
		var b = (b2 + m)*255;
		
		log('INFO Writing Red value of ' + r + ' to KNX bus ');
		log('INFO Writing Green value of ' + g + ' to KNX bus ');
		log('INFO Writing Blue value of ' + b + ' to KNX bus ');
		
		this.myAPI.knxWrite("Red", r, "DPT5");
		this.myAPI.knxWrite("Green", g, "DTP5");
		this.myAPI.knxWrite("Blue", b, "DTP5");
		
	} // onHKValueChange
} // class	
module.exports=	RGBLight;


/* **********************************************************************************************************************
 * The config for that should look like this 
 * Reverse keyword is not allowed for custom handlers
 * 
 * 
"Services": [{
	"ServiceType": "Lightbulb",
	"Handler": "RGBLight",
	"ServiceName": "Color Light",
	"Characteristics": [{
		"Type": "On",
		"Set": "1/2/1",
		"Listen": "1/2/1"
	},
	{
		"Type": "Hue",
	},
	{
		"Type": "Saturation",
	},
	{
		"Type": "Brightness"
	}],
	"KNXObjects": [
		{
			"Type": "Red",
			"Set": "1/2/2",
			"DPT": "DPT5"
		},
		{
			"Type": "Green",
			"Set": "1/2/3",
			"DPT": "DPT5"
		},
		{
			"Type": "Blue",
			"Set": "1/2/4",
			"DPT": "DPT5"
		}
	],
	"KNX-ReadRequests": [
		"1/2/1"
	]
}]
 * 
 * 
 * 
 */
	
