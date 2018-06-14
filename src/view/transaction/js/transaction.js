'use strict'

const ipcRenderer = require('electron').ipcRenderer;
const dialog = require('electron').remote.dialog;
const User = require('../../../user/user.js');
const log4js = require('../../../common/log.js');
const Utils = require('../../../blockchain/web3/utils.js');
const Contract = require('../../../blockchain/web3/contract.js');
const Etherunm = require('../../../blockchain/web3/etherunm.js');
const logger = log4js.getLogger();

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
});

window.onload = ()=> {
	
}

init();

function init() {
	ipcRenderer.send('showKeyStore',"show");
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

}

// 签名数据
async function batchSign(data) {
	let length = data.length;
	let lenOfWorkerProviders = workerProviders.length;
	let indexOfProvider = 0;
	let requestData = [];
	for(let i = 0; i < length; i++) {
		data[i].fromAddress = account.address;
		let signedTx = sign(data[i],workerProviders[indexOfProvider++ % lenOfWorkerProviders]);
	}

}

// 目前只能处理以太坊资产
async function sign(data,provider) {
	if(data)
}

// 提交请求
async function postTransaction(packets) {

}



