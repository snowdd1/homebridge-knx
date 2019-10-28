// My own collection of custom HomeKit Services and Characteristics.

const CustomHomeKitTypes = require('homebridge-lib/lib/CustomHomeKitTypes')

let hap;
let eve;
const myKNX = {
	Service: {},
	Characteristic: {},
	uuid: (id) => {
		if (typeof id !== 'string' || id.length !== 4) {
			throw new TypeError(`${id}: illegal id`)
		}
		return `0000${id}-0000-1000-8000-0026BB765292`
	}
}



module.exports = class CustomKNXHomeKitTypes extends CustomHomeKitTypes {

	constructor (homebridge) {
		super(homebridge, myKNX)
		hap = homebridge.hap


	// ===== Characteristics ===================================================

	this.createCharacteristic('AtHome', myKNX.uuid('1025'), {
		format: this.formats.BOOL,
		perms: [this.perms.READ, this.perms.WRITE, this.perms.NOTIFY]
	}, 'At Home');




	// ===== Services ==========================================================

	// Create a PowerMeter similar to Outlet but without a switch
	this.createService('PowerMeter', myKNX.uuid('0011'), [
		hap.Characteristic.eveCurrentConsumption,
		hap.Characteristic.eveTotalConsumption
	], [
		hap.Characteristic.eveVoltage,
		hap.Characteristic.eveElectricCurrent
	]);


  }
}

