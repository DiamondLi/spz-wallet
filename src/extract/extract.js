/**
* @author : 
*/
'use strict'
const request = require('request');
const url = 'http://192.168.0.192:8081/sys/extractCoin/listExtract';

class Extract {

	constructor(cookie) {
		this.cookie = cookie;
	}

	getExtractList(orderIds,fromAddress,toAddress,status,pageSize,pageNo,coinName) {
		let j = request.jar();
		let cookie_ = request.cookie(this.cookie);
		j.setCookie(cookie_, url);
		let formData = Object.create(null);
		if(orderIds !== null && orderIds.length > 0 ) {
			formData["orderIds"] = orderIds;
		}
		if(typeof fromAddress !== 'undefined' && fromAddress !== null && fromAddress !== '') {
			formData["fromAddress"] = fromAddress;
		}
		if(typeof toAddress !== 'undefined' && toAddress !== null && toAddress !== '') {
			formData['toAddress'] = toAddress;
		}
		if(typeof status !== 'undefined' && status !== null) {
			formData['status'] = status;
		}
		if(typeof pageNo !== 'undefined' && pageNo !== null) {
			formData['pageNo'] = pageNo;
		}
		if(typeof pageSize !== 'undefined' && pageSize !== null) {
			formData['pageSize'] = pageSize;
		}
		if(typeof coinName !== 'undefined' && coinName !== null && coinName !== '') {
			formData['coinName'] = coinName;
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
		return this.getExtractList(orderIds,null,null,1,null,null,null);
	}

	// 以下全为视图

	getExtractListByFromAddress(fromAddress,pageSize,pageIndex) {
		return this.getExtractList(null,fromAddress,null,null,pageSize,pageIndex,null);
	}

	getExtractListByToAddress(toAddress,pageSize,pageIndex) {
		return this.getExtractList(null,null,toAddress,null,pageSize,pageIndex,null);
	}

	getExtractListByStatus(status,pageSize,pageIndex) {
		return this.getExtractList(null,null,null,status,pageSize,pageIndex,null);
	}

	getExtractListAll(pageSize,pageIndex) {
		return this.getExtractList(null,null,null,null,pageSize,pageIndex,null);
	}

	setCookie(cookie) {
		this.cookie = cookie;
	}
}

module.exports = Extract;