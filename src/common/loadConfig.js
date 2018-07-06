'use strict'
const fs = require('fs');
const path = require('path');
const filename = path.normalize(`${__dirname}/../../resource/config/config.json`);

class BaseConfig {

	constructor() {
		try {
			let data = fs.readFileSync(filename,'utf-8');
			this.object = JSON.parse(data);
		} catch (err) {
			throw err;
		}
	}

	getAddressUrl() {
		return this.object.addressUrl;
	}

	getTxUrl() {
		return this.object.txUrl;
	}

	getEnv() {
		return this.object.env;
	}

	getSalt() {
		return this.object.salt;
	}

}

module.exports = BaseConfig;