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
