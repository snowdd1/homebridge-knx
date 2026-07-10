/* jshint esversion: 6, strict: true, node: true */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const hap = require('@homebridge/hap-nodejs');

/*
 * The plugin cannot run without Homebridge and a KNX daemon, but its entry point
 * -- registry(api) -- runs plain JavaScript against the HAP type library. That
 * is exactly where Homebridge 2.0 used to blow up (issue #218), so drive it here
 * against the real @homebridge/hap-nodejs that Homebridge 2.x bundles.
 *
 * No KNX connection is opened: registry() only registers types and the platform
 * constructor. The constructor itself, which talks to the bus, is never invoked.
 */
function makeApiMock() {
	const storagePath = fs.mkdtempSync(path.join(os.tmpdir(), 'homebridge-knx-test-'));
	const registered = [];
	return {
		registered,
		api: {
			version: 2.7,
			hap,
			user: { storagePath: () => storagePath },
			registerPlatform: (pluginName, platformName, constructor, dynamic) => {
				registered.push({ pluginName, platformName, constructor, dynamic });
			},
			on: () => {}
		}
	};
}

test('plugin entry point loads without throwing', () => {
	const registry = require('../index.js');
	assert.strictEqual(typeof registry, 'function');
});

test('registry() runs against Homebridge 2.x hap-nodejs and registers the platform', () => {
	const registry = require('../index.js');
	const { api, registered } = makeApiMock();

	registry(api);

	assert.strictEqual(registered.length, 1, 'expected exactly one registerPlatform call');
	assert.strictEqual(registered[0].pluginName, 'homebridge-knx');
	assert.strictEqual(registered[0].platformName, 'KNX');
	assert.strictEqual(registered[0].dynamic, true, 'platform must register as dynamic');
});

// Regression test for the ES5 Characteristic.call() + util.inherits() pattern,
// which throws "Class constructor cannot be invoked without 'new'" on HB 2.0.
test('custom KNXThermAtHome characteristic instantiates on Homebridge 2.x', () => {
	const registry = require('../index.js');
	const { api } = makeApiMock();
	registry(api);

	const KNXThermAtHome = hap.Characteristic.KNXThermAtHome;
	assert.ok(KNXThermAtHome, 'KNXThermAtHome was not registered on Characteristic');

	const chr = new KNXThermAtHome();
	assert.ok(chr instanceof hap.Characteristic, 'must be a real Characteristic');
	assert.strictEqual(chr.props.format, hap.Formats.BOOL);
	assert.deepStrictEqual(
		[...chr.props.perms].sort(),
		[hap.Perms.PAIRED_READ, hap.Perms.PAIRED_WRITE, hap.Perms.NOTIFY].sort()
	);
	assert.strictEqual(KNXThermAtHome.UUID, '00001025-0000-1000-8000-0026BB765292');
});

// Homebridge 2.0 renamed getServiceByUUIDAndSubType() to getServiceById().
// service-knx.js must prefer the new name but still work on Homebridge 1.x.
test('service lookup prefers getServiceById and falls back to the old name', () => {
	const source = fs.readFileSync(path.join(__dirname, '..', 'lib', 'service-knx.js'), 'utf8');
	assert.match(source, /platformAccessory\.getServiceById/, 'must call getServiceById');
	assert.match(source, /getServiceByUUIDAndSubType/, 'must keep the Homebridge 1.x fallback');
});
