/**
* @author : yang.deng
*/
'use strict'

const request = require('request');
const url = "http://192.168.0.192:8081/sys/coin/getList";

// 获取币种信息
class Coin {

	constructor() {}

	getCoinList() {
		return new Promise((resolve,reject)=>{
			request.post({url : url,formData : {}},(error,response,body)=>{
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