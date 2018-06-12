/**
*  @version: v1.0.0
*  @author : yang.deng
*/

'use strict'

const Web3 = require('web3');
const fs = require('fs');

class Utils {

	constructor() {}

	/** 解密keystore文件 */
	importKeyStore(keystore,password) {
		let web3 = new Web3();
		let data = fs.readFileSync(keystore,'utf-8');
		let keystoreData = JSON.parse(data);
		return web3.eth.accounts.decrypt(keystoreData,password);
	}

	toWei(original) {
		let web3 = new Web3();
		return web3.utils.toWei(original+'');
	}

	fromWei(original) {
		let web3 = new Web3();
		return web3.utils.fromWei(original+'');
	}

}

module.exports = Utils;