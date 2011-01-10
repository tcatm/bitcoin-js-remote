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

	this.bitcoin = false;
	this.balance;
	this.connected = false;
	this.refreshTimeout = false;
	this.refreshInterval = 5000;
	this.hashchangeTimeout;

	this.generateConfirm = 120;
	this.dateFormat = "dd/mm/yyyy HH:MM";

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
			var width = $(window).width();
			var height = $(window).height();
			var size = Math.min(width, height, 540);
			var QRurl = 'https://chart.googleapis.com/chart?chs=' + size + 'x' + size + '&cht=qr&chl=' + address + '&choe=UTF-8';
			this.showFullscreenObj($('<img src="' + QRurl + '" />'));
		} else {
			this.error("No address found!");
		}
	}

	this.parseRequest = function(request) {
		if (request.action)
			switch (request.action) {
				case "sendtoaddress":
					setFormValue($('form#sendBTC'), "address", request.data);
					$('#section_SendBTC').next().show();
					break;
			}
	}

	this.setTitle = function(title) {
		$('#title').text(title);
		document.title = title;
	}

	this.onDisconnect = function(hideSettings) {
		app.connected = false;
		app.setTitle("Bitcoin (not connected)");

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

		app.clearAccounts();
		app.clearAccountInfo();
	}

	this.clearAccountInfo = function() {
		clearTimeout(this.refreshTimeout);

		$('#currentAccount').text('(no account)');
		$('#balance').text('');
		$('#address').text('');
		app.balance = false;
		app.clearTransactions();
	}

	this.onGetInfo = function(info) {
		var serverInfo = $('#serverInfo table');

		serverInfo.children().remove();

		for (var key in info) {
			serverInfo.append('<tr><td>' + key.capitalize() + '</td><td class="right">' + info[key] + '</td></tr>');
		}
		$('#serverInfo tr:odd').addClass('odd');
	}

	this.onSendBTC = function(result, error) {
		if(error != null) {
			app.error(error.message);
			return;
		}
		var obj;
		obj	= setFormValue($('form#sendBTC'), "address", "");
		hideValidation(obj);

		obj = setFormValue($('form#sendBTC'), "amount", "");
		hideValidation(obj);

		app.notify("Bitcoins sent");
		app.refreshAll();
	}

	this.onValidateAddressField = function(result) {
		var field = $('form#sendBTC input[name="address"]')

		if(result.isvalid && field.val() == result.address)
			showValidation(field, true);
		else
			showValidation(field, false);
	}

	this.onListAccounts = function(accounts) {
		for (var account in accounts) {
			var balance = accounts[account];

			var row = $('#accountList tbody').children('tr[name="' + account + '"]');

			if (row.length == 0) {
				row = $('<tr></tr>');

				var html ='<td class="left">' + account.prettyAccount() + '</td>';
					html += '<td></td>';

				row.append(html);

				row.attr('name', account);
				row.click( function() {
							app.selectAccount($(this).attr('name'));
						})

				$('#accountList tbody').append(row);
			}

			app.updateAccountRow(row, balance);
		}
	}

	this.updateAccountRow = function(row, balance) {
		var balanceClass = "";
		if(balance != 0)
			balanceClass = (balance<0?'debit':'credit');

		row.children('td:last-child').removeClass().addClass("right").addClass(balanceClass).text(balance.formatBTC());
	}

	this.onListTransactions = function(rawtxlist) {
		var start = new Date().getTime();

		var transactions = new Array();

		for (var key in rawtxlist)
			if (rawtxlist[key].account == app.bitcoin.settings.account) {
				if (rawtxlist[key].time == undefined)
					rawtxlist[key].time = 0;

				transactions.push(rawtxlist[key]);
			}

		transactions.sort(sortTransactions);

		var txlistContainer = $('#txlist');

		if(txlistContainer.children('tbody').length == 0)
			txlistContainer.append('<tbody />');

		var txlist = txlistContainer.children('tbody');

		txlist.children('#txlistempty').remove();

		if (transactions.length == 0)
			txlist.append('<tr id="txlistempty"><td colspan="4" class="center">no transactions</td></tr>');

		for (var key in transactions)
			app.processTransaction(txlist, transactions[key]);

		$('#txlist tbody tr:not(.txinfo):odd').addClass('odd').next('.txinfo').addClass('odd');
		$('#txlist tbody tr:not(.txinfo):even').removeClass('odd').next('.txinfo').removeClass('odd');

		var end = new Date().getTime();
		var time = end - start;
		var newInterval = time * 10;

		/* adjust refresh interval within 1..10 seconds depending
		 * processing time of txlist
		 */

		app.refreshInterval = Math.min(Math.max(newInterval, 1000), 10000);
	}

	this.clearAccounts = function() {
		$('#accountList tbody').children().remove();
	}

	this.clearTransactions = function() {
		$('#txlist tbody').children().remove();
	}

	this.processTransaction = function(txlist, tx) {
		if (tx.txid == undefined)
			tx.id = (tx.time + tx.amount + tx.otheraccount).replace(/ /g,'');
		else
			tx.id = tx.txid;

		tx.id += tx.category;

		var txrow = $(document.getElementById(tx.id));

		if (txrow.length == 0) {
			txrow = $('<tr id="' + tx.id + '"></tr>');
			txlist.prepend(txrow);
			var txdiv = $('<tr colspan="4" class="txinfo"><td colspan="4"><div style="display: none"></div></td></tr>');
			txrow.after(txdiv);

			txrow.click( function() {
					$(this).next('tr.txinfo').children('td').children('div').slideToggle('fast');
				});
		}

		var checksum = tx.id + tx.confirmations + tx.time;

		/* Only update TX if it differs from current one */
		if(txrow.attr('checksum') != checksum) {
			txrow.attr('checksum', checksum);
			txrow.html(this.txRowHTML(tx));

			txrow.next('tr.txinfo').children('td').children('div').html(this.txInfoHTML(tx));

			if (tx.confirmations == 0 || (tx.category == "generate" && tx.confirmations < this.generateConfirm))
				txrow.addClass("unconfirmed");
			else
				txrow.removeClass("unconfirmed");
		}
	}

	this.txInfoHTML = function(tx) {
		var html = "";
		var extra = "";

		switch (tx.category) {
			case "generate":
				html += "<label>Generated coins</label><br/>";
				break;
			case "move":
				html += "<label>Moved " + (tx.amount<0?"to":"from") + ":</label> " + tx.otheraccount.prettyAccount() + "<br/>";
				break;
			case "send":
				if (tx.to)
					extra = " (" + tx.to + ")";
				html += "<label>Sent to:</label> " + tx.address + extra + "<br/>";
				break;
			case "receive":
				if (tx.from)
					extra = " (" + tx.from + ")";
				html += "<label>Received on:</label> " + tx.address + extra + "<br/>";
				break;
			default:
				html += "<label>Category:</label> " + tx.category + "<br/>";
		}

		if(tx.confirmations != undefined) html += "<label>Confirmations:</label> " + tx.confirmations + "<br/>";
		if(tx.fee != undefined) html += "<label>Fee:</label> " + tx.fee.formatBTC() + "<br/>";
		if(tx.comment != "" && tx.comment != undefined) html += "<label>Comment:</label> " + tx.comment + "<br/>";

		return html;
	}

	this.txRowHTML = function(tx) {
		var confirmations = tx.confirmations<10?tx.confirmations:'&#x2713;';

		if (tx.category == "generate")
			confirmations = tx.confirmations<this.generateConfirm?'&#x2717':'&#x2713';

		var timestamp = new Date();
		timestamp.setTime (tx.time * 1000);

		var info = tx.category.capitalize();

		if (tx.category == 'send')
			if (tx.to)
				info = tx.to;
			else
				info = tx.address;

		if (tx.category == 'receive')
			if (tx.from)
				info = tx.from;
			else
				info = tx.address;

		if (tx.comment)
			info += " (" + tx.comment + ")";

		if (tx.category == 'move')
			info = (tx.amount<0?"to ":"from ") + tx.otheraccount.prettyAccount();

		var amountClass = (tx.amount<0?'debit':'credit');

		var html = '<td class="center">' + confirmations + '</td>';
		html += '<td>' + timestamp.format(this.dateFormat) + '</td>';
		html += '<td class="info">' + info + '</td>';
		html += '<td class="' + amountClass + ' right">' + tx.amount.formatBTC(true) + '</td>';

		var txitem = $(html);

		return txitem;
	}

	this.refreshAll = function() {
		clearTimeout(this.refreshTimeout);

		if(!this.connected) {
			return;
		}

		this.refreshServerInfo();
		this.refreshBalance();
		this.refreshTransactions();
		this.refreshAddress();
		this.refreshAccounts();

		this.refreshTimeout = setTimeout("app.refreshAll();", this.refreshInterval);
	}

	this.refreshServerInfo = function() {
		this.bitcoin.getInfo(this.onGetInfo);
	}

	this.refreshAccounts = function() {
		this.bitcoin.listAccounts(this.onListAccounts);
	}

	this.refreshTransactions = function() {
		this.bitcoin.listTransactions(this.onListTransactions);
	}

	this.refreshBalance = function() {
		function next(balance) {
			$('#balance').text(balance.formatBTC());
			$('#currentAccount').text(app.bitcoin.settings.account.prettyAccount());
			this.balance = balance;
		}

		this.bitcoin.getBalance(next.proxy(this));
	}

	this.refreshAddress = function() {
		function next(address) {
			var addressField = $('#address');
			if(addressField.text() != address)
				$('#address').text(address);
		}

		this.bitcoin.getAddress(next.proxy(this));
	}

	this.selectAccount = function(account) {
		this.clearAccountInfo();
		this.bitcoin.selectAccount(account);
		if (this.connected)
			this.refreshAll();
	}

	this.connect = function(url, user, pass, account) {
		function next(info, error, request) {
			if (error == null) {
				app.connected = true;

				var sNetwork = "Bitcoin";

				if(info.testnet)
					sNetwork = "Testnet";

				var href = new URI(window.location.href);
				var rpcurl = new URI(app.bitcoin.settings.url).resolve(href);

				app.setTitle(sNetwork + " on " + rpcurl.authority);

				app.refreshAll();

				$('#section_Settings').next().slideUp('fast');
				$('#addressBox').show();
				$('#section_Accounts').show();
				$('#section_SendBTC').show();
				$('#section_TX').show().next().show();
				$('#serverInfo').show();

				if (request)
					app.parseRequest(request);

			} else {
				app.error(error.message);
			}
		}

		this.onDisconnect(url.settings?true:false);

		/* url might contain query with settings and request */
		if (url.settings) {
			this.bitcoin = new Bitcoin(url.settings);
			this.bitcoin.getInfo(next.proxy(this), url.request);
		} else {
			this.bitcoin = new Bitcoin({url: url}, user, pass);
			this.selectAccount(account);
			this.bitcoin.getInfo(next.proxy(this));
		}
	}

	this.error = function(msg) {
		$(window).humanMsg(msg);
	}

	this.notify = function(msg) {
		$(window).humanMsg(msg);
	}

	this.sendBTC = function(address, amount) {
		if(!this.connected) {
			return this.error("Not connected!");
		}

		if(address === "") {
			return this.error("Invalid bitcoin address");
		}

		amount = Math.round(amount*100)/100;
		var confString = "Send " + amount.formatBTC() + " to " + address + "?";

		if(confirm(confString)) {
			app.bitcoin.sendBTC(this.onSendBTC, address, amount);
		}
	}

	this.addPrototypes = function() {
		Function.prototype.proxy = function(obj) {
		    return $.proxy(this, obj);
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
		var obj = {settings: app.bitcoin.settings, request: request};
		return jQuery.base64_encode(JSON.stringify(obj));
	}

	this.scanQR = function(request) {
		var request = {request: request};
		var url = window.location.href.split('#')[0];
		var ret = url + "%23" + jQuery.base64_encode(JSON.stringify(request)) + "/";
		var scanurl = "http://zxing.appspot.com/scan?ret=" + ret + "{CODE}";

		this.detectHashchange();

		window.location = scanurl;
	}

	this.detectHashchange = function(oldhash) {
		clearTimeout(this.hashchangeTimeout);

		var hash = window.location.hash.substring(1);

		if (oldhash != undefined)
			if (oldhash != hash) {
				this.parseHash(hash);
				return;
			}

		this.hashchangeTimeout = setTimeout('app.detectHashchange("'+ hash +'");', 500);
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

		var hash = hash.split('/');

		try {
			query = JSON.parse(jQuery.base64_decode(hash[0]));
		} catch (err) {
			query = undefined;
		}

		if (query && hash[1]) {
			if (!query.request)
				query['request'] = {}

			query.request.data = hash[1];
		}

		/* remove locationhash as it might contain passwords */
		window.location.hash = "";

		if (query)
			if (query.settings) {
				this.connect(query);
				return true;
			} else if (query.request) {
				this.parseRequest(query.request);
			}

		return false;
	}

	this.init = function() {
		this.addPrototypes();
		$('#version').text(this.version);

		var query;

		var hash = window.location.hash.substring(1);

		var ret = this.parseHash(hash);

		var href = new URI(window.location.href);

		/* If using SSL try to connect to the same host */
		if (href.scheme == "https")
			setFormValue($('form#settingsServer'), "url", "/");


		if(!this.connected && !ret) {
			this.onDisconnect();

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
					app.scanQR({action: "sendtoaddress"});
					return false;
				});

		$('#QRbutton').click( function() {
					app.showQRAddress();
					return false;
				});

		$('#disconnectButton').click( function() {
					app.onDisconnect();
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

		$('form#sendBTC input[name="address"]').change( function() {
					if($(this).val() === "") {
						hideValidation(this);
						return;
					}

					var address = $(this).val();

					app.bitcoin.validateAddress(app.onValidateAddressField, address);
				});

		$('form#sendBTC input[name="amount"]').change( function() {
					if($(this).val() === "") {
						hideValidation(this);
						return;
					}

					var amount = $(this).val();

					if(amount > 0 && amount <= app.balance)
						showValidation(this, true);
					else
						showValidation(this, false);
				});

		$('form#sendBTC').submit( function() {
					var address = getFormValue(this, "address");
					var amount = getFormValue(this, "amount");

					app.sendBTC(address, amount);
					return false;
				});
	}
}
