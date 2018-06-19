/**
* @author : yang.deng
*/
'use strict'
const request = require('request');
const url = 'http://192.168.0.192:8081/sys/extractCoin/listExtract';

class Extract {

	constructor(cookie) {
		this.cookie = cookie;
	}

	getExtractList(orderIds,fromAddress,toAddress,status,pageSize,pageIndex) {
		let j = request.jar();
		let cookie_ = request.cookie(this.cookie);
		j.setCookie(cookie_, url);
		let formData = Object.create(null);
		if(orderIds !== null && orderIds.length > 0 ) {
			formData["orderIds"] = orderIds;
		}
		if(fromAddress !== null && fromAddress !== '') {
			formData["fromAddress"] = fromAddress;
		}
		if(toAddress !== null && toAddress !== '') {
			formData['toAddress'] = toAddress;
		}
		if(status !== null) {
			formData['status'] = status;
		}
		if(pageIndex !== null) {
			formData['pageIndex'] = pageIndex;
		}
		if(pageSize !== null) {
			formData['pageSize'] = pageSize;
		}
		let data = JSON.parse(JSON.stringify(formData));
		return new Promise((resolve,reject)=>{
			request.post({url:url,formData:data,jar:j}, (error, response, body) => {  
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

	// 导入处理数据
	getExtractListByOrderIds(orderIds) {
		return this.getExtractList(orderIds,null,null,0,null,null);
	}

	// 以下全为视图

	getExtractListByFromAddress(fromAddress,pageSize,pageIndex) {
		return this.getExtractList(null,fromAddress,null,null,pageSize,pageIndex);
	}

	getExtractListByToAddress(toAddress,pageSize,pageIndex) {
		return this.getExtractList(null,null,toAddress,null,pageSize,pageIndex);
	}

	getExtractListByStatus(status,pageSize,pageIndex) {
		return this.getExtractList(null,null,null,status,,pageSize,pageIndex);
	}

	getExtractListAll(pageSize,pageIndex) {
		return this.getExtractList(null,null,null,null,pageSize,pageIndex);
	}

	setCookie(cookie) {
		this.cookie = cookie;
	}
}

module.exports = Extract;