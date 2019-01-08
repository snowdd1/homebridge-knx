/* RGB WW CW light from HSB (Homekit)
 * 
 * Source for formulas: http://www.rapidtables.com/convert/color/rgb-to-hsv.htm
 * 
 * EXPERIMENTAL maturity state!
 */
/* jshint esversion: 6, strict: true, node: true */
'use strict';
/**
 * @type {./handlerpattern.js~HandlerPattern}
 */
var HandlerPattern = require('./handlerpattern.js');
var log = require('debug')('RGBWWCWLight');

/**
 * @classdesc A custom handler for a RGB Light with 4 group addresses: "On" DPT1 (0,1), "Red", "Green" and "Blue" DPT5 (0..255)    
 * @extends HandlerPattern
 */
class RGBWWCWLight extends HandlerPattern {

	/****
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 * 
	 */
	onKNXValueChange(field, oldValue, knxValue) {
		// value for HomeKit
		var newValue;
		console.log('INFO: onKNXValueChange(' + field + ", "+ oldValue + ", "+ knxValue+ ")");
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
		}else{
			if (field==='Red') {
				this.red = knxValue;
			} else if (field==='Green') {
				this.green = knxValue;
			} else if (field==='Blue')	{
				this.blue = knxValue;
			} else if (field==='WarmWhite')      {
                                this.coldWhite = knxValue;
                        } else if (field==='ColdWhite')      {
                                this.warmWhite = knxValue;
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
		 // color temperature
			var ct;
			ct = Math.round(360/255*this.warmWhite)+140;
			//brightness
			var brightness = cmax;
			
			log('INFO calculated values of H,S,B ' + hue + ', ' + saturation + ', ' + brightness);

			
			//send to homekit if changed
/*			if (this.myAPI.getValue('Brightness')!== brightness) {
				this.myAPI.setValue('Brightness', brightness);
				log('INFO Writing Brightness value of ' + brightness + ' to HomeKit ');
				
			}
*/
			if (this.myAPI.getValue('Saturation')!== saturation) {
				//this.myAPI.setValue('Saturation', saturation);
				log('INFO Writing Saturation value of ' + saturation + ' to HomeKit ');
			}			
			if (this.myAPI.getValue('Hue')!== hue) {
				//this.myAPI.setValue('Hue', hue);
				log('INFO Writing Hue value of ' + hue + ' to HomeKit ');
			}
/*if (this.myAPI.getValue('ColorTemperature')!== ct && (this.warmWhite !== 0 || this.coldWhite !== 0)) {
				console.log(this.warmWhite + "    " + this.coldWhite);
                                this.myAPI.setValue('ColorTemperature', ct);
                                log('INFO Writing ColorTemperature value of ' + ct + ' to HomeKit ');
                        }
*/			
		}
		
		
		
	} // onBusValueChange
	
	/****
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 * 
	 */
	onHKValueChange(field, oldValue, newValue) {
		// homekit will only send a TargetPosition value, so we do not care about (non-) potential others
		console.log('INFO: onHKValueChange(' + field + ", "+ oldValue + ", "+ newValue + ")");
//		log('INFO: this.myAPI.getProperty(field, "minValue") returns ' + this.myAPI.getProperty(field, "minValue"));
//		log('INFO: this.myAPI.getProperty(field, "maxValue") returns ' + this.myAPI.getProperty(field, "maxValue"));
//		log('INFO: this.myAPI.getProperty(field, "perms") returns ' + this.myAPI.getProperty(field, "perms"));
		
		
		if (field==='On') {
			// On/Off has been changed
			if ((newValue? 1:0) !== (oldValue? 1:0)) {
				//really a change!
				log('INFO Writing ON value of ' + newValue? 1:0 + ' to KNX bus ');
				this.myAPI.knxWrite("On", newValue? 1:0,"DPT1");
			}
			log('INFO No change in ON value of ' + newValue? 1:0 + ' to KNX bus ');
		}else if (field ==='ColorTemperature') {
			var val = this.myAPI.getValue("Brightness")/100;
			var hue = this.myAPI.getValue("Hue");
                        var sat = this.myAPI.getValue("Saturation")/100;
			var ct  = this.myAPI.getValue("ColorTemperature");

			var max = 500;
			var min = 140;
			var ctNorm = ct-140; //0 = kallvit 360 = varmvit
			
			var ww = Math.round(255/360*ctNorm*val);
			var cw = Math.round(255/360*(360-ctNorm)*val);


			this.myAPI.knxWrite("WarmWhite",ww,"DPT5");
			this.myAPI.knxWrite("ColdWhite",cw,"DPT5");
			this.myAPI.knxWrite("Red", 0, "DPT5");
                        this.myAPI.knxWrite("Green", 0, "DPT5");
                        this.myAPI.knxWrite("Blue", 0, "DPT5");

                 // persist in the object for later use
                        this.red = 0;
                        this.green = 0;
                        this.blue = 0;
			this.warmWhite = ww;
			this.coldWhite = cw;

			//console.log("Brightness: " + val + " | Hue: " + hue + " | sat: "+ sat + " | CT: " + ct);
                }
		else {
			// Color/Brightness has been changed
			// calculate RGB values
			
			var hue = this.myAPI.getValue("Hue");
			var sat = this.myAPI.getValue("Saturation")/100;
			var val = this.myAPI.getValue("Brightness")/100;
			var ct  = this.myAPI.getValue("ColorTemperature");
			//console.log("Brightness: " + val + " | Hue: " + hue + " | sat: "+ sat + " | CT: " + ct);
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
			var r = Math.round((r2 + m)*255);
			var g = Math.round((g2 + m)*255);
			var b = Math.round((b2 + m)*255);
			
			log('INFO Writing Red value of ' + r + ' to KNX bus ');
			log('INFO Writing Green value of ' + g + ' to KNX bus ');
			log('INFO Writing Blue value of ' + b + ' to KNX bus ');
			
			this.myAPI.knxWrite("Red", r, "DPT5");
			this.myAPI.knxWrite("Green", g, "DPT5");
			this.myAPI.knxWrite("Blue", b, "DPT5");
			if(this.warmWhite !== 0){
				this.myAPI.knxWrite("WarmWhite", 0, "DPT5");
			}
			if(this.coldWhite !== 0){
                                this.myAPI.knxWrite("ColdWhite", 0, "DPT5");
                        }
			// persist in the object for later use
			this.red = r;
			this.green = g;
			this.blue = b;
			this.warmWhite = 0;
			this.coldWhite = 0;
		}
	} // onHKValueChange
} // class	
module.exports=	RGBWWCWLight;


/* **********************************************************************************************************************
 * The config for that should look like this 
 * Reverse keyword is not allowed for custom handlers
 * 
 * 
"Services": [{
	"ServiceType": "Lightbulb",
	"Handler": "RGBWWCWLight",
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
	},
        {
            "Type": "ColorTemperature"
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
		},
		{
			"Type": "WarmWhite",
			"Set": "1/2/5",
			"DPT": "DPT5"
		},
		{
			"Type": "ColdWhite",
			"Set": "1/2/6",
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
	
