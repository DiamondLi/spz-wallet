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
const Transaction = require('../../../extract/transaction.js');
const MD5Utils = require('../../../common/md5Utils.js');
const md5Utils = new MD5Utils();
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
let salt="123456789";

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
	// 加载提币申请数据
	searchExtractList();
	// 监听account消息
	ipcRenderer.on('account',(event,args)=>{
		account = args;
		logger.info(`import address : ${account.address}`);
		loadAccountBalance();
	});
});

// 导入文件并提交
async function submit() {
	try {
		if(signing) {
			alert("正在签名中...");
			return;
		}
		signing = true;
		// 导入数据
		let data = importExcel();
		// 记录导入的data
		logger.info(`Import Extract Coin Data : ${JSON.stringify(data)}`);
		let remoteData = await getExtractList(data);
		console.log(`remoteData is ${JSON.stringify(remoteData)}`);
		console.log(`remoteData length is ${remoteData.rows.length}`);
		let filter = filterData(remoteData.rows);
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
	console.log(`data is ${JSON.stringify(data)}`);
	// 签名节点长度
	let lenOfWorkerProviders = workerProviders.length;
	// 签名节点索引
	let indexOfProvider = 0;
	let requestData = [];
	for(let i = 0; i < length; i++) {
		data[i].fromAddress = account.address;
		console.log(`address is ${account.address}`);
		let signedTx = {};
		let provider = workerProviders[indexOfProvider++ % lenOfWorkerProviders];
		try {
			signedTx = await sign(data[i],provider);
		} catch (err) {
			console.log(`签名数据失败 ${err}`);
			logger.error(`签名数据失败 ${err}`);
		}
		let packet = {
			orderId : data[i].orderId,
			signedTransaction : signedTx.rawTransaction,
			provider : provider,
			encryption : md5Utils.encrypt(signedTx.rawTransaction) 
		}
		logger.info(`packet : ${JSON.stringify(packet)}`);
		let transaction = new Transaction();
		transaction.sendTransaction(packet).then( response => {
			handleTransaction(response);
		}).catch(err => {
			logger.error(`提交提币请求异常! 信息：${JSON.stringify(packet)} 错误：${err}`);
		});
	}	
}

// 目前只能处理以太坊资产,到这一步默认是合法的数据
async function sign(data,provider) {
	// 判断是不是以太坊本身
	if(data.coinName === 'ETH') {
		return await signForEthermun(data,provider);
	} else {
		return await signForToken(data,provider);
	}
}

// 以太坊
async function signForEthermun(data,provider) {
	try {
		let etherunm = new Etherunm(provider);
		let nonce = await etherunm.getNonce();
		let amount = utils.toWei(data.num);
		let estimateGas = await etherunm.estimateGas(account.address,data.toAddress,amount);
		return await etherunm.signTransaction(account,data.toAddress,amount,estimateGas,nonce);
	} catch (err) {
		throw err;
	}
}

//ERC20代币
async function signForToken(data,provider) {
	try {
		let etherunm = new Etherunm(provider);
		let contract = new Contract(provider);
		let nonce = await etherunm.getNonce(account.address);
		let amount = utils.toWei(data.num);
		let estimateGas = await contract.estimateGas(account.address,data.toAddress,amount,data.tokenAddress);
		return await contract.signTransaction(account,data.toAddress,amount,data.tokenAddress,estimateGas,nonce);
	} catch (err) {
		throw err;
	}
	
}

// 处理响应
function handleTransaction(response) {
	try {
		logger.info(response);
	} catch (err) {

	}
}

// 根据流水ID获取提币列表
async function getExtractList(data) {
	let orderIds = [];
	for(let i = 0; i < data.length; i++) {
		orderIds.push(data[i].order_id+'');
	}
	console.log(orderIds);
	let extract = new Extract(cookie);
	try {
		let obj = await extract.getExtractListByOrderIds(orderIds);
		console.log(obj);
		let body = JSON.parse(obj.body);
		console.log(`remotedata1111 is ${obj.body}`);
		if(body.code !== 200) {
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
	$('#extractCoinList').html('');
	if(extractList === null || extractList.length === 0) {
		return;
	}
	let length = extractList.length;
	for(let i = 0;i < length; i++) {
		extractList[i].fromAddress = (extractList[i].fromAddress === null ? '' : extractList[i].fromAddress);
		extractList[i].remarks = (extractList[i].remarks === null ? '' : extractList[i].remarks);
		let htmlText = '<tr>' +
			 '<td>' + extractList[i].coinName + '</td>' +
			 '<td>' + extractList[i].orderId + '</td>' +
			 '<td>' + extractList[i].num+ '</td>' +
			 '<td>' + extractList[i].fromAddress + '</td>' +
			 '<td>' + extractList[i].toAddress + '</td>' +
			 '<td>' + extractList[i].status + '</td>' +
			 '<td>' + extractList[i].txHash + '</td>' +
			 '<td>' + extractList[i].minerFee + '</td>' +
			 '<td>' + extractList[i].remarks + '</td>'+'</tr>';
		$('#extractCoinList').append(htmlText);
	}
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
	let extract = new Extract(cookie);
	extract.getExtractList(null,fromAddress,toAddress,status,pageSize,1).then(list=>{
		let body = JSON.parse(list.body);
		logger.info(body);
		if(body.code !== 200) {
			alert("msg is " + body.code);
			return;
		}
		logger.info(body.data.rows);
		showExtractList(body.data.rows);
	}).catch(err => {
		alert(`查询提币申请列表失败`);
		logger.error(`查询提币申请列表失败 ${err}`);
	});
}

function loadAccountBalance() {
	let address = account.address;
	let etherunm = new Etherunm(masterProvider);
	etherunm.getBalance(address).then(balance =>{
		// 显示coin name 和 balance
		showEthAccount(address,utils.fromWei(balance));
	});
	$('#token_list').html('');
	for(let i = 0; i < coinList.length; i++) {
		if(coinList[i].name !== 'ETH' && utils.isAddress(coinList[i].tokenAddress)){
			let contract = new Contract(masterProvider);
			contract.getBalance(address,coinList[i].tokenAddress).then( balance => {
				// 显示coin name 和 balance
				showTokenAccount(coinList[i].name,utils.fromWei(balance));
			});
		} 
	}
}

function showEthAccount(address,balance) {
	$('#eth_address').html('');
	$('#eth_balance').html('');
	let ethAddressHtml = '<span>' + address + '</span>';
	$('#eth_address').append(ethAddressHtml);
	let ethBalanceHtml = '<span>' + balance + '</span>';
	$('#eth_balance').append(ethBalanceHtml);
}

function showTokenAccount(name,balance) {
	let tokenHtml = '<tr>' + '<td>' + '<span>' 
		+ name + '</span>' + '</td>' + '<td>' 
		+ balance + '</td>' + '</tr>';
	$('#token_list').append(tokenHtml);
}

function exeData(num, type) {
    loadData(num);
    loadpage();
}

function loadpage() {
    var myPageCount = parseInt($("#PageCount").val());
    var myPageSize = parseInt($("#PageSize").val());
    var countindex = myPageCount % myPageSize > 0 ? (myPageCount / myPageSize) + 1 : (myPageCount / myPageSize);
    $("#countindex").val(countindex);
    $.jqPaginator('#pagination', {
        totalPages: parseInt($("#countindex").val()),
        visiblePages: parseInt($("#visiblePages").val()),
        currentPage: 1,
        first: '<li class="first"><a href="javascript:;">首页</a></li>',
        prev: '<li class="prev"><a href="javascript:;"><i class="arrow arrow2"></i>上一页</a></li>',
        next: '<li class="next"><a href="javascript:;">下一页<i class="arrow arrow3"></i></a></li>',
        last: '<li class="last"><a href="javascript:;">末页</a></li>',
        page: '<li class="page"><a href="javascript:;">{{page}}</a></li>',
        onPageChange: function (num, type) {
            if (type == "change") {
                exeData(num, type);
            }
        }
    });
}

$(function () {
    loadData(1);
    loadpage();
});
