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
	};

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

function formatBTC(btc, addSign) {
	if(addSign)
		btc = Math.abs(btc);

	var nf = new NumberFormat(btc);
	nf.setPlaces(2);
	nf.setCurrency(true);
	nf.setCurrencyValue(" BTC");
	nf.setCurrencyPosition(nf.RIGHT_OUTSIDE);

	var s = nf.toFormatted();

	if(addSign) {
		var sign;
		if(btc > 0) {
			sign = "+";
		} else if(btc < 0) {
			sign = "-";
		}
		s = sign + s;
	}

	return s;
}

function setFormValue(form, name, value) {
	$(form).children('input[name="' + name + '"]').val(value);
}

function getFormValue(form, name) {
	return $(form).children('input[name="' + name + '"]').val();
}

function sortTransactions(a, b) {
	if(b.time != a.time) 
		return (b.time - a.time);

	if(b.category != a.category)
		return (a.category < b.category) ? -1 : 1;

	return (a.amount - b.amount);
}

/* Because of the way JSONP works this codes assumes a global 
 * variable named 'app' pointing to the BitcoinApp() instance!
 *
 * <script type="text/javascript">
 *     var app = new BitcoinApp();
 *     app.init();
 * </script>
 */

function BitcoinApp() {
	this.bitcoin = false;
	this.account = "";
	this.connected = false;
	this.refreshTimeout = false;
	this.dateFormat = "dd/mm/yyyy HH:MM";

	this.onGetBalance = function(balance) {
		$('#balance').text(formatBTC(balance));
	}

	this.onGetAddress = function(address) {
		var addressField = $('#address');
		if(addressField.text() != address)
			$('#address').text(address);
	}

	this.onConnect = function(info) {
		if(info.version) {
			app.connected = true;

			app.refreshAccount();

			$('#section_Settings').next().slideUp('fast');
			$('#accountInfo').slideDown('fast');
			$('#section_SendBTC').show();
			$('#section_TX').show().next().show();
			$('#serverInfo').show();
		}
	}

	this.onDisconnect = function() {
		app.connected = false;

		$('#title').text("Bitcoin (not connected)");
		$('#accountInfo').slideUp('fast');
		$('#serverInfo').hide();
		$('#serverInfo table').children().remove();
		$('#section_SendBTC').hide().next().hide();
		$('#section_TX').hide().next().hide();
		$('#section_Settings').next().show();

		app.clearTransactions();
	}

	this.onGetInfo = function(info) {
		var sNetwork = "Bitcoin";
		if(info.testnet) {
			sNetwork = "Testnet";
		}

		$('#title').text(sNetwork + " on " + app.bitcoin.RPCHost);

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
		setFormValue($('form#sendBTC'), "address", "");
		setFormValue($('form#sendBTC'), "amount", "");
		app.notify("Bitcoins sent");
		app.refreshAccount();
	};

	this.onListTransactions = function(transactions) {
		for (var key in transactions) 
			if (transactions[key].time == undefined)
				transactions[key].time = 0;

		transactions.sort(sortTransactions);

		app.clearTransactions();

		var txlistContainer = $('#txlist');

		if(txlistContainer.children('tbody').length == 0) 
			txlistContainer.append('<tbody />');

		var txlist = txlistContainer.children('tbody');


		for (var key in transactions) 
			app.addTransaction(txlist, transactions[key]);

		$('#txlist tbody tr:odd').addClass('odd');
	}

	this.clearTransactions = function() {
		$('#txlist tbody').children().remove();
	}

	this.addTransaction = function(txlist, tx) {
		var rowClass = tx.confirmations==0?' class="unconfirmed"':'';
		var confirmations = tx.confirmations<10?tx.confirmations:'&#x2713;';

		var timestamp = new Date();
		timestamp.setTime (tx.time * 1000);

		var info = tx.category.capitalize();
		var html = '<tr' + rowClass + '><td class="center">' + confirmations + '</td><td>' + timestamp.format(this.dateFormat) + '</td><td>' + info + '</td><td class="' + (tx.amount<0?'debit':'credit') + ' right">' + formatBTC(tx.amount, true) + '</td></tr>';

		txlist.append(html);
	}

	this.refreshAccount = function() {
		clearTimeout(this.refreshTimeout);

		if(!this.connected) {
			return;
		}

		this.refreshServerInfo();
		this.refreshBalance();
		this.refreshTransactions();
		this.refreshAddress();

		this.refreshTimeout = setTimeout("app.refreshAccount();", 1000);
	};

	this.refreshServerInfo = function() {
		this.bitcoin.getInfo();
	};

	this.refreshTransactions = function() {
		this.bitcoin.listTransactions(this.account);
	};

	this.refreshBalance = function() {
		this.bitcoin.getBalance(this.account);
	};

	this.refreshAddress = function() {
		this.bitcoin.getAddress(this.account);
	};

	this.connect = function(host, port, user, pass) {
		this.onDisconnect();
		this.notify("Connecting");
		this.bitcoin = new Bitcoin(this, host, port, user, pass);
		this.bitcoin.init();
		this.bitcoin.connect();
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
		var confString = "Send " + formatBTC(amount) + " to " + address + "?";

		if(confirm(confString)) {
			app.bitcoin.sendBTC(this.account, '"' + address + '"', amount);
		}
	}

	this.init = function() {
		if(!this.connected) {
			$('#accountInfo').hide();

			$.getJSON('settings.json', function(data) {
						if(data) {
							var form = $('form#settingsServer');
							setFormValue(form, "host", data.host);
							setFormValue(form, "port", data.port);
							setFormValue(form, "user", data.user);
							setFormValue(form, "pass", data.pass);
						}
					});
			this.onDisconnect();
		}

		String.prototype.capitalize = function() {
			    return this.charAt(0).toUpperCase() + this.slice(1);
		}

		var hostname = window.location.hostname;

		$('#disconnectButton').click( function() {
					app.onDisconnect();
					return false;
				});

		$('form#settingsServer').submit( function() {
					var host = getFormValue(this, "host");
					var port = getFormValue(this, "port");
					var user = getFormValue(this, "user");
					var pass = getFormValue(this, "pass");
					app.connect(host, port, user, pass);
					return false;
				});

		$('form#sendBTC').submit( function() {
					var address = getFormValue(this, "address");
					var amount = getFormValue(this, "amount");

					app.sendBTC(address, amount);
					return false;
				});
	};
}
