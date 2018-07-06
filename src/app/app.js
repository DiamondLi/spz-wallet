/**
*  @version: v1.0.0
*  @author : yang.deng
*/

'use strict'
const path = require('path');
const electron = require('electron');
const log4js= require('../common/log.js');
const RwExcel = require('../excel/excel.js');
const Provider = require('../common/provider.js');
const Coin = require('../coin/coin.js');
const app = electron.app
const ipcMain = electron.ipcMain
const dialog  = electron.dialog;
const browserWindow = electron.BrowserWindow;
const logger = log4js.getLogger();//根据需要获取logger
const transactionUrl = path.normalize(`file://${__dirname}/../view/transaction/html/transaction.html`);
const keystoreUrl = path.normalize(`file://${__dirname}/../view/wallet/html/wallet.html`);;
const loginUrl = path.normalize(`file://${__dirname}/../view/login/html/login.html`);
let transactionWindow;
let loginWindow;
let keystoreWindow;

class App {

	constructor() {
		this.provider = new Provider();
		this.masterProvider = this.provider.getMasterProvider("testnet");
		this.workerProviders = this.provider.getWorkerProviders("testnet");
	}

	createLoginWindow() {
		loginWindow = new browserWindow({width:566,height:400,show:false,resizable:false});
		loginWindow.loadURL(loginUrl);
		loginWindow.once('ready-to-show',()=>{
			loginWindow.show();
		});
		loginWindow.on('closed',()=> {
			loginWindow = null;				
		});
	}

	createtransactionWindow() {
		transactionWindow = new browserWindow({width:1350,height:900,show:false,resizable:true});
		transactionWindow.loadURL(transactionUrl);
		transactionWindow.once('ready-to-show',()=>{
			transactionWindow.show();
			let data = {
				masterProvider : this.masterProvider,
				workerProviders : this.workerProviders,
				cookie : this.cookie,
				coinList : this.coinList
			};
			transactionWindow.webContents.send('data',data);
			loginWindow.close();
		});
		transactionWindow.on('closed',()=> {
			transactionWindow = null;	
		});
	}

	createKeystoreWindow() {
		keystoreWindow = new browserWindow({width:566,height:400,show:false,
				parent:transactionWindow,modal: true,frame : false});
		keystoreWindow.loadURL(keystoreUrl);
		keystoreWindow.once('ready-to-show',()=>{
			keystoreWindow.show();
		});
		keystoreWindow.on('closed',()=> {
			keystoreWindow = null;	
		});
	}

	start() {

		const isSecondInstance = app.makeSingleInstance((commandLine, workingDirectory) => {
		  	// Someone tried to run a second instance, we should focus our window.
			if (loginWindow) {
			    if (loginWindow.isMinimized()) {
			    	loginWindow.restore();
			    }  	
			    loginWindow.focus();
			}
		})

		if (isSecondInstance) {
			dialog.showErrorBox("软件正在运行","");
			app.quit();
		}

		/** 创建窗口 */
		app.on('ready',this.createLoginWindow);

		/** 所有窗口都关闭，退出程序 */
		app.on('window-all-closed',()=> {
			app.quit();
		});

		ipcMain.on('login',(event,cookie)=>{
			this.cookie = cookie;
			this.createtransactionWindow();
		});

		ipcMain.on('showKeyStore',(event,args)=>{
			this.createKeystoreWindow();
		});

		ipcMain.on('keystore',(event,account)=>{
			keystoreWindow.close();
			transactionWindow.webContents.send('account',account);
		});

		ipcMain.on('relogin',(event,args)=>{
			// 开启login窗口
			this.createLoginWindow();
			transactionWindow.close();
			// 关闭transaction窗口
		});
	}
}

module.exports = App;