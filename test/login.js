'use strict'
const log4js = require('../src/common/log.js');
const logger = log4js.getLogger();
const User = require('../src/user/login.js');

async function test() {
	try {
		let user = new User();
		let obj = await user.login("admin","111111");
		console.log(obj.body);
	} catch (err) {
		logger.error(err);
	}
}

test();
