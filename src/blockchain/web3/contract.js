/**
*  @version: v1.0.0
*  @author : yang.deng
*/

'use strict'

const Web3 = require('web3');

class Contract {

	constructor(provider) {
		this.provider = provider;
		this.web3 = new Web3(new Web3.providers.HttpProvider(this.provider));
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

	getTotalSupply(tokenAddress) {
		let data = this.encodeTotalSupplyFunction(this.web3);
		let tx = {
			to : tokenAddress,
			data : data
		};
		return this.web3.eth.call(tx);
	}

	getName(tokenAddress) {
		let data = this.encodeNameFunction(this.web3);
		let tx = {
			to : tokenAddress,
			data : data
		};
		return this.web3.eth.call(tx);
	}

	getSymbol(tokenAddress) {
		let data = this.encodeSymbolFunction(this.web3);
		let tx = {
			to : tokenAddress,
			data : data
		};
		return this.web3.eth.call(tx);
	}

	signTransaction(fromAccount,toAddress,amount,tokenAddress,estimateGasUsed) {
		let privateKey = fromAccount.privateKey;
		let fromAddress = fromAccount.address;
		let data_ = this.encodeTransferFunction(this.web3,amount,toAddress);
		let tx = {
			from : fromAddress,
			to : tokenAddress,
			gas : estimateGasUsed,
			data : data_
		}
		return this.web3.eth.accounts.signTransaction(tx,privateKey);
	}

	sendSignedTransaction(signedTx) {
		return this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);
	} 

	estimateGas(fromAddress,toAddress,amount,tokenAddress) {
		let data = this.encodeTransferFunction(this.web3,amount,toAddress);
		let tx = {
			from : fromAddress,
			to : tokenAddress,
			data : data
		}
		return this.web3.eth.estimateGas(tx);
	}

	encodeTransferFunction(web3,amount,toAddress) {
		let object = {
			name : "transfer",
			type : "function",
			inputs: [
				{
					"name": "_to",
					"type": "address"
				},
				{
					"name": "_value",
					"type": "uint256"
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

	encodeTotalSupplyFunction(web3) {
		let object = {
			name : "totalSupply",
			type : "function",
			inputs : []
		};
		let array = [];
		return web3.eth.abi.encodeFunctionCall(object,array);
	}

	encodeNameFunction(web3) {
		let object = {
			name : "name",
			type : "function",
			inputs : []
		};
		let array = [];
		return web3.eth.abi.encodeFunctionCall(object,array);
	}

	encodeSymbolFunction(web3) {
		let object = {
			name : "symbol",
			type : "function",
			inputs : []
		};
		let array = [];
		return web3.eth.abi.encodeFunctionCall(object,array);
	}

}

module.exports = Contract;