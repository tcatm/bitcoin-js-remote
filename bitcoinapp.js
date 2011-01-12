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

function BitcoinApp() {
	this.version = "0.1";

	/* hack to allow event handlers to find us */
	var app = this;

	this.bitcoin = new Bitcoin();
	this.balance;
	this.connected = false;
	this.refreshTimeout = 30000;
	this.refreshTimer = false;
	this.refreshInterval = 5000;
	this.hashchangeTimeout;
	this.lastGetInfo;

	this.dateFormat = "dd/mm/yyyy HH:MM";

	this.accountlist = new AccountList($("#accountList tbody"), this);
	this.txlist = new TXList($("#txlist tbody"), this, {generateConfirm: 120});
	this.sendbtc = new SendBTC($("#sendBTC"), this);

	this.setRefreshInterval = function(interval) {
		/* limit interval to 1 .. 10 s */
		this.refreshInterval = Math.min(Math.max(interval * 10, 1000), 10000);
	}

	this.showFullscreenObj = function(obj) {
		var width = $(window).width();
		var height = $(window).height();
		var box = $('<div/>');
		var innerBox = $('<div/>');
		box.width(width);
		box.height(height);
		box.css('position', 'absolute');
		box.css('top', 0);
		box.css('left', 0);
		box.css('background', 'white');

		innerBox.width(width);
		innerBox.height(height);
		innerBox.css('display', 'table-cell');
		innerBox.css('text-align', 'center');
		innerBox.css('vertical-align', 'middle');

		innerBox.append(obj);

		box.append(innerBox);

		box.click( function() {
					$(this).remove();
				});

		$('body').append(box);
	}

	this.showQRAddress = function() {
		var address = $('#address').text();
		if (address != "") {
			var uri = "bitcoin:" + address;
			var width = $(window).width();
			var height = $(window).height();
			var size = Math.min(width, height, 540);
			var QRurl = 'https://chart.googleapis.com/chart?chs=' + size + 'x' + size + '&cht=qr&chl=' + uri + '&choe=UTF-8';
			this.showFullscreenObj($('<img src="' + QRurl + '" />'));
		} else {
			this.warning("No address found!");
		}
	}

	this.requestValidAddress = function(result, error, request) {
		if (result.isvalid) {
			this.notify("Found valid address");
			this.sendbtc.fillAndShowForm({address: result.address});
			return;
		}

		this.warning("Could not parse request: " + request);
	}

	this.injectQR = function(qr) {
		this.parseRequest({data: qr});
	}

	this.parseRequest = function(request) {
		if (request.data) {
			var uri = new URI(request.data);

			/* no scheme, let's see if it's a valid address */
			if (!uri.scheme)
				this.bitcoin.validateAddress(this.requestValidAddress.proxy(this), request.data, request.data);
			else if (uri.scheme == 'bitcoin')
				this.bitcoin.validateAddress(this.parseBitcoinScheme.proxy(this), uri.path.split('/', 1)[0], uri);
			else
				this.notify("Unknown URN scheme " + uri.scheme);
		}
	}

	this.parseBitcoinScheme = function(result, error, uri) {
		if (!error && result.isvalid) {
			var context = { address: result.address };

			try {
				var query = uri.query_form();
			} catch (err) {
				var query = null;
			}

			if (query) {
				if (query.amount)
					try {
						context.amount = this.parseAmount(query.amount) / 1e8;
					} catch (err) {
					}

				if (query.label)
					context.payee = query.label;

				if (query.message)
					context.comment = query.message;
			}

			if (context.address && context.amount)
				this.sendbtc.sendBTC(context);
			else {
				this.notify("Found valid address");
				this.sendbtc.fillAndShowForm(context);
			}

		} else {
			this.warning("No valid address found");
		}
	}

	/* parseAmount from luke-jr */
	this.parseAmount = function(txt) {
		var reAmount = /^(([\d.]+)(X(\d+))?|x([\da-f]*)(\.([\da-f]*))?(X([\da-f]+))?)$/i;
		var m = txt.match(reAmount);
		return m[5] ? (
			(
				parseInt(m[5], 16) +
				(m[7] ? (parseInt(m[7], 16) * Math.pow(16, -(m[7].length))) : 0)
			) * (
				m[9] ? Math.pow(16, parseInt(m[9], 16)) : 1e8
			)
		) : (
				m[2]
			*
				(m[4] ? Math.pow(10, m[4]) : 1e8)
		);
	}

	this.setTitle = function(title) {
		$('#title').text(title);
		document.title = title;
	}

	this.disconnect = function(hideSettings) {
		this.bitcoin.abortAll();

		this.connected = false;
		this.setTitle("Bitcoin (not connected)");

		$('#addressBox').hide();
		$('#serverInfo').hide();
		$('#serverInfo table').children().remove();
		$('#section_SendBTC').hide().next().hide();
		$('#section_TX').hide().next().hide();
		$('#section_Accounts').hide().next().hide();

		if (hideSettings) {
			$('#section_Settings').next().hide();
		} else {
			$('#section_Settings').next().show();
		}

		this.accountlist.clear();
		this.clearAccountInfo();
	}

	this.clearAccountInfo = function() {
		clearTimeout(this.refreshTimer);

		$('#currentAccount').text('(no account)');
		$('#balance').text('');
		$('#address').text('');
		this.balance = false;
		this.txlist.clear();
	}

	this.refreshAll = function() {
		clearTimeout(this.refreshTimer);

		if(!this.connected) {
			return;
		}

		var timeout = new Date().getTime() - this.lastGetInfo;
		if (timeout > this.refreshTimeout)
			this.error("Connection lost (timeout)");

		if (this.bitcoin.requestsPending() == 0) {
			this.refreshBalance();
			this.refreshAddress();
			this.txlist.refresh();
			this.accountlist.refresh();
			this.refreshServerInfo();
		}

		this.refreshTimer = setTimeout(this.refreshAll.proxy(this), this.refreshInterval);
	}

	this.refreshServerInfo = function() {
		function next(info, error) {
			if (error)
				return;

			this.lastGetInfo = new Date().getTime();

			var serverInfo = $('#serverInfo table');

			serverInfo.children().remove();

			for (var key in info) {
				serverInfo.append('<tr><td>' + key.capitalize() + '</td><td class="right">' + info[key] + '</td></tr>');
			}
			$('#serverInfo tr:odd').addClass('odd');

		}

		this.bitcoin.getInfo(next.proxy(this));
	}

	this.refreshBalance = function() {
		function next(balance, error) {
			if (error)
				return;

			$('#balance').text(balance.formatBTC());
			$('#currentAccount').text(this.bitcoin.settings.account.prettyAccount());
			this.balance = balance;
		}

		this.bitcoin.getBalance(next.proxy(this));
	}

	this.refreshAddress = function() {
		function next(address, error) {
			if (error)
				return;

			var addressField = $('#address');
			if(addressField.text() != address)
				$('#address').text(address);
		}

		this.bitcoin.getAddress(next.proxy(this));
	}

	this.selectAccount = function(account) {
		this.clearAccountInfo();
		this.bitcoin.selectAccount(account);
		if (this.connected) {
			this.bitcoin.abortAll();
			this.refreshAll();
		}
	}

	this.connect = function(url, user, pass, account) {
		function next(info, error, request) {
			if (info != null) {
				if (info.version < 31902) {
					this.error("Bitcoin Version >= 31902 required (Found " + info.version + ")");
					return;
				}

				this.connected = true;
				this.lastGetInfo = undefined;

				this.sendbtc.reset();

				var sNetwork = "Bitcoin";

				if(info.testnet)
					sNetwork = "Testnet";

				var href = new URI(window.location.href);
				var rpcurl = new URI(this.bitcoin.settings.url).resolve(href);

				this.setTitle(sNetwork + " on " + rpcurl.authority);

				this.refreshAll();

				$('#section_Settings').next().slideUp('fast');
				$('#addressBox').show();
				$('#section_Accounts').show();
				$('#section_SendBTC').show();
				$('#section_TX').show().next().show();
				$('#serverInfo').show();

				if (request)
					this.parseRequest(request);

			} else {
				this.error(error.message);
			}
		}

		this.disconnect(url.settings?true:false);

		/* url might contain query with settings and request */
		if (url.settings) {
			this.bitcoin.setup(url.settings);
			this.bitcoin.getInfo(next.proxy(this), url.request);
		} else {
			this.bitcoin.setup({url: url, account: account}, user, pass);
			this.bitcoin.getInfo(next.proxy(this));
		}
	}

	this.error = function(msg) {
		this.disconnect();
		$(window).humanMsg({message: msg, autoHide: 0});
	}

	this.warning = function(msg) {
		$(window).humanMsg({message: msg, autoHide: 0});
	}

	this.notify = function(msg) {
		$(window).humanMsg(msg);
	}

	this.addPrototypes = function() {
		Function.prototype.proxy = function(context) {
			return $.proxy(this, context);
		}

		String.prototype.capitalize = function() {
			return this.charAt(0).toUpperCase() + this.slice(1);
		}

		String.prototype.prettyAccount = function() {
			if (this == "")
				return "(default)";

			return this.toString();
		}

		Number.prototype.formatBTC = function(addSign) {
			var nf = new NumberFormat(this);
			nf.setPlaces(2);
			nf.setCurrency(true);
			nf.setCurrencyValue(" BTC");
			nf.setCurrencyPosition(nf.RIGHT_OUTSIDE);

			var s = nf.toFormatted();

			if(addSign && this > 0)
				s = "+" + s;

			return s;
		}
	}

	this.serializeSettings = function(request) {
		var obj = {settings: this.bitcoin.settings, request: request};
		return jQuery.base64_encode(JSON.stringify(obj));
	}

	this.prepareHash = function(request) {
		return "%23" + this.serializeSettings() + "/";
	}

	this.scanQR = function() {
		var url = window.location.href.split('#')[0];
		var scanurl = "http://zxing.appspot.com/scan?ret=" + url + this.prepareHash() + "{CODE}";
		//var scanurl = "http://zxing.appspot.com/scan?ret=" + url + "%23/{CODE}";

		this.detectHashchange();

		window.location = scanurl;
	}

	this.detectHashchange = function() {
		clearTimeout(this.hashchangeTimeout);

		var hash = this.getLocationHash();

		if (hash != "" ) {
				this.parseHash(hash);
				return;
		}

		this.hashchangeTimeout = setTimeout(this.detectHashchange.proxy(this), 500);
	}

	this.getLocationHash = function () {
		var hash = window.location.hash.substring(1);

		/* remove locationhash as it might contain passwords */
		window.location.hash = "";

		return hash;
	}

	this.parseHash = function(hash) {
		/* This function parses the location hash. Format:
		 * #$base64json[/rawdata]
		 *
		 * $base64json is parsed into query and should contain
		 * settings and an optional request (created by serializeSettings())
		 *
		 * Optional rawData will be stored in query.request.data
		 */

		var parts = hash.split('/');

		var first = parts.shift();
		var second = parts.join('/');

		try {
			query = JSON.parse(jQuery.base64_decode(first));
		} catch (err) {
			query = {};
		}

		if (second) {
			if (!query.request)
				query['request'] = {}

			query.request.data = second;
		}

		if (query) {
			if (!this.connected && query.settings) {
				this.connect(query);
				return true;
			} else if (query.request) {
				this.parseRequest(query.request);
			}
		}

		return false;
	}

	this.init = function() {
		this.addPrototypes();
		$('#version').text(this.version);

		var query;

		var hash = this.parseHash(this.getLocationHash());

		var href = new URI(window.location.href);

		/* If using SSL try to connect to the same host */
		if (href.scheme == "https")
			setFormValue($('form#settingsServer'), "url", "/");


		if(!this.connected && !hash) {
			this.disconnect();

			$.getJSON('settings.json', function(data) {
						if(data) {
							var form = $('form#settingsServer');
							setFormValue(form, "url", data.url);
							setFormValue(form, "user", data.user);
							setFormValue(form, "pass", data.pass);
							setFormValue(form, "account", data.account);
						}
					});
		}

		var uagent = navigator.userAgent.toLowerCase();

		/* hide scanQRbutton on non-android platforms */
		if (uagent.search("android") <= -1)
			$('#scanQRbutton').hide();

		$('#scanQRbutton').click( function() {
					app.scanQR();
					return false;
				});

		$('#QRbutton').click( function() {
					app.showQRAddress();
					return false;
				});

		$('#disconnectButton').click( function() {
					app.disconnect();
					return false;
				});

		$('form#QRinject').submit( function() {
					var uri = getFormValue(this, "uri");
					this.reset();

					app.injectQR(uri);
					return false;
				});

		$('form#settingsServer').submit( function() {
					var url = getFormValue(this, "url");
					var user = getFormValue(this, "user");
					var pass = getFormValue(this, "pass");
					var account = getFormValue(this, "account");
					app.connect(url, user, pass, account);
					return false;
				});
	}
}
