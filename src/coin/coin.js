/**
* @author : 
*/
'use strict'

const request = require('request');
const url = "http://192.168.0.192:8081/sys/coin/getLists";
// 获取币种信息
class Coin {

	constructor(cookie) {
		this.cookie = cookie;
	}

	getCoinList() {
		let j = request.jar();
		let cookie_ = request.cookie(this.cookie);
		j.setCookie(cookie_, url);
		return new Promise((resolve,reject)=>{
			request({url:url,jar:j},(error,response,body)=>{
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

	setCookie(cookie) {
		this.cookie = cookie;
	}
}

module.exports = Coin;