function Bitcoin(host, port, user, pass) {
	this.RPCHost = host;
	this.RPCPort = port;
	this.RPCUser = user;
	this.RPCPass = pass;
	this.RPCURL;

	this.prepareURL = function() {
		var url = "http://";

		if(this.RPCUser) {
			url += this.RPCUser;
			if(this.RPCPass) {
				url += ":" + this.RPCPass;
			}
			url += "@";
		}

		url += this.RPCHost;

		if(this.RPCPort) {
			url += ":" + this.RPCPort;
		}

		url += "/?callback=?";

		return url;
	}

	this.RPC = function(method, params, callback) {
		var request;

		if(params != null) {
			for(var key in params) {
				params[key] = params[key];
			}
			request = {method: method, params: params};
		} else {
			request = {method: method};
		}

		jQuery.getJSON(this.RPCURL, request, function(data) {
					callback(data.result, data.error);
				});
	}

	this.listTransactions = function(callback, account) {
		this.RPC("listtransactions", ['"' + account + '"', 999999], callback);
	}

	this.validateAddress = function(callback, address) {
		this.RPC("validateaddress", ['"' + address + '"'], callback);
	}

	this.sendBTC = function(callback, account, address, amount) {
		this.RPC("sendfrom", ['"' + account + '"', address, amount], callback);
	}

	this.getAddress = function(callback, account) {
		this.RPC("getaccountaddress", ['"' + account + '"'], callback);
	}

	this.getBalance = function(callback, account) {
		this.RPC("getbalance", ['"' + account + '"'], callback);
	}

	this.getInfo = function(callback) {
		this.RPC("getinfo", null, callback);
	}

	this.init = function() {
		this.RPCURL = this.prepareURL();
	}
}
