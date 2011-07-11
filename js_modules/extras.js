exports.linkify = function(text) {
  	return text.replace(/https?:\/\/([-\w\.]+)+(:\d+)?(\/([^\s]*(\?\S+)?)?)?/g, '<a target="_blank" href="$&">$&</a>');									
};

//  html sanitizer 
exports.toStaticHTML = function(inputHtml) {
  return inputHtml.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
};

//pads n with zeros on the left,
//digits is minimum length of output
//zeroPad(3, 5); returns "005"
//zeroPad(2, 500); returns "500"
exports.zeroPad = function (digits, n) {
	n = n.toString();
	while (n.length < digits) {
		n = '0' + n;							
	}
	return n;
};

//it is almost 8 o'clock PM here
//timeString(new Date); returns "19:49"
exports.timeString = function (date) {
	var minutes = date.getMinutes().toString();
	var hours = date.getHours().toString();

	return this.zeroPad(2, hours) + ':' + this.zeroPad(2, minutes);
};

//does the argument only contain whitespace?
exports.isBlank = function(text) {
	return text.match(/^\s*$/) !== null;
};

exports.getParameter = function(name) {
	name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");

	var results = (new RegExp('[\\?&]'+name+'=([^&#]*)')).exec( window.location.href );

	return results ? decodeURIComponent(results[1].replace(/\+/g, " ")) : '';
};