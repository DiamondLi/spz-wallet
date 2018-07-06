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
const md5Utils = new MD5Utils();
const transaction = new Transaction();
const logger = log4js.getLogger();
const utils = new Utils();
const pageSize = 15;
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

// 签名数据
async function batchSignAndPostTransaction(data) {
	// 失败的申请数量
	let failureNum = 0;
	// 成功的申请数量
	let successNum = 0;
	// 整批数据长度
	let length = data.length;
	// 签名节点长度
	let lenOfWorkerProviders = workerProviders.length;
	// 签名节点索引
	let indexOfProvider = 0;
	let provider = workerProviders[indexOfProvider++ % lenOfWorkerProviders];
	let etherunm = new Etherunm(provider);
	let nonce;
	try {
		nonce = await etherunm.getNonce(account.address); 
	} catch (err) {
		logger.error(`在远程节点上获取nonce值失败`);
		return;
	}
	for(let i = 0; i < length; i++) {
		data[i].fromAddress = account.address;
		try {
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
			gasPrice = utils.toWei(gasPrice,"gwei");
			let signedTx = await sign(data[i],provider,nonce,gasPrice);
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
				failureNum++;
				showFailReqBar(failureNum);
				logger.error(`提交签名数据失败 : ${res.msg}`);
				if(res.code === 500) {
					ipcRenderer.send('relogin','relogin');	
				}
			} else {
				successNum++;
				showSuccReqBar(successNum);
			}
		} catch (err) {
			logger.error(`签名数据失败 ${err}`);
		}
	}
}

// 目前只能处理以太坊资产,到这一步默认是合法的数据
async function sign(data,provider,nonce,gasPrice) {
	// 判断是不是以太坊本身
	if(data.coinName === 'ETH') {
		return await signForEthermun(data,provider,nonce,gasPrice);
	} else {
		return await signForToken(data,provider,nonce,gasPrice);
	}
}

// 以太坊
async function signForEthermun(data,provider,nonce,gasPrice) {
	try {
		let etherunm = new Etherunm(provider);
		let amount = utils.toWei(data.num);
		//let estimateGas = await etherunm.estimateGas(account.address,data.toAddress,amount);
		let estimateGas = 90000;
		return await etherunm.signTransaction(account,data.toAddress,amount,estimateGas,nonce,gasPrice);
	} catch (err) {
		throw err;
	}
}

//ERC20代币
async function signForToken(data,provider,nonce,gasPrice) {
	try {
		let etherunm = new Etherunm(provider);
		let contract = new Contract(provider);
		let amount = utils.toWei(data.num);
		let estimateGas = 90000;
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
    tokenHtml += '<td>'+ balance +'</td></tr>';
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
                ,{title: '流水号', width:'15%', templet:'<div>{{ d.orderId }}</div>'}
                ,{title: '数量', templet:'<div>{{ d.num }}</div>'}
                ,{title: '转出地址', width:'15%', templet:function(d){
					var fromAddress = '';
					if(d.fromAddress != null){
                        fromAddress = d.fromAddress;
					}
					return '<div><a href="#" class="a-font-color outAddress">' + fromAddress + '</a></div>';
				}}
                ,{title: '转入地址', width:'15%', templet:function(d){
					var toAddress = '';
					if(d.toAddress != null){
						toAddress = d.toAddress;
					}
					return '<div><a href="javascript:;" class="a-font-color intoAddress">' + toAddress + '</a></div>';
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
                ,{title: '交易哈希', templet:'<div><a href="#" class="a-font-color txhash">{{ d.txHash }}</a></div>'}
                ,{title: '旷工费', templet:'<div>{{ d.minerFee }}</div>'}
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
            var fromAddress = $("input[name='fromAddress']").val();
            var toAddress = $("input[name='toAddress']").val();
            var status = $('#statusId option:selected').val();
            let extract = new Extract(cookie);
            extract.getExtractList(null,fromAddress,toAddress,status,pageSize,1).then(list=>{
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
                ,count: count
                ,jump: function(obj, first){

                    //首次不执行
                    if(!first){
                        var fromAddress = $("input[name='fromAddress']").val();
                        var toAddress = $("input[name='toAddress']").val();
                        var status = $('#statusId option:selected').val();

                        let extract = new Extract(cookie);
                        extract.getExtractList(null,fromAddress,toAddress,status,obj.limit, obj.curr).then(list=>{
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
			} catch (err) {
				logger.error(err);
				layer.alert(err);
				signing = false;
				return;
			}
			if(data === null) {
				signing = false;
				return;
			}
			// 记录导入的data
			getExtractList(data).then(remoteData => {
				if(remoteData === null || remoteData === []) {
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
					batchSignAndPostTransaction(filter);
					signing = false;	
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
