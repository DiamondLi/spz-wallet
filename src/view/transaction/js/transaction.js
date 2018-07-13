'use strict'
const ipcRenderer = require('electron').ipcRenderer;
const dialog = require('electron').remote.dialog;
const $ = require('jquery');
const shell = require('electron').shell;
const Excel = require('../../../excel/excel.js');
const User = require('../../../user/user.js');
const Coin = require('../../../coin/coin.js');
const log4js = require('../../../common/log.js');
const Utils = require('../../../blockchain/web3/utils.js');
const Contract = require('../../../blockchain/web3/contract.js');
const Etherunm = require('../../../blockchain/web3/etherunm.js');
const Extract = require('../../../extract/extract.js');
const Transaction = require('../../../extract/transaction.js');
const MD5Utils = require('../../../common/md5Utils.js');
const Decimal = require('decimal.js');
const md5Utils = new MD5Utils();
const transaction = new Transaction();
const logger = log4js.getLogger();
const utils = new Utils();
const pageSize = 14;
let account = {};
let masterProvider = '';
let workerProviders = [];
let coinList = [];
let cookie = '';
// 是否正在签名 ？ 这时候是不允许切换账号的
let signing = false;
let baseAddressUrl = ''
let baseTxHashUrl = "";
let salt="";
let result = '';
window.onload = ()=>{
    var script=document.createElement("script");
    script.setAttribute("type", "text/javascript");
    script.setAttribute("src", "../layui/layui.js");
    document.head.appendChild(script);
}

ipcRenderer.send('showKeyStore',"show");

ipcRenderer.on('cookie',(event,args)=>{
	cookie = args;
});

// 拿到主进程传过来的数据
ipcRenderer.on('data',(event,args)=>{
	masterProvider = args.masterProvider;
	workerProviders = args.workerProviders;
	cookie = args.cookie;
	baseAddressUrl = args.addressUrl;
	baseTxHashUrl = args.txUrl;
	salt = args.salt;
	// coinList = args.coinList;
	let coin = new Coin(cookie);
	coin.getCoinList().then(obj => {
		let body = JSON.parse(obj.body);
		coinList = body.data;
	}).catch(err =>{
		logger.error(err);
		alert("请求币种列表失败");
	});
	// 加载提币申请数据
	searchExtractList();
	// 监听account消息
	ipcRenderer.on('account',(event,args)=>{
		account = args;
		loadAccountBalance();
	});
});

function importExcel() {
	let filenames = dialog.showOpenDialog({
  		filters: [ {name: 'xlsx', extensions: ['xlsx']},]
	});
	if(filenames === undefined || filenames === '' || filenames === []) {
		return null;
	}
	let filename = filenames[0];
	let excel = new Excel(filename);
	return excel.read();
}

function isSameCoin(data) {
	logger.info(data.length);
	for(let i = 1; i < data.length;i++) {
		if(data[i].coin_name !== data[i-1].coin_name) {
			logger.info(i + "|| " + data[i].coin_name + " || " + data[i-1].coin_name);
			throw "导入数据必须为同一币种";
		}
	}
}

