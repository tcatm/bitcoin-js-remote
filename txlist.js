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

/* settings:
 * {
 *  generateConfirm: 120
 * }
 */
function TXList(list, app, settings) {
	this.sortTX = function(a, b) {
		if(a.time != b.time)
			return (a.time - b.time);

		if(a.category != b.category)
			return (b.category < a.category) ? -1 : 1;

		return (b.amount - a.amount);
	}

	this.clear = function() {
		list.children().remove();
	}

	this.processRPC = function(transactions, error) {
		if (error)
			return;

		var start = new Date().getTime();

		var transactions = jQuery.grep(transactions,
				function(n, i) {
					return n.account == app.bitcoin.settings.account;
				});

		transactions.sort(this.sortTX);

		list.children('#txlistempty').remove();

		if (transactions.length == 0)
			list.append('<tr id="txlistempty"><td colspan="4" class="center">no transactions</td></tr>');

		for (var key in transactions)
			this.processTX(transactions[key]);

		list.children('tr:not(.txinfo):odd').addClass('odd').next('.txinfo').addClass('odd');
		list.children('tr:not(.txinfo):even').removeClass('odd').next('.txinfo').removeClass('odd');

		/* adjust refresh interval of app depending processing time of txlist */
		var end = new Date().getTime();
		var time = end - start;
		app.setRefreshInterval(time * 10);
	}

	this.processTX = function(tx) {
		if (tx.time == undefined)
			tx.time = 0;

		if (tx.txid == undefined)
			tx.txid = (tx.time + tx.amount + tx.otheraccount).replace(/ /g,'');

		tx.txid += tx.category;

		var txrow = $(document.getElementById(tx.txid));

		if (txrow.length == 0) {
			txrow = $('<tr id="' + tx.txid + '"></tr>');
			list.prepend(txrow);
			var txdiv = $('<tr colspan="4" class="txinfo"><td colspan="4"><div style="display: none"></div></td></tr>');
			txrow.after(txdiv);

			txrow.click( function() {
					$(this).next('tr.txinfo').children('td').children('div').slideToggle('fast');
				});
		}

		var checksum = tx.txid + tx.confirmations + tx.time;

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
		html += '<td>' + timestamp.format(app.dateFormat) + '</td>';
		html += '<td class="info">' + info + '</td>';
		html += '<td class="' + amountClass + ' right">' + tx.amount.formatBTC(true) + '</td>';

		return html;
	}

	this.refresh = function() {
		app.bitcoin.listTransactions(jQuery.proxy(this, 'processRPC'));
	}
}
