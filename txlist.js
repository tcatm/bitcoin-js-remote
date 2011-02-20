/*
 * Copyright (c) 2010 Nils Schneider
 * Distributed under the MIT/X11 software license, see the accompanying
 * file license.txt or http://www.opensource.org/licenses/mit-license.php.
 */

/* settings:
 * {
 *  generateConfirm: 120
 * }
 */
function TXList(list, app, settings) {
	this.nTXshown;

	this.nTXmin = 10;
	this.nTXinc = 10;

	this.sortTX = function(a, b) {
		if(a.time != b.time)
			return (a.time - b.time);

		if(a.category != b.category)
			return (b.category < a.category) ? -1 : 1;

		return (b.amount - a.amount);
	}

	this.countVisibleTX = function() {
		return list.children('tr:not(.txinfo)').size();
	}

	this.showMore = function() {
		this.showRelN(this.nTXinc);
	}

	this.showLess = function() {
		this.showRelN(- this.nTXinc);
	}

	/* call with relative number (e.g. +10 / -10) */
	this.showRelN = function(n) {
		var x = this.nTXshown;
		this.nTXshown = Math.max(this.nTXmin, x + n);

		if (this.nTXshown != x)
			this.refresh();

		return this.nTXshown;
	}

	this.clear = function() {
		this.nTXshown = this.nTXmin;
		this.footer();
		list.children().remove();
	}

	this.processRPC = function(transactions, error) {
		if (error)
			return;

		var start = new Date().getTime();

		if (!app.settings.labelsmode) 
			transactions = jQuery.grep(transactions, function(n, i) {
						return n.account == app.bitcoin.settings.account;
					});

		transactions = transactions.reverse();

		var end = new Date().getTime();
		var time = end - start;

		this.renderList(transactions);
	}

	this.renderList = function(transactions) {
		var timestamp = new Date().getTime();

		var footer = this.footer();

		if (transactions.length == 0) {
			footer.append('<div class="center">no transactions</div>');
			return;
		}

		var youngest = list.children('tr:not(.txinfo)').last().attr('time');

		/* list comprehension is slooow... do it manually */
		var TXcount = 0;
		for (var key in transactions) {
			var tx = transactions[key];
			var where;

			var txid = this.getTXid(tx);
			var txrow = $(document.getElementById(txid));

			if (txrow.length == 0) {
				if (tx.time <= youngest) {
					where = false;
					youngest = tx.time;
				} else {
					where = list.children('tr:not(.txinfo)').filter( function(index) {
								return $(this).attr('time') < tx.time;
							}).first();
				}

				txrow = this.insertRow(tx, txid, where);
			}

			this.updateTX(txrow, tx, timestamp);
			TXcount++;
			if (TXcount >= this.nTXshown)
				break;
		}

		list.children('tr:not(.txinfo)').not('[update="' + timestamp + '"]').next().remove();
		list.children('tr:not(.txinfo)').not('[update="' + timestamp + '"]').remove();

		list.children('tr:not(.txinfo):odd').addClass('odd').next('.txinfo').addClass('odd');
		list.children('tr:not(.txinfo):even').removeClass('odd').next('.txinfo').removeClass('odd');

		this.renderButtons(TXcount, transactions.length);

		var time = new Date().getTime() - timestamp;
	}

	this.getTXid = function(tx) {
		var id;

		if (tx.txid == undefined)
			id = (tx.time + tx.amount + tx.otheraccount).replace(/ /g,'');
		else
			id = tx.txid;

		id += tx.category;

		return id;
	}

	/* use pre-computed txid, faster */
	this.insertRow = function(tx, txid, where) {
		txrow = $('<tr id="' + txid + '"></tr>');
		var txdiv = $('<tr colspan="4" class="txinfo"><td colspan="4"><div style="display: none"></div></td></tr>');

		if (!where || where.length == 0)
			list.append(txrow);
		else
			where.before(txrow);

		txrow.after(txdiv);

		txrow.click( function() {
				var div = $(this).next('tr.txinfo').children('td').children('div');
				if (app.useSlide()) div.slideToggle('fast');
				else div.toggle();
			});

		return txrow;
	}

	this.footer = function() {
		var footer = $('#txlistfooter');
		footer.contents().remove();

		return footer;
	}

	this.renderButtons = function(TXcount, nTX) {
		var footer = this.footer();

		if (nTX > TXcount) {
			var button = $('<span class="button TXListMore">more</span>');
			button.click(jQuery.proxy(this, "showMore"));
			footer.append(button);
		}

		if (TXcount > this.nTXmin) {
			var button = $('<span class="button TXListLess">less</span>');
			button.click(jQuery.proxy(this, "showLess"));
			footer.append(button);
		}
	}

	this.updateTX = function(txrow, tx, timestamp) {
		var checksum = tx.confirmations + "_" + tx.time;

		txrow.attr('update', timestamp);
		txrow.attr('time', tx.time);

		/* Only update TX if it differs from current one */
		if(txrow.attr('checksum') != checksum) {
			txrow.attr('checksum', checksum);
			txrow.html(this.renderRow(tx));

			txrow.next('tr.txinfo').children('td').children('div').html(this.renderInfo(tx));

			if (tx.confirmations == 0 || (tx.category == "generate" && tx.confirmations < settings.generateConfirm))
				txrow.addClass("unconfirmed");
			else
				txrow.removeClass("unconfirmed");
		}
	}

	this.renderInfo = function(tx) {
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

				if (app.settings.labelsmode) 
					extra = " (" + tx.account + ")";

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

	this.renderRow = function(tx) {
		var confirmations = tx.confirmations<10?tx.confirmations:'&#x2713;';

		if (tx.category == "generate")
			confirmations = tx.confirmations<settings.generateConfirm?'&#x2717':'&#x2713';

		var timestamp = new Date();
		timestamp.setTime (tx.time * 1000);

		var info = tx.category.capitalize();

		if (tx.category == 'send')
			if (tx.to)
				info = tx.to;
			else
				info = tx.address;

		if (tx.category == 'receive')
			if (app.settings.labelsmode && tx.account) 
				info = tx.account;
			else if (tx.from)
				info = tx.from;
			else
				info = tx.address;


		if (tx.comment)
			info += " (" + tx.comment + ")";

		if (tx.category == 'move')
			info = (tx.amount<0?"to ":"from ") + tx.otheraccount.prettyAccount();

		var amountClass = (tx.amount<0?'debit':'credit');

		var html = '<td class="center">' + confirmations + '</td>';
		html += '<td>' + timestamp.format(app.dateFormat()) + '</td>';
		html += '<td class="info">' + info + '</td>';
		html += '<td class="' + amountClass + ' right">' + tx.amount.formatBTC(true) + '</td>';

		return html;
	}

	this.refresh = function() {
		var footer = this.footer();
		footer.append('<div class="center">loading...</div>');

		/* request one more TX than shown so we know whether the to the display "more" button or not */
		app.bitcoin.listTransactions(jQuery.proxy(this, 'processRPC'), this.nTXshown + 1);
	}

	this.clear();
}
