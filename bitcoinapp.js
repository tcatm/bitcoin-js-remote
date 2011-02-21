/*
 * Copyright (c) 2010 Nils Schneider
 * Distributed under the MIT/X11 software license, see the accompanying
 * file license.txt or http://www.opensource.org/licenses/mit-license.php.
 */

function BitcoinApp() {
	this.version = "0.3.4";

	/* hack to allow event handlers to find us */
	var app = this;

	this.settings = {
		refreshTimeout: 30000,
		refreshInterval: 5000,
		useSlide: false,
		dateFormat: "dd/mm/yyyy HH:MM",
		labelsmode: false
	};

	this.bitcoin = new Bitcoin();
	this.balance = false;
	this.balance0 = false;
	this.connected = false;
	this.refreshTimer = false;
	this.hashchangeTimeout;
	this.lastGetInfo;

	this.accountlist = new AccountList($("#accountList"), this);
	this.txlist = new TXList($("#txlist tbody"), this, {generateConfirm: 120});
	this.sendbtc = new SendBTC($("#sendBTC"), this);

	this.dateFormat = function() {
		return this.settings.dateFormat;
	}

	this.useSlide = function() {
		return this.settings.useSlide;
	}

	this.setRefreshInterval = function(interval) {
		/* limit interval to 1 .. 10 s */
		this.settings.refreshInterval = Math.min(Math.max(interval, 1000), 10000);
	}

	this.showFullscreenObj = function(obj) {
		var width = $(window).width();
		var height = $(window).height();
		var box = $('<div/>');
		var innerBox = $('<div/>');
		box.width(width);
		box.height(height);
		box.css('position', 'fixed');
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

	this.showQRAddress = function(address, text) {
		if (address != "") {
			var uri = "bitcoin:" + address;
			var width = $(window).width();
			var height = $(window).height();
			var size = Math.min(width, height, 540);
			var QRurl = 'https://chart.googleapis.com/chart?chs=' + size + 'x' + size + '&cht=qr&chl=' + uri + '&choe=UTF-8';
			var html = '<img src="' + QRurl + '" />';
			if (text)
				html += '<label class="QRlabel">' + text + '</label>';
			this.showFullscreenObj($(html));
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
				m[9] ? Math.pow(16, parseInt(m[9], 16)) : 0x10000
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

	this.setBalance = function(balance) {
		$('#balance').text(balance.formatBTC());
		this.balance = balance;

		/* hack to update amount field validation */
		$('input[name="amount"]').change();
	}

	this.disconnect = function(ignoreSettings) {
		this.bitcoin.abortAll();

		this.connected = false;
		this.setTitle("Bitcoin (not connected)");

		$('#addressBox').hide();
		$('#serverInfo').hide();
		$('#serverInfo table').children().remove();
		$('#section_SendBTC').hide().next().hide();
		$('#section_TX').hide().next().hide();
		$('#section_Accounts').hide().next().hide();

		if (!ignoreSettings)
			$('#section_Settings').next().show();

		this.accountlist.clear();
		this.clearAccountInfo();
	}

	this.clearAccountInfo = function() {
		clearTimeout(this.refreshTimer);

		$('#currentAccount').text('(no account)');
		$('#balance').text('');
		$('#address').text('');
		this.balance = false;
		this.balance0 = false;
		this.txlist.clear();
	}

	this.refreshAll = function() {
		clearTimeout(this.refreshTimer);

		if(!this.connected) {
			return;
		}

		var timeout = new Date().getTime() - this.lastGetInfo;
		if (timeout > this.settings.refreshTimeout)
			this.error("Connection lost (timeout)");

		if (this.bitcoin.requestsPending() == 0) {
			this.refreshBalance();
			this.refreshAddress();
			this.accountlist.refresh();
			this.refreshServerInfo();
		}

		this.refreshTimer = setTimeout(this.refreshAll.proxy(this), this.settings.refreshInterval);
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
		function unconfirmed(balance, error) {
			if (error)
				return;

			if (this.balance0 != balance || this.balance0 === false)
				this.txlist.refresh();

			this.balance0 = balance;
		}

		this.bitcoin.getBalance(unconfirmed.proxy(this), 0);
	}

	this.refreshAddress = function() {
		function next(address, error) {
			if (error)
				return;

			if (address instanceof Array)
				address = address.pop();

			var addressField = $('#address');
			if(addressField.text() != address)
				$('#address').text(address);
		}

		if (this.settings.labelsmode) 
			this.bitcoin.getAddressByAccount(next.proxy(this), "");
		else
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

	this.account = function() {
		return this.bitcoin.settings.account;
	}

	this.connect = function(settings, request) {
		function next(info, error, request) {
			if (info != null) {
				if (info.version < 31902) {
					this.error("Bitcoin Version >= 31902 required (Found " + info.version + ")");
					return;
				}

				this.lastGetInfo = undefined;

				this.sendbtc.reset();

				var sNetwork = "Bitcoin";

				if(info.testnet)
					sNetwork = "Testnet";

				var href = new URI(window.location.href);
				var rpcurl = new URI(this.bitcoin.settings.url).resolve(href);

				this.setTitle(sNetwork + " on " + rpcurl.authority);

				/* select first account returned by listaccounts
				 * if no account was set in settings
				 */
				if (!settings.account)
					this.bitcoin.listAccounts(accountlist.proxy(this), request);
				else
					finish.proxy(this)(request);

			} else {
				this.error(error.message);
			}
		}

		function accountlist(accounts, error, request) {
			var keys = [];
			for(var i in accounts) {
				keys.push(i);
			}

			if (!this.settings.labelsmode) {
				this.selectAccount(keys[0]);
			} else {
				this.selectAccount("*");
			}

			finish.proxy(this)(request);
		}

		function finish(request) {
			this.connected = true;
			this.refreshAll();

			$('#section_Settings').next().hide();
			$('#addressBox').show();
			$('#section_Accounts').show();
			$('#section_SendBTC').show();
			$('#section_TX').show().next().show();
			$('#serverInfo').show();

			if (request)
				this.parseRequest(request);
		}

		this.disconnect(true);
		this.bitcoin.setup(settings);
		this.bitcoin.getInfo(next.proxy(this), request);
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

	this.serializeState = function(request) {
		var obj = {settings: this.bitcoin.settings, request: request};
		return window.btoa(JSON.stringify(obj));
	}

	this.prepareHash = function(request) {
		return "%23" + this.serializeState() + "/";
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
			query = JSON.parse(window.atob(first));
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
				this.connect(query.settings, query.request);
				return true;
			} else if (query.request) {
				this.parseRequest(query.request);
			}
		}

		return false;
	}

	this.loadSettings = function(settings) {
		for (var k in this.settings) {
			if (settings[k])
				this.settings[k] = settings[k];
		}

		if (settings.RPC)
			this.connect(settings.RPC);
	}

	this.init = function(settings) {
		this.addPrototypes();
		$('#version').text(this.version);

		var href = new URI(window.location.href);

		/* If using SSL try to connect to the same host */
		if (href.scheme == "https")
			setFormValue($('form#settingsServer'), "url", "/");

		if (settings)
			this.loadSettings(settings);

		if (!settings || !settings.RPC)
			$('#section_Settings').next().show();

		this.parseHash(this.getLocationHash());

		$('#scanQRbutton').click( function() {
					app.scanQR();
					return false;
				});

		$('#QRbutton').click( function() {
					app.showQRAddress($('#address').text());
					return false;
				});

		$('#disconnectButton').click( function() {
					app.disconnect();
					return false;
				});

		$('form#QRinject').submit( function() {
					var uri = $(this).children('input[name="uri"]');
					app.injectQR(uri.val());
					uri.blur()

					this.reset();
					return false;
				});

		$('form#settingsServer').submit( function() {
					var settings = {};
					settings.url = getFormValue(this, "url");
					settings.user = getFormValue(this, "user");
					settings.password = getFormValue(this, "pass");
					app.settings.labelsmode = getFormValue(this, "labelsmode");
					app.connect(settings);
					return false;
				});
	}

	var uagent = navigator.userAgent.toLowerCase();

	/* hide scanQRbutton on non-android platforms */
	if (uagent.search("android") <= -1) {
		this.settings.useSlide = true;
		$('#scanQRbutton').hide();
	}

	/* clean up UI */
	this.disconnect();
	$('#section_Settings').next().hide();
}
