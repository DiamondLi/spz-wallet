'use strict'
// const log4js = require('../src/common/log.js');
// const logger = log4js.getLogger();
// const User = require('../src/user/login.js');

async function test() {
	try {
		let user = new User();
		let obj = await user.login("admin","111111");
		console.log(obj.body);
	} catch (err) {
		logger.error(err);
	}
}

// test();

function test2() {
	let obj = {
		servName : "chart",
		from : "12121212",
		fromName : "yang.deng",
		to : "4336c5a0-e526-5be3-9809-446b386e76df-1",
		toName : "guo.mincai",
		message : "hello world"
	}
	console.log(JSON.stringify(obj));
}
test2();