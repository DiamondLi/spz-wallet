/**
* @author : yang.deng
*/
'use strict'
const ipcRenderer = require('electron').ipcRenderer;
const dialog = require('electron').remote.dialog;
const $ = require('jquery');
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
const pageSize = 10;
let account = {};
let masterProvider = '';
let workerProviders = [];
let coinList = [];
let cookie = '';
// 是否正在签名 ？ 这时候是不允许切换账号的
let signing = false;
// 失败的申请数量
let failureNum = 0;
// 成功的申请数量
let successNum = 0;
// 导入成功的申请数量
let importNum = 0;

// 监听account消息
ipcRenderer.on('account',(event,args)=>{
	account = args;
	logger.info(`import address : ${account.address}`);
	loadAccountBalance();
});

ipcRenderer.send('showKeyStore',"show");

ipcRenderer.on('cookie',(event,args)=>{
	cookie = args;
});

// 拿到主进程传过来的数据
ipcRenderer.on('data',(event,args)=>{
	masterProvider = args.masterProvider;
	workerProviders = args.workerProviders;
	cookie = args.cookie;
	coinList = args.coinList;
	console.log(args);
	// 加载提币申请数据
	searchExtractList();
});

// 导入文件并提交
async function submit() {
	try {
		if(signing) {
			return;
		}
		signing = true;
		// 导入数据
		let data = importExcel();
		// 记录导入的data
		logger.info(`Import Extract Coin Data : ${JSON.stringify(data)}`);
		let remoteData = await getExtractList(data);
		console.log(remoteData);
		let filter = filterData(remoteData);
		for(let i=0;i<filter.length;i++) {
			filter[i].fromAddress = account.address;
		}
		let gasUsed = await estimateGas(filter,masterProvider);
		let cost = getCost(filter);
		showMessage(gasUsed,cost);
		batchSignAndPostTransaction(filter);
	} catch (err) {
		console.log(err);
		logger.error(err);
	} finally {
		signing = false;
	}
}

function showMessage(gas,cost) {
	let message = `总矿工费 : ${gas} \n`;
	message = message + `总提币数量为 : \n`;
	for (let entry of cost.entries()) {
  		message = message + `${entry[0]} : ${entry[1]} \n`;
	}
	alert(message);
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
async function batchSignAndPostTransaction(data) {
	// 整批数据长度
	let length = data.length;
	// 签名节点长度
	let lenOfWorkerProviders = workerProviders.length;
	// 签名节点索引
	let indexOfProvider = 0;
	let requestData = [];
	for(let i = 0; i < length; i++) {
		data[i].fromAddress = account.address;
		let signedTx = {};
		try {
			signedTx = sign(data[i],workerProviders[indexOfProvider++ % lenOfWorkerProviders]);
		} catch (err) {
			console.log(`签名数据失败 ${err}`);
			logger.error(`签名数据失败 ${err}`);
		}
		let packet = {
			original : data[i],
			signedTransaction : signedTx.rawTransaction,
			provider : provider 
		}
		logger.info(`packet : ${JSON.stringify(packet)}`);
		let transaction = new Transaction(cookie);
		transaction.postTransaction(packet).then( res => {
			handleTransaction(res);
		}).catch(err => {
			console.log(`提交提币请求异常! 信息：${JSON.stringify(packet)} 错误：${err}`);
			logger.error(`提交提币请求异常! 信息：${JSON.stringify(packet)} 错误：${err}`);
		});
	}	
}

// 目前只能处理以太坊资产,到这一步默认是合法的数据
async function sign(data,provider) {
	// 判断是不是以太坊本身
	if(data[i].coinName === 'ETH') {
		return await signForEthermun(data,provider);
	} else {
		return await signForToken(data,provider);
	}
}

// 以太坊
async function signForEthermun(data,provider) {
	let etherunm = new Etherunm(provider);
	let nonce = await etherunm.getNonce();
	let amount = utils.toWei(data.num);
	let estimateGas = await etherunm.estimateGas(account.address,data.toAddress,amount);
	return await etherunm.signTransaction(account,data.toAddress,amount,estimateGas,nonce);
}

//ERC20代币
async function signForToken(data,provider) {
	let etherunm = new Etherunm(provider);
	let contract = new Contract(provider);
	let nonce = await etherunm.getNonce();
	let amount = utils.toWei(data.num);
	let estimateGas = await contract.estimateGas(account.address,data.toAddress,amount,data.tokenAddress);
	return await contract.signTransaction(account,data.toAddress,amount,estimateGas,nonce);
}

// 处理响应
function handleTransaction(response) {
	try {

	} catch (err) {

	}
}

// 根据流水ID获取提币列表
async function getExtractList(data) {
	console.log(data);
	let orderIds = [];
	for(let i = 0; i < data.length; i++) {
		orderIds.push(data[i].order_id+'');
	}
	console.log(orderIds);
	let extract = new Extract(cookie);
	try {
		let obj = await extract.getExtractListByOrderIds(orderIds);
		console.log(obj);
		let body = JSON.parse(data.body);
		console.log(body);
		if(body.code !== 0) {
			return null;
		}
		return body.data;
	} catch(err) {
		throw `获取提币申请列表异常 ${err}`;
	}
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

// 在界面上显示提币申请
function showExtractList(extractList) {
	/** TO DO */
}

// 获取余额信息
function getCost(data) {
	let map = new Map();
	let length = data.length;
	for(let i = 0; i < length; i++) {
		let cost = data[i].num;
		// 已经存在
		if(map.has(data[i].costName)) {
			let newCost = cost + map.get(data[i].costName);
			map.set(data[i].costName,newCost);
		} else {
			map.set(data[i].costName,cost);
		}
	}
	return map;
}

// 查询
function searchExtractList() {
	let status = $('#status').val();
	let fromAddress = $('#fromAddress').val();
	let toAddress = $('#toAddress').val();
	console.log(`status is ${status}`);
	let extract = new Extract(cookie);
	extract.getExtractList(null,fromAddress,toAddress,status,pageSize,1).then( list=> {
		let body = JSON.parse(list.body);
		console.log(body);
		if(body.code !== 0) {
			alert(body.msg);
			return;
		}
		showExtractList(JSON.parse(body.data));
	}).catch(err => {
		alert(`查询提币申请列表失败`);
		logger.error(`查询提币申请列表失败 ${err}`);
	});
}

function loadAccountBalance() {
	let address = account.address;
	let accountBalance = [];
	let balance;
	for(let i = 0; i < coinList.length; i++) {
		if(coinList[i].name === 'ETH') {
			let etherunm = new Etherunm(masterProvider);
			etherunm.getBalance(address).then(balance =>{
				// 显示coin name 和 balance
			});
		} else if(coinList[i].name !== 'ETH' && utils.isAddress(coinList[i].tokenAddress)){
			let extract = new Extract(masterProvider);
			extract.getBalance(address,coinList[i].tokenAddress).then(balance => {
				// 显示coin name 和 balance
			});
		} 
	}
}
