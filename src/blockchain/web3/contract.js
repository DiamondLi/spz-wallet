/**
*  @version: v1.0.0
*  @author : yang.deng
*/

'use strict'

const Web3 = require('web3');

class Contract {

	constructor(provider) {
		this.provider = provider;
		this.web3 = new Web3(new HttpProvider(this.provider));
	}

	/** */
	getBalance(address,tokenAddress) {
		let data = this.encodeBalanceOfFunction(this.web3,address);
		let tx = {
			to : tokenAddress,
			data : data
		};
		return this.web3.eth.call(tx);
	}

	signTransaction(fromAccount,toAddress,amount,tokenAddress) {

	}

	estimateGas(fromAddress,toAddress,amount,tokenAddress) {
		let tx = {
			from : fromAddress,
			to : toAddress,
		}
	}

	encodeTransferFunction(web3,amount,toAddress) {
		let object = {
			name : "transfer",
			type : "function",
			inputs : [ {
					type : 'address',
					name : '_to'
				},
				{
					type : 'uint256',
					name : '_value'
				}
			]
		};
		let array = [toAddress,amount];
		return web3.eth.abi.encodeFunctionCall(object,array);
	}

	encodeBalanceOfFunction(web3,toAddress) {
		let object = {
			name : "balanceOf",
			type : "function",
			inputs : [ {
					type : 'address',
					name : 'address'
				}
			]
		};
		let array = [toAddress];
		return web3.eth.abi.encodeFunctionCall(object,array);
	}

}

module.exports = Contract;