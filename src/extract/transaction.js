/**
* @author : yang.deng
*/
'use strict'

const request = require('request');
const url = 'http://192.168.0.192:8087/extract/extract';

class Transaction {

	constructor() {}

	sendTransaction(packet) {
		let options = {
			url: url,
	    	method: "POST",
	    	headers: {
	       		"content-type": "application/json",
    		},
    		body: JSON.stringify(packet)
		};
		return new Promise((resolve,reject)=>{
			request(options, function(error, response, body) {
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

module.exports = Transaction;