
var _			= require("underscore");


	
var lib = {};

lib.id	= function () {
	return '_' + Math.random().toString(36).substr(2, 9);
};

lib.jpath = function(jpath, obj, noClone) {
	var parts		= jpath.split('.');
	if (!noClone) {
		var localCopy	= JSON.parse(JSON.stringify(obj));
	} else {
		var localCopy	= obj;
	}
	var pointer		= localCopy;
	var i, l;
	l = parts.length
	for (i=0;i<l;i++) {
		if (!pointer.hasOwnProperty(parts[i])) {
			return null;
		}
		pointer	= pointer[parts[i]];
	}
	return pointer;
}
	
var format	= function(jpath, input) {
	/*if (!lib.local) {
		return input;
	}*/
	var formatValue	= lib.jpath(jpath, {
		reset:	37,
		color:	{
			red:	31,
			green:	32,
			yellow:	33,
			blue:	34,
			magenta:35,
			cyan:	36,
			white:	37
		},
		bg:	{
			red:	41,
			green:	42,
			yellow:	43,
			blue:	44,
			magenta:45,
			cyan:	46,
			white:	47
		}
	});
	if (!formatValue) {
		console.log("! Missing format: ", jpath);
		return input;
	}
	if (typeof input == "object") {
		return "\033["+formatValue+"m"+JSON.stringify(input, null, 4)+"\033[37m\033[40m";
	}
	return "\033["+formatValue+"m"+input+"\033[37m\033[40m";
}

lib.errorResponse	= function(error, data) {
	var output	= _.extend({}, data, {
		error:		true,
		message:	error
	});
	console.log("errorResponse", output);
	return output;
}
	
lib.log	= function() {
	var args	= Array.prototype.slice.call(arguments);
	var output	= format('bg.blue', args[0])+' ';
	output	+= format('bg.green', args[1])+' ';
	args	= args.slice(2);
	_.each(args, function(arg) {
		if (typeof arg == "object") {
			output	+= JSON.stringify(arg,null,4)+' ';
		} else {
			output	+= arg+' ';
		}
	});
	console.log(output);
	return true;
};

module.exports = lib;