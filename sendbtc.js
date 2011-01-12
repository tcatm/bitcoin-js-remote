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

	this.sendCallback = function(result, error) {
		if(error != null) {
			this.warning(error.message);
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

	this.sendBTC = function(address, amount) {
		if(!app.connected) {
			return this.warning("Not connected!");
		}

		if(address === "") {
			return this.warning("Invalid bitcoin address");
		}

		amount = Math.round(amount*100)/100;
		var confString = "Send " + amount.formatBTC() + " to " + address + "?";

		if(confirm(confString)) {
			app.bitcoin.sendBTC(this.sendCallback.proxy(this), address, amount);
		}
	}

	this.onValidateAddressField = function(result, error, field) {
			showValidation(field, result.isvalid && $(field).val() == result.address);
	}

	this.reset = function () {
		box.children('#sendBTCInfo').hide();
		box.children('#sendBTCInfo').contents().remove();
		box.removeClass('critical');
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

					self.sendBTC(address, amount);
					return false;
				});
	}

	this.init();
}
