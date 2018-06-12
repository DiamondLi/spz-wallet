/**
*  @version: v1.0.0
*  @author : yang.deng
*/

'use strict'

const Web3 = require('web3');

class Etherumn {

	constructor(provider) {
		this.provider = provider;
		this.web3 = new Web3(new HttpProvider(this.provider));
	}

	/* Promise Object */
	getBalance(address) {
		return this.web3.eth.getBalance(address);
	}

	/* Promise Object */
	signTransaction(fromAccount,toAddress,amount) {

	}

	/* Promise Object */
	estimateGas(fromAddress,toAddress) {

	} 

	/** number */
	async getNonce(address) {
		/** 如果txpool中没有pending状态的transaction，则pending和latest的效果一致*/
		let pending = await this.web3.eth.getTransactionCount(address,"pending");
		let latest = await this.web3.eth.getTransactionCount(address,"latest");
		if(pending === latest) {
			return pending;
		} else if(pending > latest){
			return pending + 1;
		}
	}

	/** */
	getPrice() {
		
	}


}

module.exports = Etherumn;