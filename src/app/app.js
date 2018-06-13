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
const app = electron.app
const ipcMain = electron.ipcMain
const dialog  = electron.dialog;
const browserWindow = electron.BrowserWindow;
const logger = log4js.getLogger();//根据需要获取logger
//let mainWindow;
//let loginWindow;
const loginUrl = path.normalize('../view/login/html/login.html');
class App {

	constructor() {
		this.provider = new Provider();
		this.masterProvider = this.provider.getMasterProvider("mainnet");
		this.workerProviders = this.provider.getWorkerProviders("mainnet");
	}

	createLoginWindow() {
		this.loginWindow = new browserWindow({width:566,height:400,show:false,resizable:false});
		this.loginWindow.loadURL(loginUrl);
		this.loginWindow.once('ready-to-show',()=>{
			this.loginWindow.show();
			this.loginWindow.webContents.send('provider',conf.defaultProvider);
		});
		this.loginWindow.on('closed',()=> {
			this.loginWindow = null;				
		});
	}

	test() {
		logger.info(this.masterProvider);
		logger.info(this.workerProviders);
	}

	start() {

		const isSecondInstance = app.makeSingleInstance((commandLine, workingDirectory) => {
		  	// Someone tried to run a second instance, we should focus our window.
			if (this.loginWindow) {
			    if (this.loginWindow.isMinimized()) {
			    	this.loginWindow.restore();
			    }  	
			    this.loginWindow.focus();
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
	}

}

module.exports = App;