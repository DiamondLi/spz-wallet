/**
*  @version: v1.0.0
*  @author : yang.deng
*/

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

	toWei(original) {
		return this.web3.utils.toWei(original+'');
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