/**
* @author  : yang.deng
* @version : v1.0.0
* @date    : 2018.06.12
*/

'use strict'

const request = require('request');

class User {

	constructor() {}

	/** 登录 */
	login(username,password) {
		let formData = {
			username : username,
			password : password
		};
		request.post({url:'http://192.168.0.133:8081/login', formData: formData}, function (error, response, body) {  
		    if (!error && response.statusCode == 200) {
		    	console.log(body);
		    }
		});
	}

	logout() {
		// do nothing now 
	}
}

module.exports = User;