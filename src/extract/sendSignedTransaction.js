/**
* @author : yang.deng
*/
'use strict'
const request = require('request');
const url = 'http://192.168.0.192:8081';

class Transaction {

	constructor(cookie,packet) {
		this.cookie = cookie;
		this.packet = packet;
	}

	postTransaction() {
		let j = request.jar();
		let cookie_ = request.cookie(this.cookie);
		j.setCookie(cookie_, url);
		return new Promise({url:url,formData:this.packet,jar:j},(error,response,body) => {
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
}