/**
*  @version: v1.0.0
*  @author : yang.deng
*/

'use strict'

const fs = require('fs');
const path = require('path');
const filename = path.normalize(`${__dirname}/../../resource/config/providers.json`);

class Provider {

	constructor() {
		try {
			let data = fs.readFileSync(filename,'utf-8');
			this.object = JSON.parse(data);
		} catch (err) {
			throw err;
		}
	}

	getMasterProvider(network) {
		if(network == "testnet") {
			return this.object.master.testnet.provider;
		} else {
			return this.object.master.mainnet.provider;
		}
	}

	getWorkerProviders(network) {
		if(network == "testnet") {
			return this.object.workers.testnet.providers;
		} else {
			return this.object.workers.mainnet.providers;
		}
	}
}

module.exports = Provider;