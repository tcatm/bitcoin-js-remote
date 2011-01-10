/*
 * humanMsg 1.0 - Plugin for jQuery
 * 
 * My implementation of humanized messages http://ajaxian.com/archives/humanized-messages-library
 *
 * Dual licensed under the MIT (http://www.opensource.org/licenses/mit-license.php)
 * and GPL (http://www.opensource.org/licenses/gpl-license.php) licenses.
 *
 * Depends:
 *   jquery.js
 *
 *  Copyright (c) 2008 Oleg Slobodskoi ( http://code.google.com/p/ajaxsoft/ )
 */



(function($){
$.fn.humanMsg = function ( message, options )
{
	return this.each(function(){
	    var elem = this == window || this == document ? document.body : this;
		!$.data(elem, 'humanMsg') && $.data(elem, 'humanMsg', new $.humanMsg (elem, message, options) );
	});
};

$.humanMsg = function ( container, message, options )
{
	if (typeof message == 'object') {
		options = message;
		message = null;
	};  

	/* defaults */
	var d = {
		message: 'no message was set',
		autoHide: 1500,
		addClass: '',
		speed: 300
	};

	$.extend(d, options);

	
	var $m,
		sizeContainer = container == document.body ? window : container
	;
	

	
	$m = $('<div class="humanized-message '+d.addClass+'"/>')
	.html(message || d.message)
	.click(remove)
	.appendTo(container);

	$m.css({
		display: 'none',
		visibility: 'visible',
		top: ($(sizeContainer).height()-$m.innerHeight())/2,
		left: ($(sizeContainer).width()-$m.innerWidth())/2
	})
	.fadeIn(d.speed);
	
		
	d.autoHide && setTimeout(remove, d.autoHide);	

	function remove () {
		$m.fadeOut(d.speed, function(){
			$m.remove();
			$.removeData(container, 'humanMsg');
		});
	};

};


	

})(jQuery);	
		
