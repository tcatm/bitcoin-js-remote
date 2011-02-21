/*
 * Copyright (c) 2010 Nils Schneider
 * Distributed under the MIT/X11 software license, see the accompanying
 * file license.txt or http://www.opensource.org/licenses/mit-license.php.
 */

function setFormValue(form, name, value) {
	var obj = $(form).children('input[name="' + name + '"]');
	obj.val(value);

	return obj;
}

function getFormValue(form, name) {
	var e = $(form).children('input[name="' + name + '"]');
	if (e.get(0).type == "checkbox") {
		return e.attr("checked");
	}

	return e.val()
}

function hideValidation(obj) {
	var o = $(obj).next('span').removeClass().text('');
}

function showValidation(obj, correct) {
	var o = $(obj).next('span');

	if(correct) {
		o.removeClass().addClass('valRight').html("&#x2714;");
	} else {
		o.removeClass().addClass('valWrong').html("&#x2718;");
	}
}
