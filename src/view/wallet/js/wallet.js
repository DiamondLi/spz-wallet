/**
* @author : yang.deng
*/
'use strict'

const $ = require('jquery');
const fs = require('fs');
const path = require('path');
const ipcRenderer = require('electron').ipcRenderer;
const dialog = require('electron').remote.dialog;
const Utils = require('../../../blockchain/web3/utils.js');
const log4js = require('../../../common/log.js');
const logger = log4js.getLogger();
const keystoreFile = path.normalize(`${__dirname}/../../../../resource/config/keystore.json`);

window.onload = ()=> {
	// 判断是否存在已有keystroe文件地址
	try {
		logger.info("aaaaa");
		if(fs.existsSync(keystoreFile)) {
			let data = fs.readFileSync(keystoreFile,'utf-8');
			logger.info(data);
			let keystore = JSON.parse(data).lastKeystore;
			$('#keystore').val(keystore);
		}
	} catch (err) {
		logger.error(err);
	}
}

function importKeystore() {
	let filenames = dialog.showOpenDialog({
		filters: [ {name: 'keystore', extensions: ['*','json']},]
	});
	if(filenames === null || filenames === '' || filenames === []) {
		return;
	}
	let filename = filenames[0];
	let data = { "lastKeystore" : filename };
	try {
		console.log(filename);
		$('#keystore').val(filename);
		fs.writeFileSync(keystoreFile,JSON.stringify(data));
	} catch (err) {
		logger.error("写入keystore文件失败");
	}
}

function submit() {
	let keystore = $('#keystore').val();
	let password = $('#password').val();
	try {
		let utils = new Utils();
		let account = utils.importKeyStore(keystore,password);
		// 将account发送给主进程
		ipcRenderer.send('keystore',account);
	} catch (err) {
		alert("导入文件或者密码错误");
		logger.error(err);
	}
}