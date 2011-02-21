/*
 * Copyright (c) 2010 Nils Schneider
 * Distributed under the MIT/X11 software license, see the accompanying
 * file license.txt or http://www.opensource.org/licenses/mit-license.php.
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

		if (app.useSlide())
			box.slideDown('fast');
		else
			box.show();

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

		if (app.useSlide())
			box.slideDown('fast');
		else
			box.show();

		box.children('form').hide();

		context.amount = Math.round(context.amount*100)/100;

		var payeeString = "";
		if (context.payee)
			payeeString = " (" + $('<div/>').text(context.payee).html() + ")";

		var confString = "Send <strong>" + context.amount.formatBTC() + "</strong> to " + context.address + payeeString + "?";

		this.resetClass();
		box.addClass('critical');

		var div = this.div(true);

		div.append($('<h4>').text('Confirm payment').addClass('center'));

		if (context.comment) {
			var commentP = $('<p/>').text(context.comment).addClass("center italic");;
			div.append(commentP);
		}

		var confP = $('<p/>').html(confString).addClass("center");

		div.append(confP);

		var buttonSend = $('<span class="button buttonSend"/>').text('Send');
		var buttonCancel = $('<span class="button buttonCancel"/>').text('Cancel / Edit');

		buttonSend.click( function() { self.dispatchSend(context, rawcontext); });
		buttonCancel.click( function() { self.fillAndShowForm(rawcontext); });

		div.append(buttonSend).append(buttonCancel);
	}

	this.dispatchSend = function(context, rawcontext) {
		/* FIXME: add busy/sending indicator */
		var div = this.div(true);
		div.append('<p class="center">Sending...</p>');

		if (app.settings.labelsmode)
			app.bitcoin.sendBTCToAddress(this.sendCallback.proxy(this), context, rawcontext);
		else
			app.bitcoin.sendBTC(this.sendCallback.proxy(this), context, rawcontext);
	}

	this.onValidateAddressField = function(result, error, field) {
			showValidation(field, result.isvalid && $(field).val() == result.address);
	}

	this.div = function(show) {
		var div = box.children('#sendBTCinfo');
		div.contents().remove();

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
