function Bitcoin(app, host, port, user, pass) {
	this.app = app;

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

	this.listTransactions = function(account) {
		this.RPC("listtransactions", ['"' + account + '"', 999999], this.app.onListTransactions);
	}

	this.validateAddress = function(callback, address) {
		this.RPC("validateaddress", ['"' + address + '"'], callback);
	}

	this.sendBTC = function(account, address, amount) {
		this.RPC("sendfrom", ['"' + account + '"', address, amount], this.app.onSendBTC);
	}

	this.getAddress = function(account) {
		this.RPC("getaccountaddress", ['"' + account + '"'], this.app.onGetAddress);
	}

	this.getBalance = function(account) {
		this.RPC("getbalance", ['"' + account + '"'], this.app.onGetBalance);
	}

	this.getInfo = function() {
		this.RPC("getinfo", null, this.app.onGetInfo);
	}

	this.connect = function() {
		this.RPC("getinfo", null, this.app.onConnect);
	}

	this.init = function() {
		this.RPCURL = this.prepareURL();
	}
}
