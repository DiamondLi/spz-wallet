/**
*  @version: v1.0.0
*  @author : 
*/

'use strict'

const Web3 = require('web3');

class Etherumn {

	constructor(provider) {
		this.provider = provider;
		this.web3 = new Web3(new Web3.providers.HttpProvider(this.provider));
	}

	/* Promise Object */
	getBalance(address) {
		return this.web3.eth.getBalance(address);
	}

	/* Promise Object */
	signTransaction(fromAccount,toAddress,amount,gasUsed,nonce,gasPrice_) {
		let privateKey = fromAccount.privateKey;
		// 判断前两位
		let fromAddress = fromAccount.address;
		let tx = {
			nonce : nonce,
			from : fromAddress,
			to : toAddress,
			value : amount,
			gas : gasUsed
		};
		return this.web3.eth.accounts.signTransaction(tx,privateKey);
	}

	/* Promise Object */
	estimateGas(fromAddress,toAddress,amount) {
		let tx = {
			from : fromAddress,
			to : toAddress,
			value : amount
		}
		return this.web3.eth.estimateGas(tx);
	} 

	/** number */
	async getNonce(address) {
		/** 如果txpool中没有pending状态的transaction，则pending和latest的效果一致*/
		return await this.web3.eth.getTransactionCount(address,"pending");
	}

	/** */
	getPrice() {
		return this.web3.eth.getGasPrice();
	}

	getId() {
		return this.web3.eth.net.getId();
	}
}

module.exports = Etherumn;