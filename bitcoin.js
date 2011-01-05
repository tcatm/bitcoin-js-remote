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
				params[key] = '"' + params[key] + '"';
			}
			request = {method: method, params: params};
		} else {
			request = {method: method};
		}

		jQuery.getJSON(this.RPCURL, request, function(data) {
					callback(data.result);
				});
	}

	this.listTransactions = function(account) {
		this.RPC("listtransactions", [account], this.app.onListTransactions);
	}

	this.getBalance = function(account) {
		this.RPC("getbalance", [account], this.app.onGetBalance);
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

	this.init();
}

function formatBTC(btc, addSign) {
	var nf = new NumberFormat(Math.abs(btc));
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

function getFormValue(form, name) {
	return $(form).children('input[name="' + name + '"]').attr('value');
}

function sortTransactions(a, b) {
	return (b.time - a.time);
}

/* Because of the way JSONP works this codes assumes a global 
 * variable named 'app' pointing to the BitcoinApp() instance!
 *
 * <script type="text/javascript">
 *     var app = new BitcoinApp();
 * </script>
 */

function BitcoinApp() {
	this.bitcoin = false;
	this.account = "";

	this.onGetBalance = function(balance) {
		$('#balance').text(formatBTC(balance));
	}

	this.onConnect = function(info) {
		if(info.version) {
			$('#section_Settings').next().slideUp('fast');
			$('#accountInfo').slideDown('fast');
			app.onGetInfo(info);
			app.refreshAccount();
		}
	}

	this.onGetInfo = function(info) {
		var sNetwork = "Bitcoin";
		if(info.testnet) {
			sNetwork = "Testnet";
		}

		$('#title').text(sNetwork + " on " + app.bitcoin.RPCHost);

		var serverInfo = $('#serverInfo');

		serverInfo.children().remove();

		for (var key in info) {
			serverInfo.append('<tr><td>' + key.capitalize() + '</td><td class="right">' + info[key] + '</td></tr>');
		}
		$('#serverInfo tr:odd').addClass('odd');
	}

	this.onListTransactions = function(transactions) {
		transactions.sort(sortTransactions);

		var txlist = $('#txlist');

		txlist.children().remove();

		for (var key in transactions) {
			app.addTransaction(txlist, transactions[key]);
		}
		$('#serverInfo tr:odd').addClass('odd');
	}

	this.addTransaction = function(txlist, tx) {
		var rowClass = "";
		var confirmations = tx.confirmations;
		var timestamp = tx.time;
		var info = tx.category;
		var html = '<tr' + rowClass + '><td class="center">' + confirmations + '</td><td>' + timestamp + '</td><td>' + info + '<td><td class="' + (tx.amount<0?'debit':'credit') + ' right">' + formatBTC(tx.amount, true) + '</td></tr>';

		txlist.append(html);
	}

	this.refreshAccount = function() {
		this.refreshBalance();
		this.refreshTransactions();
	};

	this.refreshTransactions = function() {
		this.bitcoin.listTransactions(this.account);
	};

	this.refreshBalance = function() {
		this.bitcoin.getBalance(this.account);
	};

	this.connect = function(host, port, user, pass) {
		$('#title').text("Bitcoin (not connected)");
		$('#accountInfo').slideUp('fast');
		$('#serverInfo').children().remove();
		$('#txlist').children().remove();
		this.bitcoin = new Bitcoin(this, host, port, user, pass);
		this.bitcoin.connect();
	}

	this.init = function() {

		String.prototype.capitalize = function() {
			    return this.charAt(0).toUpperCase() + this.slice(1);
		}

		if(!this.bitcoin) {
			$('#title').text("Bitcoin (not connected)");
		}

		$('form#settingsServer').submit( function() {
					var host = getFormValue(this, "host");
					var port = getFormValue(this, "port");
					var user = getFormValue(this, "user");
					var pass = getFormValue(this, "pass");
					app.connect(host, port, user, pass);
					return false;
				});
	};

	this.init();
}
