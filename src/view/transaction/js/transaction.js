/**
* @author : yang.deng
*/
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

// 拿到主进程传过来的数据
ipcRenderer.on('data',(event,args)=>{
	masterProvider = args.masterProvider;
	workerProviders = args.workerProviders;
	cookie = args.cookie;
	coinList = args.coinList;
});

// 监听account消息
ipcRenderer.on('account',(event,args)=>{
	account = args;
	logger.info(`import address : ${account.address}`);
});

ipcRenderer.send('showKeyStore',"show");

ipcRenderer.on('cookie',(event,args)=>{
	cookie = args;
});

ipcRenderer.on('submit',(event,args)=>{
	submit(args);
});

window.onload = ()=> {
	// 加载提币申请数据
	searchExtractList();
}

// 导入文件并提交
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
		let remoteData = getExtractList(data);
		let filter = filterData(remoteData);
		let gasUsed = estimateGas(filter,masterProvider);
		let balance = getBalance(filter);
		batchSignAndPostTransaction(filter);
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
			logger.error(`提交提币请求异常! 信息：${JSON.stringify(packet)} 错误：${err}`);
		});
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

// 处理响应
function handleTransaction(response) {
	try {

	} catch (err) {

	}
}

// 根据流水ID获取提币列表
async function getExtractList(data) {
	let orderIds = [];
	for(let i = 0; i < data.length; i++) {
		orderIds.push(data[i].orderId);
	}
	let extract = new Extract(cookie);
	try {
		let obj = await extract.getExtractListByOrderIds(orderIds);
		let body = JSON.parse(data.body);
		if(body.code !== 0) {
			return null;
		}
		return body.data;
	} catch(err) {
		throw `获取提币申请列表异常 ${err}`
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

// 在界面上显示
function showExtractList(extractList) {
	/** TO DO */
}

// 获取余额信息
function getBalance(data) {
	let map = new Map();
	let length = data.length;
	for(let i = 0; i < length; i++) {
		
	}

}

// 查询
function searchExtractList() {
	let status = $('#status').val();
	let fromAddress = $('#fromAddress').val();
	let toAddress = $('#toAddress').val();
	let extract = new Extract(cookie);
	extract.getExtractList(null,fromAddress,tokenAddress,status,pageSize,1).then( list=> {
		let body = JSON.parse(data.body);
		if(body.code !== 0) {
			alert(body.msg);
			return;
		}
		showExtractList(JSON.parse(body.data));
	}).catch(err) {
		alert(`查询提币申请列表失败`);
		logger.error(`查询提币申请列表失败 ${err}`);
	};
}