/**
* @author : yang.deng
*/
'use strict'
const request = require('request');
const url = 'http://192.168.0.192:8081/sys/extractCoin/listExtract';

class Extract {

	constructor() {}

	getExtractList(orderIds,fromAddress,toAddress,status) {
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
		let data = JSON.parse(JSON.stringify(formData));
		return new Promise((resolve,reject)=>{
			request.post({url:url, formData: data}, (error, response, body) => {  
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

	getExtractListByOrderIds(orderIds) {
		return this.getExtractList(orderIds,null,null,0);
	}

	getExtractListByFromAddress(fromAddress) {
		return this.getExtractList(null,fromAddress,null,null);
	}

	getExtractListByToAddress(toAddress) {
		return this.getExtractList(null,null,toAddress,null);
	}

	getExtractListByStatus(status) {
		return this.getExtractList(null,null,null,status);
	}

}

module.exports = Extract;