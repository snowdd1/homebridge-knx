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

	this.createCharacteristicClass('AtHome', myKNX.uuid('1025'), {
		format: this.Formats.BOOL,
		perms: [this.Perms.READ, this.Perms.WRITE, this.Perms.NOTIFY]
	}, 'At Home');



	this.createCharacteristicClass('OnAutoManual', '000000A8-0000-1000-8000-0026BB765291', {
		format: this.Formats.UINT8,
		maxValue: 1,
		minValue: 0,
		validValues: [0,1],
		perms: [this.Perms.READ, this.Perms.NOTIFY, this.Perms.WRITE]
	}, 'On Auto Manual');
	this.Characteristics.OnAutoManual.MANUAL = 0;
	this.Characteristics.OnAutoManual.AUTO = 1;


	this.createCharacteristicClass('WindowStatus', myKNX.uuid('006A'), {
		format: this.Formats.UINT8,
		minValue: 0,
		maxValue: 2,
		validValues: [0, 1, 2],
		perms: [this.Perms.READ, this.Perms.NOTIFY, this.Perms.WRITE]
	}, 'Window Status');
	this.Characteristics.WindowStatus.CLOSED = 0;
	this.Characteristics.WindowStatus.OPEN   = 1;
	this.Characteristics.WindowStatus.TILT   = 2;


	this.createCharacteristicClass('BlindStatus', myKNX.uuid('1031'), {
		format: this.Formats.UINT8,
		minValue: 0,
		maxValue: 1,
		validValues: [0, 1],
		perms: [this.Perms.READ, this.Perms.NOTIFY, this.Perms.WRITE]
	}, 'Blind Status');
	this.Characteristics.WindowStatus.CLOSED = 0;
	this.Characteristics.WindowStatus.OPEN   = 1;



	this.createCharacteristicClass('CurrentDoorState','0000000E-0000-1000-8000-0026BB765291', {
		format: this.Formats.UINT8,
		minValue: 0,
		maxValue: 5,
		validValues: [0, 1, 2, 3, 4, 5],
		perms: [this.Perms.READ, this.Perms.NOTIFY]
	}, 'Current Door State');
	this.Characteristics.CurrentDoorState.OPEN = 0;
	this.Characteristics.CurrentDoorState.CLOSED = 1;
	this.Characteristics.CurrentDoorState.OPENING = 2;
	this.Characteristics.CurrentDoorState.CLOSING = 3;
	this.Characteristics.CurrentDoorState.STOPPED = 4;
	this.Characteristics.CurrentDoorState.TILT = 5;







	// Rain last hour and Rain all day - identified by Eve.app
	this.createCharacteristicClass('Rain1h', '10C88F40-7EC4-478C-8D5A-BD0C3CCE14B7', {
		format: this.Formats.UINT16,
		unit: "mm",
		maxValue: 50,
		minValue: 0,
		minStep: 1,
		perms: [this.Perms.READ, this.Perms.NOTIFY]
	}, 'Rain Last Hour');

	this.createCharacteristicClass('Rain24h', 'CCC04890-565B-4376-B39A-3113341D9E0F', {
		format: this.Formats.UINT16,
		unit: "mm",
		maxValue: 250,
		minValue: 0,
		minStep: 1,
		perms: [this.Perms.READ, this.Perms.NOTIFY]
	}, 'Rain All Day');


	// ===== Services ==========================================================

	// Create a PowerMeter similar to Outlet but without a switch
	this.createServiceClass('PowerMeter', myKNX.uuid('0011'), [
		hap.Characteristic.eveCurrentConsumption,
		hap.Characteristic.eveTotalConsumption
	], [
		hap.Characteristic.eveVoltage,
		hap.Characteristic.eveElectricCurrent
	]);


	// Create a PowerMeter similar to Outlet but without a switch
	this.createServiceClass('SwitchAutoManual', myKNX.uuid('0049'), [
		hap.Characteristic.Active
	]);


	// Create a PowerMeter similar to Outlet but without a switch
	this.createServiceClass('ContactSensorThreeState', myKNX.uuid('0080'), [
		myKNX.Characteristic.WindowStatus
	]);


  }
}

