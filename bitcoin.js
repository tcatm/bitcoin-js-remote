function Bitcoin(host, port, user, pass, account) {
	this.RPCHost = host;
	this.RPCPort = port;
	this.RPCAuth;
	this.RPCURL;

	this.account = "";

	this.prepareURL = function() {
		var url = "http://";

		url += this.RPCHost;

		if(this.RPCPort) {
			url += ":" + this.RPCPort;
		}

		return url;
	}

	this.prepareAuth = function(user, pass) {
		return "Basic " + jQuery.base64_encode(user + ":" + pass);
	}

	this.RPC = function(method, params, callback, context) {
		var request;
		var auth = this.RPCAuth;

		if(params != null) {
			request = {method: method, params: params};
		} else {
			request = {method: method};
		}

		jQuery.ajax({url: this.RPCURL, dataType: 'json', type: 'POST',
					contentType: 'application/json',
					data: JSON.stringify(request),
					timeout: 5000,
					beforeSend: function(req){
                		req.setRequestHeader("Authorization", auth);
					},
					success:
						 function(data) {
							callback(data.result, data.error, context);
						}
					});
	}

	this.listAccounts = function(callback, context) {
		this.RPC("listaccounts", null, callback, context);
	}

	this.listTransactions = function(callback, context) {
		this.RPC("listtransactions", [this.account, 999999], callback, context);
	}

	this.validateAddress = function(callback, address, context) {
		this.RPC("validateaddress", [address], callback, context);
	}

	this.sendBTC = function(callback, address, amount, context) {
		this.RPC("sendfrom", [this.account, address, amount], callback, context);
	}

	this.getAddress = function(callback, context) {
		this.RPC("getaccountaddress", [this.account], callback, context);
	}

	this.getBalance = function(callback, context) {
		this.RPC("getbalance", [this.account], callback, context);
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

	this.init = function(user, pass) {
		this.RPCURL = this.prepareURL();
		this.RPCAuth = this.prepareAuth(user, pass);
	}

	this.init(user, pass);
}
