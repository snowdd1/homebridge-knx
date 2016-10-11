'use strict';
/**
 * iterate - spits out an object to the console, iteratively
 * @param {Object}
 */
//inspects an object and prints its properties (also inherited properties) 
var iterate = function nextIteration(myObject, path){
	// this function iterates over all properties of an object and print them to the console
	// when finding objects it goes one level  deeper
	var name;
	if (!path){ 
		console.log("---iterating--------------------");
		path="";
	}
	for (name in myObject) {
		if (typeof myObject[name] !== 'function') {
			if (typeof myObject[name] !== 'object' ) {
				console.log((path  || "") + name + ': ' + myObject[name]);
			} else {
				if (path.length<=50) {
					nextIteration(myObject[name], path ? path + name + "." : name + ".");
				}
			}
		} else {
			console.log((path  || "") + name + ': (function)' );
		}
	}
	if (!path) {
		console.log("================================");
	}
};
module.exports = iterate;