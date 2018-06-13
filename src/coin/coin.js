/**
* @author : yang.deng
*/
'use strict'

const request = require('request');
const url = "http://192.168.0.192:8081/sys/coin/getList";

// 获取币种信息
class Coin {

	constructor() {}

	getCoinList(cookie) {
		let j = request.jar();
		let cookie_ = request.cookie(cookie);
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
}

module.exports = Coin;