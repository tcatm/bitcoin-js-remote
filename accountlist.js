/*
 * Copyright (c) 2010 Nils Schneider
 * Distributed under the MIT/X11 software license, see the accompanying
 * file license.txt or http://www.opensource.org/licenses/mit-license.php.
 */

function AccountList(obj, app) {
	this.container = obj;
	this.list = false;
	
	this.clear = function() {
		if (this.list)
			this.list.children().remove();
	}

	this.updateLabelAddress = function(addresses, error, context) {
		if (error)
			return;

		var account = context[0];
		var cell = context[1];
		var address = addresses[0];

		cell.html('<label>' + account + '</label>');
		var div = jQuery('<div/>');
		var button = jQuery('<span class="button QRbutton">QR</span>');

		button.click( function() {
					app.showQRAddress(address, account);
				});

		div.append(button);
		div.append('<p class="center">' + address + '</p>');

		cell.append(div);
	}

	this.updateRowLabels = function(row, account, timestamp) {
		app.bitcoin.getAddressByAccount(jQuery.proxy(this, 'updateLabelAddress'), account, [account, row.children('td')]);

		row.attr('update', timestamp);
	}

	this.updateRow = function(row, balance, timestamp) {
		var balanceClass = "";
		if(balance != 0)
			balanceClass = (balance<0?'debit':'credit');

		row.children('td:last-child').removeClass().addClass("right").addClass(balanceClass).text(balance.formatBTC());
		row.attr('update', timestamp);
	}

	this.parseList = function(accounts, error) {
		if (error) 
			return;

		var timestamp = new Date().getTime();

		var sum = 0;

		for (var account in accounts) {
			var balance = accounts[account];

			if (app.settings.labelsmode) {
				sum += balance;

				if (account == "")
					continue;

			} else if (account == app.account()) {
				app.setBalance(balance);
				$('#currentAccount').text(account.prettyAccount());
			}


			this.balance = balance;

			var row = this.list.children('tr[name="' + account + '"]');

			if (row.length == 0) {
				row = $('<tr></tr>');

				if (!app.settings.labelsmode) {
					var html = '<td class="left">' + account.prettyAccount() + '</td>';
						html += '<td></td>';
				} else {
					var html = '<td/>'
				}

				row.append(html);

				row.attr('name', account);

				if (!app.settings.labelsmode) 
					row.click( function() {
							app.selectAccount($(this).attr('name'));
							});

				this.list.append(row);
			}

			if (!app.settings.labelsmode) 
				this.updateRow(row, balance, timestamp);
			else
				this.updateRowLabels(row, account, timestamp);
		}
		
		if (app.settings.labelsmode) {
			app.setBalance(sum);
			$('#currentAccount').text("Balance");
		}

		this.list.children().not('[update="' + timestamp + '"]').remove();
	}

	this.refresh = function() {
		if (!this.list) {
			if (!app.settings.labelsmode) 
				this.container.append('<thead><tr><th class="left">Account</th><th class="right">Balance</th></tr></thead>');

			this.list = jQuery('<tbody/>');
			this.container.append(this.list);
			var form = jQuery('<form id="addAccount" />')
			form.append('<input name="account" placeholder="Add new account/label"/>');

			var that = this;

			form.submit( function() {
						var account = $(this).children('input[name="account"]');
						app.bitcoin.createAccount(jQuery.proxy(that, 'refresh'), account.val());
						account.blur()

						this.reset();
						return false;
					});

			this.container.append(form);
		}

		app.bitcoin.listAccounts(jQuery.proxy(this, 'parseList'));
	}
}
