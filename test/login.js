'use strict'
const log4js = require('../src/common/log.js');
const logger = log4js.getLogger();
const User = require('../src/user/login.js');

try {
	let user = new User();
	user.login("admin","111111");
} catch (err) {
	logger.err(err);
}
