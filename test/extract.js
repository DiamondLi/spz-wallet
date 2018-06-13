'use strict'
const log4js = require('../src/common/log.js');
const logger = log4js.getLogger();
const Extract = require('../src/extract/extract.js');

async function test() {
	try {
		let extract = new Extract();
		let obj = await extract.getExtractListByStatus(1);
		console.log(obj.body);
	} catch (err) {
		logger.error(err);
	}
}

test();