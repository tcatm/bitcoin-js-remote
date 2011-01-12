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

function Bitcoin() {
	this.settings = {url: null, auth: null, account: null};

	this.debug;
	this.ajaxRequests = new Array();
	this.log;

	this.prepareAuth = function(user, password) {
		return "Basic " + jQuery.base64_encode(user + ":" + password);
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

	this.listTransactions = function(callback, context) {
		this.RPC("listtransactions", [this.settings.account, 999999], callback, context);
	}

	this.validateAddress = function(callback, address, context) {
		this.RPC("validateaddress", [address], callback, context);
	}

	this.sendBTC = function(callback, context, callback_context) {
		this.RPC("sendfrom", [this.settings.account, context.address, context.amount, 1 /*minconf*/, context.comment, context.payee], callback, callback_context);
	}

	this.getAddress = function(callback, context) {
		this.RPC("getaccountaddress", [this.settings.account], callback, context);
	}

	this.getBalance = function(callback, context) {
		this.RPC("getbalance", [this.settings.account], callback, context);
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

	this.setup = function(settings, user, password) {
		this.settings = settings;

		if (this.settings.url == "")
			this.settings.url = window.location.href;

		if (!this.settings.auth && user && password)
			this.settings.auth = this.prepareAuth(user, password);
		
		this.selectAccount(settings.account);
	}
}
