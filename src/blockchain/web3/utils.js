'use strict'

const Web3 = require('web3');
const fs = require('fs');

class Utils {

	constructor() {
		this.web3 = new Web3();
	}

	/** 解密keystore文件 */
	importKeyStore(keystore,password) {
		let data = fs.readFileSync(keystore,'utf-8');
		let keystoreData = JSON.parse(data);
		return this.web3.eth.accounts.decrypt(keystoreData,password);
	}

	toWei(original,unit) {
		if(typeof unit !== 'undefined' && unit !== null && unit !== '') {
			return this.web3.utils.toWei(original+'',unit);
		} else {
			return this.web3.utils.toWei(original+'');
		}
	}

	fromWei(original) {
		return this.web3.utils.fromWei(original+'');
	}

	privateKeyToAccount(privateKey) {
		return this.web3.eth.accounts.privateKeyToAccount(privateKey);
	}

	encodeFunctionSignature(functionName) {
		return this.web3.eth.abi.encodeFunctionSignature(functionName);
	}
	
	decodeParameters(typesArray, hexString) {
		return this.web3.eth.abi.decodeParameters(typesArray, hexString);
	}

	isAddress(address) {
		return this.web3.utils.isAddress(address);
	}

}

module.exports = Utils;