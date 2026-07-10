/* jshint esversion: 6, strict: true, node: true */
'use strict';

/*
 * Deliberately narrow: this is an ES5-era codebase and a wholesale restyle would
 * bury real changes in noise. Lint for things that are actually broken --
 * undefined identifiers, unreachable code, duplicate keys -- not for var vs let.
 */
module.exports = [
	{
		ignores: ['node_modules/**']
	},
	{
		files: ['**/*.js'],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'commonjs',
			globals: {
				require: 'readonly',
				module: 'writable',
				exports: 'writable',
				process: 'readonly',
				console: 'readonly',
				__dirname: 'readonly',
				__filename: 'readonly',
				Buffer: 'readonly',
				global: 'readonly',
				setTimeout: 'readonly',
				clearTimeout: 'readonly',
				setInterval: 'readonly',
				clearInterval: 'readonly',
				// index.js installs this for the remote add-in loader
				knxRequire: 'readonly'
			}
		},
		linterOptions: {
			reportUnusedDisableDirectives: true
		},
		rules: {
			'no-undef': 'error',
			'no-dupe-keys': 'error',
			'no-dupe-args': 'error',
			'no-duplicate-case': 'error',
			'no-unreachable': 'error',
			'no-func-assign': 'error',
			'no-cond-assign': 'error',
			'no-const-assign': 'error',
			'no-fallthrough': 'off', // knxaccess.js relies on intentional fallthrough
			'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_' }],
			'no-empty': ['warn', { allowEmptyCatch: true }]
		}
	}
];
