function Bitcoin(host, port, user, pass, account) {
	this.RPCHost = host;
	this.RPCPort = port;
	this.RPCUser = user;
	this.RPCPass = pass;
	this.RPCURL;

	this.account = "";

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

	this.listAccounts = function(callback) {
		this.RPC("listaccounts", null, callback);
	}

	this.listTransactions = function(callback) {
		this.RPC("listtransactions", ['"' + this.account + '"', 999999], callback);
	}

	this.validateAddress = function(callback, address) {
		this.RPC("validateaddress", ['"' + address + '"'], callback);
	}

	this.sendBTC = function(callback, address, amount) {
		this.RPC("sendfrom", ['"' + this.account + '"', address, amount], callback);
	}

	this.getAddress = function(callback) {
		this.RPC("getaccountaddress", ['"' + this.account + '"'], callback);
	}

	this.getBalance = function(callback) {
		this.RPC("getbalance", ['"' + this.account + '"'], callback);
	}

	this.getInfo = function(callback) {
		this.RPC("getinfo", null, callback);
	}

	this.selectAccount = function(account) {
		if (account != undefined)
			this.account = account;
		else
			this.account = "";
	}

	this.init = function() {
		this.RPCURL = this.prepareURL();
	}
}
