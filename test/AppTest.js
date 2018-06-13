'use strict'

const App = require('../src/app/app.js');
const log4js = require('../src/common/log.js');
const logger = log4js.getLogger();
try {
	let app = new App();
	app.test();
} catch (err) {
	logger.error(err);
}