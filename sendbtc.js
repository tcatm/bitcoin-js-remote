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

function SendBTC(box, app) {
	/* assign class to self for event handlers */
	var self = this;

	this.sendCallback = function(result, error, context) {
		if(error != null) {
			this.showResult(error.message, false, context);
			return;
		}
		var obj;
		obj	= setFormValue($('form#sendBTC'), "address", "");
		hideValidation(obj);

		obj = setFormValue($('form#sendBTC'), "amount", "");
		hideValidation(obj);

		this.showResult("Bitcoins sent", true, context);
		app.refreshAll();
	}

	this.showResult = function(message, success, context) {
		this.resetClass();

		var div = this.div(true);
		var button = $('<span class="button"></div>');

		if (success) {
			box.addClass('success');
			button.text('Send more bitcoins');
			button.click(this.reset.proxy(this));
		} else {
			box.addClass('error');
			button.text('Go back to form');
			button.click( function() {
						self.fillAndShowForm(context);
					});
		}

		div.append('<p><strong>' + message + '</strong></p>').addClass('center');
		div.append(button.wrap('<p/>').addClass('center'));
	}

	this.fillAndShowForm = function(context) {
		this.reset();

		box.slideDown('fast');

		var form = box.find('form');

		setFormValue(form, 'address', context.address);
		setFormValue(form, 'amount', context.amount);
		setFormValue(form, 'payee', context.payee);
		setFormValue(form, 'comment', context.comment);

		/* call validators */
		form.find('input').change();
	}

	this.sendBTC = function(context) {
		var rawcontext = context;
		box.show();

		box.children('form').hide();

		context.amount = Math.round(context.amount*100)/100;

		var payeeString = "";
		if (context.payee)
			payeeString = " (" + context.payee + ")";

		var confString = "Send " + context.amount.formatBTC() + " to " + context.address + payeeString + "?";

		this.resetClass();
		box.addClass('critical');

		var div = this.div(true);

		var confP = $('<p/>').text(confString).addClass("center");
		var commentP = $('<p/>').text(context.comment).addClass("center italic");;

		div.append($('<h4>').text('Confirm payment').addClass('center'));
		div.append(commentP);
		div.append(confP);

		var buttonSend = $('<span class="button buttonSend"/>').text('Send');
		var buttonCancel = $('<span class="button buttonCancel"/>').text('Cancel / Edit');

		buttonSend.click( function() { self.dispatchSend(context, rawcontext); });
		buttonCancel.click( function() { self.fillAndShowForm(rawcontext); });

		div.append(buttonSend).append(buttonCancel);
	}

	this.dispatchSend = function(context, rawcontext) {
		/* FIXME: add busy/sending indicator */

		app.bitcoin.sendBTC(this.sendCallback.proxy(this), context, rawcontext);
	}

	this.onValidateAddressField = function(result, error, field) {
			showValidation(field, result.isvalid && $(field).val() == result.address);
	}

	this.div = function(show) {
		var div = box.children('#sendBTCinfo');
		div.children().remove();

		if (show)
			div.show();
		else
			div.hide();

		return div;
	}

	this.resetClass = function () {
		box.removeClass('critical error success');
	}

	this.reset = function () {
		this.div(false);
		this.resetClass();

		box.children('form').show();
		box.children('form').children('input').val("").each( function() {
					hideValidation(this);
				});
	}

	this.init = function () {
		box.find('input[name="address"]').change( function() {
					if($(this).val() === "") {
						hideValidation(this);
						return;
					}

					var address = $(this).val();

					app.bitcoin.validateAddress(self.onValidateAddressField.proxy(self), address, this);
				});

		box.find('input[name="amount"]').change( function() {
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

		box.find('form').bind('reset', function() {
					self.reset();
				});

		box.find('form').submit( function() {
					var address = getFormValue(this, "address");
					var amount = getFormValue(this, "amount");
					var payee = getFormValue(this, "payee");
					var comment = getFormValue(this, "comment");

					var context = {address: address, amount: amount, payee: payee, comment: comment};

					self.sendBTC(context);
					return false;
				});
	}

	this.init();
}
