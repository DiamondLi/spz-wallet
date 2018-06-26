'use strict'

const crypto = require('crypto');

class MD5Utils {

	constructor() {}

	encrypt(content) {
		let md5 = crypto.createHash('md5');
		md5.update(content);
		return md5.digest('hex'); 
	}
}

module.exports = MD5Utils;