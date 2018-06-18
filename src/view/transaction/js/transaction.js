'use strict'

const ipcRenderer = require('electron').ipcRenderer;
const dialog = require('electron').remote.dialog;
const Excel = require('../../../excel/excel.js');
const User = require('../../../user/user.js');
const log4js = require('../../../common/log.js');
const Utils = require('../../../blockchain/web3/utils.js');
const Contract = require('../../../blockchain/web3/contract.js');
const Etherunm = require('../../../blockchain/web3/etherunm.js');
const Extract = require('../../../extract/extract.js');
const Transaction = require('../../../extract/sendSignedTransaction.js');
const logger = log4js.getLogger();
const utils = new Utils();
let account = {};
let masterProvider = '';
let workerProviders = [];
let coinList = [];
// 是否正在签名 ？ 这时候是不允许切换账号的
let signing = false;

// 拿到主进程传过来的数据
ipcRenderer.on('context',(event,args)=>{
	masterProvider = args.masterProvider;
	workerProviders = args.workerProviders;
	coinList = args.coinList;
});

// 监听account消息
ipcRenderer.on('account',(event,args)=>{
	account = args;
	logger.info(`import address : ${account.address}`);
});

ipcRenderer.send('showKeyStore',"show");

window.onload = ()=> {

}

function submit() {
	try {
		if(signing) {
			return;
		}
		signing = true;
		// 导入数据
		let data = importExcel();
		// 记录导入的data
		logger.info(`Import Extract Coin Data : ${JSON.stringify(data)}`);
		let packets = batchSign(data);
		postTransaction(packets);
	} catch (err) {
		logger.error(err);
	} finally {
		signing = false;
	}
}

function importExcel() {
	let filenames = dialog.showOpenDialog({
  		filters: [ {name: 'xlsx', extensions: ['xlsx']},]
	});
	if(filenames === undefined || filenames === '' || filenames === []) {
		return;
	}
	let filename = filenames[0];
	let excel = new Excel(filename);
	return excel.read();
}

// 签名数据
async function batchSign(data) {
	// 整批数据长度
	let length = data.length;
	// 签名节点长度
	let lenOfWorkerProviders = workerProviders.length;
	// 签名节点索引
	let indexOfProvider = 0;
	let requestData = [];
	for(let i = 0; i < length; i++) {
		data[i].fromAddress = account.address;
		let signedTx = sign(data[i],workerProviders[indexOfProvider++ % lenOfWorkerProviders]);
		let packet = {
			"data" : data[i],
			"signedTx" : signedTx,
			"provider" : provider 
		}
	}

}

// 目前只能处理以太坊资产,到这一步默认是合法的数据
function sign(data,provider) {
	// 判断是不是以太坊本身
	if(data[i].coin_name === 'ETH') {
		return signForEthermun(data,provider);
	} else {
		return signForToken(data,provider);
	}
}

// 以太坊
async function signForEthermun(data,provider) {
	let etherunm = new Etherunm(provider);
	let nonce = etherunm.getNonce();
	let amount = utils.toWei(data.num);
	let estimateGas = etherunm.estimateGas(account.address,data.toAddress,amount);
	let signedTx = await etherunm.signTransaction(account,data.toAddress,amount,estimateGas,nonce);
}

//ERC20代币
async function signForToken(data,provider) {
	let etherunm = new Etherunm(provider);
	let contract = new Contract(provider);
	let nonce = etherunm.getNonce();
	let amount = utils.toWei(data.num);
	let estimateGas = contract.estimateGas(account.address,data.toAddress,amount,data.tokenAddress);
	let signedTx = await contract.signTransaction(account,data.toAddress,amount,estimateGas,nonce);

}

// 提交请求
async function postTransaction(packets) {
	
}

// 获取提币列表
async function getExtractList() {

}

// 过滤掉本软件不支持的数据
function filterData(data) {
	let filter = [];
	let utils = new Utils();
	for(let i = 0; i < data.length; i++) {
		if(utils.isAddress(data[i].toAddress) && 
			utils.isAddress(data[i].tokenAddress)) {
			filter.push(data[i]);
		}
	}
	return filter;
}

// 估算整批数据大概需要的gas费用
async function estimateGas(data,provider) {
	let totalGas = 0;
	let utils = new Utils();
	for(let i = 0; i < data.length; i++) {
		if(data[i].coinName === 'ETH') {
			let etherunm = new Etherunm(provider);
			let amount = utils.toWei(data[i].num);
			let gas = await etherunm.estimateGas(account.address,data[i].toAddress,amount); 
			totalGas = totalGas + gas;
		} else {
			let contract = new Contract(provider);
			let amount = utils.toWei(data[i].num);
			let gas = await contract.estimateGas(account.address,data[i].toAddress,amount,data[i].tokenAddress);
			totalGas = totalGas + gas;
		}
	}
	return totalGas;
} 
