/* jshint esversion: 6, strict: true, node: true */
'use strict';

const test = require('node:test');
const assert = require('node:assert');

const hap = require('@homebridge/hap-nodejs');
const hapConstants = require('../lib/hapConstants.js');

/*
 * lib/hapConstants.js hardcodes the HAP wire-format strings because Homebridge
 * 2.0 stopped exposing them on the Characteristic object. Hardcoding is only
 * safe as long as the values cannot silently drift away from hap-nodejs, so
 * pin them here.
 *
 * Only the values are contractual. The key names are ours: hap-nodejs calls its
 * read/write permissions PAIRED_READ / PAIRED_WRITE, we call them READ / WRITE.
 */
test('every hapConstants value exists in the corresponding hap-nodejs export', () => {
	for (const group of ['Formats', 'Perms', 'Units']) {
		const known = Object.values(hap[group]);
		for (const [name, value] of Object.entries(hapConstants[group])) {
			assert.ok(
				known.includes(value),
				`hapConstants.${group}.${name} = ${JSON.stringify(value)} is not a value of hap.${group}`
			);
		}
	}
});

// The constants the plugin actually branches on. If hap-nodejs ever renames one
// of these values, the plugin silently stops recognising the type, so assert the
// exact mapping rather than mere membership.
test('constants used by the plugin match hap-nodejs exactly', () => {
	assert.strictEqual(hapConstants.Formats.BOOL, hap.Formats.BOOL);
	assert.strictEqual(hapConstants.Formats.INT, hap.Formats.INT);
	assert.strictEqual(hapConstants.Formats.UINT8, hap.Formats.UINT8);
	assert.strictEqual(hapConstants.Formats.UINT16, hap.Formats.UINT16);
	assert.strictEqual(hapConstants.Formats.UINT32, hap.Formats.UINT32);
	assert.strictEqual(hapConstants.Formats.FLOAT, hap.Formats.FLOAT);

	assert.strictEqual(hapConstants.Perms.READ, hap.Perms.PAIRED_READ);
	assert.strictEqual(hapConstants.Perms.WRITE, hap.Perms.PAIRED_WRITE);
	assert.strictEqual(hapConstants.Perms.NOTIFY, hap.Perms.NOTIFY);

	assert.strictEqual(hapConstants.Units.PERCENTAGE, hap.Units.PERCENTAGE);
});

// Guards the reason this module exists: reading the constants off Characteristic
// yields undefined on Homebridge 2.x. If a future hap-nodejs restores them, we
// can drop hapConstants -- this test tells us when that happens.
test('Characteristic no longer exposes Formats/Perms/Units', () => {
	assert.strictEqual(hap.Characteristic.Formats, undefined);
	assert.strictEqual(hap.Characteristic.Perms, undefined);
	assert.strictEqual(hap.Characteristic.Units, undefined);
});
