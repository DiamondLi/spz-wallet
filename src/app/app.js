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
		this.masterProvider = this.provider.getMasterProvider("mainnet");
		this.workerProviders = this.provider.getWorkerProviders("mainnet");
	}

	createLoginWindow() {
		loginWindow = new browserWindow({width:566,height:400,show:false,resizable:true});
		loginWindow.loadURL(loginUrl);
		loginWindow.once('ready-to-show',()=>{
			loginWindow.show();
			//loginWindow.webContents.send('provider',conf.defaultProvider);
		});
		loginWindow.on('closed',()=> {
			loginWindow = null;				
		});
	}

	createtransactionWindow() {
		transactionWindow = new browserWindow({width:1300,height:815,show:false,resizable:false});
		transactionWindow.loadURL(transactionUrl);
		transactionWindow.once('ready-to-show',()=>{
			transactionWindow.show();
			loginWindow.close();
		});
		transactionWindow.on('closed',()=> {
			transactionWindow = null;	
			app.quit();	
		});
	}

	createKeystoreWindow() {
		keystoreWindow = new browserWindow({width:1300,height:400,show:false});

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
			this.getCoinList(cookie);

		});
	}

	async getCoinList(cookie) {
		let coin = new Coin();
		let coinList = await coin.getCoinList(cookie);
		console.log(coinList.body);
	}

}

module.exports = App;