/**
*  @version: v1.0.0
*  @author : yang.deng
*/
'use strict'

const Excel = require('../src/excel/excel.js');
const log4js = require('../src/common/log.js');
const logger = log4js.getLogger();
try {
	const excel = new Excel("111.xlsx");
	logger.info(excel.read());
} catch (err) {
	logger.error(err);
}


