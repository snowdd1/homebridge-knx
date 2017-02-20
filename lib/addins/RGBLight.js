/* Sample module - RGB light from HSB (Homekit)
 * 
 * Source for formulas: http://www.rapidtables.com/convert/color/rgb-to-hsv.htm
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
 * @classdesc A custom handler for a RGB Light with 4 group addresses: "On" DPT1 (0,1), "Red", "Green" and "Blue" DPT5 (0..255)    
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
		
		if (field==='On'){
			// On/Off has been changed
			if ((newValue? 1:0) !== (oldValue? 1:0)) {
				// inform homekit
				log('INFO Writing ON value of ' + newValue? 1:0 + ' to HomeKit ');

				this.myAPI.setValue('On', newValue? 1:0 );
			}
		} else {
			if (field==='Red') {
				this.red = knxValue;
			} else if (field==='Green') {
				this.green = knxValue;
			} else if (field==='Blue')	{
				this.blue = knxValue;
			}
			var r2 = this.red/255;
			var g2 = this.green/255;
			var b2 = this.blue/255;
			var cmax = Math.max(r2,g2,b2);
			var cmin = Math.max(r2,g2,b2);
			var delta = cmax-cmin;
			//hue
			var hue;
			if (delta===0) {
				hue=0;
			} else if (cmax===r2) {
				hue = 60 * (((g2-b2)/delta) % 6);
			} else if (cmax===g2) {
				hue = 60 * ((b2-r2)/delta + 2);
			} else if (cmax===b2) {
				hue = 60 * ((r2-g2)/delta + 4);
			}
			// saturation
			var saturation;
			if (cmax===0) {
				saturation = 0;
			} else {
				saturation = delta/cmax;
			}
			//brightness
			var brightness = cmax;
			
			log('INFO calculated values of H,S,B ' + hue + ', ' + saturation + ', ' + brightness);

			
			//send to homekit if changed
			if (this.myAPI.getValue('Brightness')!== brightness) {
				this.myAPI.setValue('Brightness', brightness);
				log('INFO Writing Brightness value of ' + brightness + ' to HomeKit ');
				
			}
			if (this.myAPI.getValue('Saturation')!== saturation) {
				this.myAPI.setValue('Saturation', saturation);
				log('INFO Writing Saturation value of ' + saturation + ' to HomeKit ');
			}			
			if (this.myAPI.getValue('Hue')!== hue) {
				this.myAPI.setValue('Hue', hue);
				log('INFO Writing Hue value of ' + hue + ' to HomeKit ');
			}
			
		}
		
		
		
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
		
		
		if (field==='On') {
			// On/Off has been changed
			if ((newValue? 1:0) !== (oldValue? 1:0)) {
				//really a change!
				log('INFO Writing ON value of ' + newValue? 1:0 + ' to KNX bus ');
				this.myAPI.knxWrite("On", newValue? 1:0);
			}
			log('INFO No change in ON value of ' + newValue? 1:0 + ' to KNX bus ');
		}
		else {
			// Color/Brightness has been changed
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
			this.myAPI.knxWrite("Green", g, "DPT5");
			this.myAPI.knxWrite("Blue", b, "DPT5");
			
			// persist in the object for later use
			this.red = r;
			this.green = g;
			this.blue = b;
			
		}
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
		"Type": "Hue"
	},
	{
		"Type": "Saturation"
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
	
