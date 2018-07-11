/**
*  @version: v1.0.0
*  @author : 
*/
'use strict'

const xlsx = require('node-xlsx');
const fs = require('fs');

var gheaders = ['id','version','member_id','account_id','create_time',
	'auth_time','auditor_id','order_id','from_address','to_address',
	'num','miner_fee','fee','status','coin_id','coin_name','tx_hash',
	'result','token_address','remarks'];

class Excel {

	constructor(filename) {
		this.filename = filename;
		this.data = [];
	}

	/** read excel file and return the json object array */
	read() {
		try {
			/** 只考虑一个sheet的情况 */
			let obj = xlsx.parse(this.filename)[0];
			let sheet = obj.name;
			let user = obj.data[0];
			if(user.length !== gheaders.length) {
				throw "导入数据格式不正确";
			}
			for(let index1 = 0; index1 < user.length; index1++) {
				if(user[index1] !== gheaders[index1]) {
					throw "导入数据格式不正确";
				}
			}
			let length = obj.data.length - 1;
			for(let i = 0; i < length; i++) {
				let object = Object.create(null);
				let mod = obj.data[i+1];
				for(let j = 0; j < user.length; j++){
					let key = user[j];
					let value = mod[j];
					if(j == 0) {
						value = value + '';
					}
					object[key] = value;
				}
				this.data.push(object);
			}
			return this.data;
		} catch (err) {
			throw err;
		}
	}

	/** 将特定数据输出到文件 */
	write(outputfile,odata){
		let buffer = xlsx.build([{name: "sheet1", data: odata}]);;
		fs.writeFileSync(outputfile,buffer);
	}
} 

module.exports = Excel;

