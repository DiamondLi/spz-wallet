'use strict'
const Provider = require('../src/common/provider.js');
const logger = require('../src/common/log.js')
const MAINNET = "mainnet";
const TESTNET = "testnet";
let provider;
try {
	provider = new Provider();
	console.log(provider.getMasterProvider(MAINNET));
	console.log(provider.getWorkerProviders(TESTNET));
	logger.info()
} catch (err) {
	console.log(err);
}