// 签名数据
async function batchSignAndPostTransaction(data) {
	// 成功的申请数量
	result = '';
	$('#importDataBar').html('');
	$('#requestSuccDataBar').html('');
	$('#requestFailDataBar').html('');
	let successNum = 0;
	// 整批数据长度
	let length = data.length;
	// 签名节点长度
	let lenOfWorkerProviders = workerProviders.length;
	// 签名节点索引
	let indexOfProvider = 0;
	let provider = workerProviders[indexOfProvider++ % lenOfWorkerProviders];
	let etherunm = new Etherunm(provider);
	try {
		// 初始的nonce
		let nonce = await etherunm.getNonce(account.address); 
		let networkId = await etherunm.getId();
		// 网络ID，即chainID
		if(networkId != 3) {
			result = "提币错误,错误的provider,请检查配置文件";
			return;
		}
		// 初始的以太坊余额
		let initBalance = await etherunm.getBalance(account.address);
		let balance = new Decimal(utils.fromWei(initBalance));
		let tokenBalance;
		let initTokenBalance;
		if(data[0].coinName !== 'ETH') {
			let contract = new Contract(provider);
			initTokenBalance = await contract.getBalance(account.address,data[0].tokenAddress);
			tokenBalance = new Decimal(utils.fromWei(initTokenBalance));
		}
		console.log(" tokenBalance : " + tokenBalance);
		for(let i = 0; i < length; i++) {
			console.log("第" + i + "条");
			data[i].fromAddress = account.address;
			// 查询pending状态 nonce
			if(i !== 0) {
				while(true) {
					let newNonce = await etherunm.getNonce(account.address);
					if(newNonce === nonce + 1) {
						nonce = newNonce;
						break;
					}
				}
			}
			let gasPrice = await etherunm.getPrice();
			let signedTx = await sign(data[i],provider,nonce,gasPrice,balance,tokenBalance);
			let packet = {
				fromAddress : data[i].fromAddress,
				orderId : data[i].orderId,
				signedTransaction : signedTx.rawTransaction,
				provider : provider,
				encryption : md5Utils.encrypt(signedTx.rawTransaction+salt),
				nonce : nonce,
				gasPrice : gasPrice
			};
			let response = await transaction.sendTransaction(packet);
			let res = JSON.parse(response.body);
			// 请求失败
			if(res.code !== 200) {
				showFailReqBar(length-successNum);
				logger.error(`提交签名数据失败 : ${res.msg}`);
				return "提交签名数据失败,请导入文件重试或检查服务器状态";
			} 
			successNum++;
			showSuccReqBar(successNum);
			let number = new Decimal(data[i].num);
			if(data[i].coinName === 'ETH') {
				let totalGasUsed = new Decimal(90000).mul(new Decimal(utils.fromWei(gasPrice)));
				let totalCost = totalGasUsed.add(number);
				balance = balance.sub(totalCost);
				$('#eth_balance').html('');
				$('#eth_balance').append(balance.toNumber());
			} else {
				balance = balance.sub(new Decimal(90000).mul(new Decimal(utils.fromWei(gasPrice))));
				tokenBalance = tokenBalance.sub(number);
				$('#eth_balance').html('');
				$('#eth_balance').append(balance.toNumber());
				let id = data[i].coinName + 'balance';
				$('#id').html('');
				$('#id').append(tokenBalance.toNumber());
			}
		}
	} catch (err) {
		logger.error(`远程节点网络异常 : ${err}`);
		showFailReqBar(length-successNum);
		result = `提币异常,请导入文件重试 ${err}`;
		return;
	}
	result = "全部数据签名完毕,共" + successNum + "条";
	return;
}

// 目前只能处理以太坊资产,到这一步默认是合法的数据
async function sign(data,provider,nonce,gasPrice,balance,tokenBalance) {
	// 判断是不是以太坊本身
	if(data.coinName === 'ETH') {
		return await signForEthermun(data,provider,nonce,gasPrice,balance);
	} else {
		return await signForToken(data,provider,nonce,gasPrice,balance,tokenBalance);
	}
}

// 以太坊
async function signForEthermun(data,provider,nonce,gasPrice,balance) {
	try {
		let etherunm = new Etherunm(provider);
		let amount = utils.toWei(data.num);
		//let estimateGas = await etherunm.estimateGas(account.address,data.toAddress,amount);
		let estimateGas = 90000;
		let cost = new Decimal(utils.fromWei(gasPrice)).mul(new Decimal(estimateGas));
		cost = cost.add(new Decimal(data.num));
		if(balance.lessThan(cost)) {
			 throw "以太坊余额不足";
		}
		return await etherunm.signTransaction(account,data.toAddress,amount,estimateGas,nonce,gasPrice);
	} catch (err) {
		throw err;
	}
}

//ERC20代币
async function signForToken(data,provider,nonce,gasPrice,balance,tokenBalance) {
	try {
		let etherunm = new Etherunm(provider);
		let contract = new Contract(provider);
		let amount = utils.toWei(data.num);
		let estimateGas = 90000;
		console.log("tokenBalance : " + tokenBalance + " data.num : " + data.num);
		// 代币余额
		if(tokenBalance.lessThan(new Decimal(data.num))) {
			throw data.coinName + "币余额不足"; 
		}
		let estimate = new Decimal(estimateGas);
		let gaspri = new Decimal(utils.fromWei(gasPrice));
		let cost = estimate.mul(gaspri);
		if(balance.lessThan(cost)) {
			throw "以太坊余额不足";
		}
		//let estimateGas = await contract.estimateGas(account.address,data.toAddress,amount,data.tokenAddress);
		return await contract.signTransaction(account,data.toAddress,amount,data.tokenAddress,estimateGas,nonce,gasPrice);
	} catch (err) {
		throw err;
	}
}

