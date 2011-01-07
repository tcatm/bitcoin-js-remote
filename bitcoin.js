/*
 * Copyright (c) 2010 Nils Schneider
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

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
						},
					error:
						 function(req, textStatus, error) {
							var data;
							try  {
								if (!req.responseText)
									throw "no responseText";

								data = jQuery.parseJSON(req.responseText);
							} catch (err) {
								data = {result: null, error: {code: req.status}};

								if (data.error.code === 0) 
									data.error.message = "RPC not found";
								else {
									if (req.statusText)
										data.error.message = req.statusText;
									else
										data.error.message = data.error.code.toString();
								}
							}

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
