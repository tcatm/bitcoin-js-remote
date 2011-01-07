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

	this.RPC = function(method, params, callback, context) {
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
					callback(data.result, data.error, context);
				});
	}

	this.listAccounts = function(callback, context) {
		this.RPC("listaccounts", null, callback, context);
	}

	this.listTransactions = function(callback, context) {
		this.RPC("listtransactions", ['"' + this.account + '"', 999999], callback, context);
	}

	this.validateAddress = function(callback, address, context) {
		this.RPC("validateaddress", ['"' + address + '"'], callback, context);
	}

	this.sendBTC = function(callback, address, amount, context) {
		this.RPC("sendfrom", ['"' + this.account + '"', address, amount], callback, context);
	}

	this.getAddress = function(callback, context) {
		this.RPC("getaccountaddress", ['"' + this.account + '"'], callback, context);
	}

	this.getBalance = function(callback, context) {
		this.RPC("getbalance", ['"' + this.account + '"'], callback, context);
	}

	this.getInfo = function(callback, context) {
		this.RPC("getinfo", null, callback, context);
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