// 根据流水ID获取提币列表
async function getExtractList(data) {
	let orderIds = [];
	for(let i = 0; i < data.length; i++) {
		orderIds.push(data[i].order_id+'');
	}
	let extract = new Extract(cookie);
	try {
		let obj = await extract.getExtractListByOrderIds(orderIds);
		let body = JSON.parse(obj.body);
		if(body.code !== 200) {
		 	throw body.msg;
		 	if(body.code === 500) {
		 		ipcRenderer.send('relogin','relogin');
		 	}
		}
		return body.data;
	} catch(err) {
		throw `获取提币申请列表线上数据异常 ${err}`;
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
	alert(data);
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
		if(body.code !== 200) {
			if(body.code === 500) {
				ipcRenderer.send('relogin','relogin');
			}
			alert("msg is " + body.code);
			return;
		}
        layuiInit(body.data.rows, body.data.total);
		//showExtractList(body.data.rows);
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
		if(coinList[i].shortName !== 'ETH' && utils.isAddress(coinList[i].tokenAddress)){
			let contract = new Contract(masterProvider);
			contract.getBalance(address,coinList[i].tokenAddress).then( balance => {
				// 显示coin name 和 balance
				showTokenAccount(coinList[i].shortName,utils.fromWei(balance));
			});
		} 
	}
}

function showImportStatusBar(success) {
	$('#importDataBar').html('');
	$('#importDataBar').append('导入有效数据条目 : ' + success);
}

function showSuccReqBar(succ) {
	$('#requestSuccDataBar').html('');
	$('#requestSuccDataBar').append(' 提币请求成功条目 : ' + succ);
}

function showFailReqBar(fail) {
	$('#requestFailDataBar').html('');
	$('#requestFailDataBar').append(' 提币请求失败条目 ：' + fail);
}

function showEthAccount(address,balance) {
    $('#eth_address').html('');
    $('#eth_balance').html('');
    $('#eth_address').append('<p>' + address + '</p>');
    $('#eth_balance').append(balance);
}

function showTokenAccount(name,balance) {
    let tokenHtml = '<tr><td>'+ name +'</td>';
    tokenHtml += '<td id="'+name+'"balance>'+ balance +'</td></tr>';
    $('#token_list').append(tokenHtml);
}

