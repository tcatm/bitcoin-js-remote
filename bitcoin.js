/*
 * Copyright (c) 2010 Nils Schneider
 * Distributed under the MIT/X11 software license, see the accompanying
 * file license.txt or http://www.opensource.org/licenses/mit-license.php.
 */

function Bitcoin() {
	this.settings;

	this.debug;
	this.ajaxRequests = new Array();
	this.log;

	this.prepareAuth = function(user, password) {
		return "Basic " + window.btoa(user + ":" + password);
	}

	this.RPC = function(method, params, callback, context) {
		var request;
		var auth = this.settings.auth;

		if(params != null) {
			request = {method: method, params: params};
		} else {
			request = {method: method};
		}

		var me = this;

		var req = jQuery.ajax({url: this.settings.url, dataType: 'json', type: 'POST',
					contentType: 'application/json',
					data: JSON.stringify(request),
					timeout: 15000,
					beforeSend: function(req){
						req.setRequestHeader("Authorization", auth);
					},
					success:
						 function(data, textStatus, req) {
							jQuery.proxy( function(req) {
								this.ajaxRequests = jQuery.grep(this.ajaxRequests, function (n, i) { return n.request != req; });		
								this.debugAJAX();
							}, me)(req);
							callback(data.result, data.error, context);
						},
					error:
						 function(req, textStatus, error) {
							jQuery.proxy( function(req) {
								this.ajaxRequests = jQuery.grep(this.ajaxRequests, function (n, i) { return n.request != req; });		
								this.debugAJAX();
							}, me)(req);
							var data;
							try  {
								if (!req.responseText)
									throw "no responseText";

								data = jQuery.parseJSON(req.responseText);
							} catch (err) {
								data = {result: null, error: {code: req.status}};

								if (data.error.code === 0 && !req.status) 
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
		this.ajaxRequests.push({request: req, data: request});
		this.debugAJAX();
	}

	this.requestsPending = function() {
		return this.ajaxRequests.length;
	}

	this.abortAll = function() {
		for (var key in this.ajaxRequests) {
			/* Try to abort, request might disappear while looping */
			try {
				var m = this.ajaxRequests[key].data.method;

				/* don't abort requests that manipulate bitcoins */
				if (m == "sendfrom" || m == "move")
				   	continue;

				this.ajaxRequests[key].request.abort();
			} catch (err) {
			}
		}
	}

	this.debugAJAX = function() {
		if (!this.debug) return;

		if (!this.log) {
			this.log = jQuery('<ul></ul>');
			this.log.css('position', 'absolute').css('top', 0).css('left', 0).css('color', 'black');
			jQuery('body').append(this.log);
		}

		this.log.children().remove();
		
		for (var key in this.ajaxRequests) {
			var item = jQuery('<li/>');
			item.html(key + " " + JSON.stringify(this.ajaxRequests[key].data));
			this.log.append(item);
		}	
	}

	this.listAccounts = function(callback, context) {
		this.RPC("listaccounts", null, callback, context);
	}

	this.listTransactions = function(callback, count, context) {
		this.RPC("listtransactions", [this.settings.account, count], callback, context);
	}

	this.validateAddress = function(callback, address, context) {
		this.RPC("validateaddress", [address], callback, context);
	}

	this.sendBTCToAddress = function(callback, context, callback_context) {
		this.RPC("sendtoaddress", [context.address, context.amount, context.comment, context.payee], callback, callback_context);
	}

	this.sendBTC = function(callback, context, callback_context) {
		this.RPC("sendfrom", [this.settings.account, context.address, context.amount, 1 /*minconf*/, context.comment, context.payee], callback, callback_context);
	}

	this.createAccount = function(callback, account, context) {
		this.RPC("getaccountaddress", [account], callback, context);
	}

	this.getAddress = function(callback, context) {
		this.RPC("getaccountaddress", [this.settings.account], callback, context);
	}

	this.getAddressByAccount = function(callback, account, context) {
		this.RPC("getaddressesbyaccount", [account], callback, context);
	}

	this.getBalance = function(callback, confirmations, context) {
		this.RPC("getbalance", [this.settings.account, confirmations], callback, context);
	}

	this.getInfo = function(callback, context) {
		this.RPC("getinfo", null, callback, context);
	}

	this.selectAccount = function(account) {
		if (account != undefined)
			this.settings.account = account;
		else
			this.settings.account = "";
	}

	this.setup = function(settings) {
		this.settings = {url: null, auth: null, account: null};

		for (var k in this.settings) {
			if (settings[k])
				this.settings[k] = settings[k];
		}

		if (this.settings.url == "")
			this.settings.url = window.location.href;

		if (!this.settings.auth)
			this.settings.auth = this.prepareAuth(settings.user, settings.password);
		
		this.selectAccount(settings.account);
	}
}
