/**
 * @version : v1.0.0
 * @date    : 2018.06.21
 **/
'use strict'
const ipcRenderer = require('electron').ipcRenderer;
const User = require('../../../user/user.js');
const log4js = require('../../../common/log.js');
const $ = require('jquery');
const logger = log4js.getLogger();

async function login() {
	try {
		let username = $('#username').val();
		let password = $('#password').val();
		console.log(username + " : " + password);
		let user = new User();
		let obj = await user.login("admin",111111);
		let body = JSON.parse(obj.body);
		if(body.code !== 0) {
			alert(body.msg);
			return;
		}
		ipcRenderer.send('login',user.getCookie());
	} catch (err) {
		alert("操作失败");
		logger.error(err);
	}
}

