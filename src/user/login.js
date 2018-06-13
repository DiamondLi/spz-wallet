/**
* @author  : yang.deng
* @version : v1.0.0
* @date    : 2018.06.12
*/

'use strict'

const request = require('request');
const url = 'http://192.168.0.192:8081/login';

class User {

	constructor() {}

	/** 登录 */
	login(username,password) {
		let formData = {
			username : username,
			password : password,
		};
		return new Promise((resolve,reject)=>{
			request.post({url:url, formData: formData}, (error, response, body) => {  
			    if(error) {
			    	reject(new Error(error));
			    } else {
			    	let obj = {
			    		response : response,
			    		body : body
			    	};
			    	resolve(obj);
			    }
			});
		});
	}

	/** */

	logout() {
		// do nothing now 
	}
}

module.exports = User;