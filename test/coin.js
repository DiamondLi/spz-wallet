'use strict'
const log4js = require('../src/common/log.js');
const logger = log4js.getLogger();
const Coin = require('../src/coin/coin.js');

async function test() {
	try {
		let coin = new Coin();
		let obj = await coin.getCoinList();
		console.log(obj.body);
	} catch (err) {
		logger.error(err);
	}
}

test();
