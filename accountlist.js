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

		if (app.settings.labelsmode)
			var sum = 0;

		for (var account in accounts) {
			var balance = accounts[account];

			if (app.settings.labelsmode) {
				sum += balance;
			} else if (account == app.account()) {
				$('#balance').text(balance.formatBTC());
				$('#currentAccount').text(account.prettyAccount());
				app.balance = balance;
			}

			this.balance = balance;

			var row = this.list.children('tr[name="' + account + '"]');

			if (row.length == 0) {
				row = $('<tr></tr>');

				var html ='<td class="left">' + account.prettyAccount() + '</td>';
					html += '<td></td>';

				row.append(html);

				row.attr('name', account);
				row.click( function() {
						app.selectAccount($(this).attr('name'));
						});

				this.list.append(row);
			}

			this.updateRow(row, balance, timestamp);
		}
		
		if (app.settings.labelsmode) {
			$('#balance').text(sum.formatBTC());
			$('#currentAccount').text("Balance");
			app.balance = sum;
		}

		this.list.children().not('[update="' + timestamp + '"]').remove();
	}

	this.refresh = function() {
		if (!this.list) 
			if (!app.settings.labelsmode) {
				this.container.append('<thead><tr><th class="left">Account</th><th class="right">Balance</th></tr></thead>');
				this.list = jQuery('<tbody/>');
				this.container.append(this.list);
			}

		app.bitcoin.listAccounts(jQuery.proxy(this, 'parseList'));
	}
}
