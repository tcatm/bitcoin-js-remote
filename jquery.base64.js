/**
 * jQuery : Encodes and decodes data with MIME base64
 * 
 * Manual :
 * 		This method used for encoding string to base64 and decoding theme and fully supported UTF-8 encoding.
 * 		WARNING : For great supporting in UTF-8 encoding in your page you must put
 * 			<meta http-equiv="content-type" content="text/html; charset=UTF-8" />
 * 		in your head of html tag.
 * 
 * Recommend :
 * 		I'm Iranian programmer. I do not like that the Google code prevent us to access for download jquery in my county ip.
 * 		Please forget the Google code and use Source Forge for coding hosting.
 * 		Thank and good luck. :)
 * 
 * Example :
 * 		<script language="javascript" type="text/javascript">
 *			var mystring = "do me as base64 string\nand new line";
 *			alert(mystring);
 *			alert("base64 of 'mystring' is : " + $.base64_encode(mystring));
 *		</script>
 * 
 * @alias base64
 * @version 1.0
 * @license http://www.gnu.org/licenses/gpl.html [GNU General Public License]
 * @author Muhammad Hussein Fattahizadeh <muhammad [AT] semnanweb [DOT] com>
 * 
 * @param {jQuery} {base64_utf8decode:function(input))
 * @param {jQuery} {base64_utf8encode:function(input))
 * @param {jQuery} {base64_encode:function(input))
 * @param {jQuery} {base64_decode:function(input))
 */
(function($){
	var base64_keystring = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
	$.extend({
		base64_utf8decode: function(input) {
			var string = "";
			var i = 0;
			var c = c1 = c2 = 0;
			while ( i < input.length ) {
				c = input.charCodeAt(i);
				if (c < 128) {
					string += String.fromCharCode(c);
					i++;
				} else if ((c > 191) && (c < 224)) {
					c2 = input.charCodeAt(i+1);
					string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
					i += 2;
				} else {
					c2 = input.charCodeAt(i+1);
					c3 = input.charCodeAt(i+2);
					string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
					i += 3;
				}
			}
			return string;
		},
		base64_utf8encode: function(input) {
			input = input.replace(/\r\n/g,"\n");
			var output = "";
			for (var n = 0; n < input.length; n++) {
				var c = input.charCodeAt(n);
				if (c < 128) {
					output += String.fromCharCode(c);
				} else if ((c > 127) && (c < 2048)) {
					output += String.fromCharCode((c >> 6) | 192);
					output += String.fromCharCode((c & 63) | 128);
				} else {
					output += String.fromCharCode((c >> 12) | 224);
					output += String.fromCharCode(((c >> 6) & 63) | 128);
					output += String.fromCharCode((c & 63) | 128);
				}
			}
			return output;
		},
		base64_encode: function(input) {
			var output = "";
			var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
			var i = 0;
			input = this.base64_utf8encode(input);
			while (i < input.length) {
				chr1 = input.charCodeAt(i++);
				chr2 = input.charCodeAt(i++);
				chr3 = input.charCodeAt(i++);
				enc1 = chr1 >> 2;
				enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
				enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
				enc4 = chr3 & 63;
				if (isNaN(chr2)) {
					enc3 = enc4 = 64;
				} else if (isNaN(chr3)) {
					enc4 = 64;
				}
				output = output + base64_keystring.charAt(enc1) + base64_keystring.charAt(enc2) + base64_keystring.charAt(enc3) + base64_keystring.charAt(enc4);
			}
			return output;
		},
		base64_decode: function(input) {
			var output = "";
			var chr1, chr2, chr3;
			var enc1, enc2, enc3, enc4;
			var i = 0;
			input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
			while (i < input.length) {
				enc1 = base64_keystring.indexOf(input.charAt(i++));
				enc2 = base64_keystring.indexOf(input.charAt(i++));
				enc3 = base64_keystring.indexOf(input.charAt(i++));
				enc4 = base64_keystring.indexOf(input.charAt(i++));
				chr1 = (enc1 << 2) | (enc2 >> 4);
				chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
				chr3 = ((enc3 & 3) << 6) | enc4;
				output = output + String.fromCharCode(chr1);
				if (enc3 != 64) {
					output = output + String.fromCharCode(chr2);
				}
				if (enc4 != 64) {
					output = output + String.fromCharCode(chr3);
				}
			}
			output = this.base64_utf8decode(output);
			return output;
		}
	});
})(jQuery);