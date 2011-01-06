function setFormValue(form, name, value) {
	var obj = $(form).children('input[name="' + name + '"]');
	obj.val(value);

	return obj;
}

function getFormValue(form, name) {
	return $(form).children('input[name="' + name + '"]').val();
}

function sortTransactions(a, b) {
	if(a.time != b.time)
		return (a.time - b.time);

	if(a.category != b.category)
		return (b.category < a.category) ? -1 : 1;

	return (b.amount - a.amount);
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
