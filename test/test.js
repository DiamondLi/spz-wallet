'use strict'
const Provider = require('../src/common/provider.js');
const log4js = require('../src/common/log.js');
const logger = log4js.getLogger();
const MAINNET = "mainnet";
const TESTNET = "testnet";
let provider;
try {
	provider = new Provider();
	logger.info(provider.getWorkerProviders(TESTNET));
} catch (err) {
	logger.error(err);
}