function layuiInit(rows,count) {
    layui.use(['table','form', 'layedit', 'laydate', 'upload','element','laypage'], function() {
        var $ = layui.jquery,
            table = layui.table,
            form = layui.form,
            laydate = layui.laydate,
            layedit = layui.layedit,
            element = layui.element,
			laypage = layui.laypage;
            layer = layui.layer;

        //执行一个 table 实例
        var tableIns = table.render({
            elem: '#table'
            ,data:rows
            ,page: false
            ,skin: 'line' //行边框风格
            ,cols: [[ //表头
                {title: '币种', templet:'<div>{{ d.coinName }}</div>'}
                ,{title: '流水号', width:'20%', templet:'<div style="font-size:12px">{{ d.orderId }}</div>'}
                ,{title: '数量', templet:'<div>{{ d.num }}</div>'}
                ,{title: '转出地址', width:'20%', templet:function(d){
					var fromAddress = '';
					if(d.fromAddress != null){
                        fromAddress = d.fromAddress;
					}
					return '<div><a href="javascript:;" class="a-font-color outAddress" style="font-size:12px">' + fromAddress + '</a></div>';
				}}
                ,{title: '转入地址', width:'20%', templet:function(d){
					var toAddress = '';
					if(d.toAddress != null){
						toAddress = d.toAddress;
					}
					return '<div><a href="javascript:;" class="a-font-color intoAddress" style="font-size:12px">' + toAddress + '</a></div>';
				}}
                ,{title: '状态', templet:function(d){
					var status = '';
					if(d.status == 1){
						status = '待处理';
					}else if(d.status == 2){
						status = '处理中';
					}else if(d.status == 3){
						status = '成功';
					}else if(d.status == 4){
						status = '失败';
					}else if(d.status == 5){
						status = '未知';
					}
					return '<div>' + status + '</div>';
				}}
                ,{title: '交易哈希', templet:function(d) {
                	var txHash = '';
                	if(d.txHash != '0'){
                		txHash = d.txHash;
                	}
                	return '<div><a href="#" class="a-font-color txhash">'+ txHash + 
                	'</a></div>'
                }}
                ,{title: '矿工费(ETH)', templet:function(d) {
                	var minerFee = '';
                	if(d.minerFee != '0') {
                		minerFee = d.minerFee;
                	}
                	return '<div>' + minerFee + '</div>';
                }}
                ,{title: '备注', templet:function(d){
					var remarks = '';
					if(d.remarks != null){
						remarks = d.remarks;
					}
					return '<div>' + remarks + '</div>';
				}}
            ]]
        });

        renderPage(count);

        $(document).on('click','#search',function(){
            let fromAddress = $("input[name='fromAddress']").val();
            let toAddress = $("input[name='toAddress']").val();
            let status = $('#statusId option:selected').val();
            let coinName = $("input[name='coinName']").val();
            let extract = new Extract(cookie);
            extract.getExtractList(null,fromAddress,toAddress,status,pageSize,1,coinName).then(list=>{
                let body = JSON.parse(list.body);
                if(body.code !== 200) {
                    layer.msg(body.msg);
                    if(body.code === 500) {
                		ipcRenderer.send('relogin','relogin');
                	}
                    return;
                }
                tableIns.reload({
                    data:body.data.rows
                });
                renderPage(body.data.total);
            }).catch(err => {
                layer.msg(`查询提币申请列表失败`);
                logger.error(`查询提币申请列表失败 ${err}`);
            });
        });

        $(document).on('click','.intoAddress',function() {
        	let intoAddress = $(this).html();
     		let url = baseAddressUrl + intoAddress;
    		shell.openExternal(url);
        });

        $(document).on('click','.outAddress',function() {
        	let outAddress = $(this).html();
        	let url = baseAddressUrl + outAddress;
        	shell.openExternal(url);
        });

        $(document).on('click','.txhash',function() {
        	let txhash = $(this).html();
        	let url = baseTxHashUrl + txhash;
        	shell.openExternal(url);
        });

        function renderPage(count) {
            //执行一个laypage实例
            var pageIns = laypage.render({
                elem: 'page'
                ,theme: '#5485ed'
                ,height: '700px'
                ,limit: 14
                ,count: count
                ,jump: function(obj, first){

                    //首次不执行
                    if(!first){
                        var fromAddress = $("input[name='fromAddress']").val();
                        var toAddress = $("input[name='toAddress']").val();
                        var status = $('#statusId option:selected').val();
                        var coinName = $("input[name='coinName']").val();
                        let extract = new Extract(cookie);
                        extract.getExtractList(null,fromAddress,toAddress,status,obj.limit, obj.curr,coinName).then(list=>{
                            let body = JSON.parse(list.body);
                            if(body.code !== 200) {
                                layer.msg("msg is " + body.code);
                                return;
                            }
                            tableIns.reload({
                                data:body.data.rows
                            });
                        }).catch(err => {
                            layer.msg(`查询提币申请列表失败`);
                            logger.error(`查询提币申请列表失败 ${err}`);
                        });
                    }
                }
            });
        }

        $(document).on('click','#importFile',()=>{
        	if(signing) {
				layer.msg("正在签名中,不允许重复签名");
				return;
			}
			signing = true;
			// 导入数据
			let data = null;
			try {
				data = importExcel();
				if(data === null) {
					signing = false;
					return;
				}
				isSameCoin(data);
			} catch (err) {
				layer.alert(`错误！${err}`);
				signing = false;
				return;
			}
			// 记录导入的data
			getExtractList(data).then( remoteData => {
				if(remoteData === null || remoteData === []) {
					signing = false;
					return;
				}
				let filter = filterData(remoteData.rows);
				for(let i=0;i<filter.length;i++) {
					filter[i].fromAddress = account.address;
				}
				layer.confirm("是否确认提币?",{btn:['是','否']},(index)=>{
					layer.close(index);
					layer.msg(`从excel文件导入数据${data.length}条,有效数据为${filter.length}条,开始提币...`,{
						time : 6000,
						btn: ['知道了']
					});
					showImportStatusBar(filter.length);
					batchSignAndPostTransaction(filter).then(()=>{
						logger.info(result);
						layer.msg(result,{
							time : 3000,
							btn : ['知道了']
						});
						signing = false;	
					});
				},(index)=>{
					layer.close(index);
					signing = false;
				});
			}).catch(err => {
				layer.alert(`签名失败 : ${err}`);
				signing = false;
			});
	    });
    });
}
