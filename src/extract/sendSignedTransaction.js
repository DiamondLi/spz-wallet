/**
* @author : yang.deng
*/
'use strict'
const request = require('request');
const url = 'http://192.168.0.192:8081';

class Transaction {

	constructor(cookie) {
		this.cookie = cookie;
	}

	postTransaction(packet) {
		let j = request.jar();
		let cookie_ = request.cookie(this.cookie);
		j.setCookie(cookie_, url);
		return new Promise({url:url,formData:packet,jar:j},(error,response,body) => {
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
	}

	setCookie(cookie) {
		this.cookie = cookie;
	}
}

module.exports = Transaction;