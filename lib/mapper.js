/**
 * http://usejsdoc.org/
 * Characteristics can have
 * 
 * a type name, such as "On", or "Brightness"
 * 
 * something to write values to (if changed in Homekit)
 * 
 * something to react to if values change on the bus 
 * 
 * 
 */

/***********************************************************************************************************************
 * The Mapper Idea
 * 
 * Bisher registrieren die Characteristica die Adressen selbst beim Busmonitor. Mit dem Mapper dazwischen müsste der
 * Mapper über die Wertänderungen auf dem Bus informiert werden, dieser berechnet dann einen HomeKit-Wert und dieser
 * wird an das Characteristikum zurückgemeldet.
 * 
 * Jeder Mapper kann auf HK-Seite nur einen Wert ausspucken, der ersate Treffer erzeugt den Wert und gibt ihn zurück
 */

/**
 * @constructor
 * @param {string} name - The groupaddress obejct used in this mapper
 * @param {characteristic} characteristic - the HomeKit characteristic that is bound to the mapper 
 */
function MapperSingle(name, characteristic) {
	this.name = name;
	this.characteristic = characteristic;
}
/*
 * @param {function} callback:  function(val, src, dest, type)
 */
MapperSingle.prototype.toHomeKit(callback) {
	
}