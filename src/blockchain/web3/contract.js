/**
*  @version: v1.0.0
*  @author : yang.deng
*/

'use strict'

const Web3 = require('web3');

class Contract {

	constructor() {}

	/** */
	getBalance(provider,address,tokenAddress) {
		let web3 = new Web3(new HttpProvider(provider));
	}

	signTransaction(provider,fromAccount,toAddress,amount,tokenAddress) {
		let web3 = new Web3(new HttpProvider(provider));
	}

	estimateGas(provider,fromAddress,toAddress,amount,tokenAddress) {
		let web3 = new Web3(new HttpProvider(provider));
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

	

}

module.exports = Contract;