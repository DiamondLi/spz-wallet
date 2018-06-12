/**
* @author : yang.deng
*/
'use strict'
const log4js=require('log4js');	
const path = require('path');
const filename = path.normalize(`${__dirname}/../../resource/log/log.txt`);
log4js.configure({
  appenders: {
    out: { type: 'stdout' },//设置是否在控制台打印日志
    info: { type: 'file', filename: filename },
  },
  categories: {
    default: { appenders: [ 'out', 'info' ], level: 'info' }//去掉'out'。控制台不打印日志
  }
});

exports.getLogger = function () {//name取categories项
    return log4js.getLogger('info'); 
}
