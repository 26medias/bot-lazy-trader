var _			= require("underscore");
var pstack		= require("pstack");
var request		= require("request");

bot = function(core, options) {
	this.core	= core;
	core.log("Bot init:", "Bot Options:", options);
	this.oanda	= require("./oanda")(core, options);	// Pass the options to oanda
}
bot.prototype.refresh = function(callback) {
	var scope	= this;
	this.getAccountStats(function(response) {
		scope.status = response;
		scope.core.log("Oanda", "Account Status", scope.status);
		callback(scope.status);
	});
}
bot.prototype.getAccountStats = function(callback) {
	this.oanda.account.summary(function(response) {
		callback({
			Account: 		response.alias,
			balance: 		response.balance,
			margin: 		(parseFloat(response.marginCallPercent)*100),
			unrealizedPL: 	response.unrealizedPL,
			gain:			(response.NAV-1000)/1000*100
		});
	});
}
bot.prototype.sell = function(options, callback) {
	var scope	= this;
	var stack	= new pstack();
	var buffer	= {};
	
	// Open the order
	stack.add(function(done) {
		
		var orderObj	= {
			"units":		Math.floor(options.size*-1).toFixed(options.precision||5),
			"instrument":	options.pair||"EUR_USD",
			"timeInForce":	"FOK",	// The Order must be immediately "Filled Or Killed"
			"type":			"MARKET",
			"positionFill":	"DEFAULT"
		};
		
		if (options.price) {
			orderObj.price			= options.price.toFixed(options.precision||5);
			orderObj.type			= 'LIMIT';
			orderObj.timeInForce	= 'GTC';	// The Order is "Good unTil Cancelled"
		}
		
		if (options.stoploss) {
			orderObj["stopLossOnFill"]	= {
				"timeInForce":	"GTC",
				"price":		options.stoploss
			};
		}
		if (options.takeprofit) {
			orderObj["takeProfitOnFill"]	= {
				"price": options.takeprofit
			};
		}
		
		scope.oanda.orders.open(orderObj, function(response) {
			buffer.order	= response;
			done();
		});
	});
	
	stack.start(function() {
		callback(buffer);
	});
}
bot.prototype.buy = function(options, callback) {
	var scope	= this;
	var stack	= new pstack();
	var buffer	= {};
	
	// Open the order
	stack.add(function(done) {
		
		var orderObj	= {
			"units":		Math.floor(options.size).toFixed(options.precision||5),
			"instrument":	options.pair||"EUR_USD",
			"timeInForce":	"FOK",	// The Order must be immediately "Filled Or Killed"
			"type":			"MARKET",
			"positionFill":	"DEFAULT"
		};
		
		if (options.price) {
			orderObj.price			= options.price.toFixed(options.precision||5);
			orderObj.type			= 'LIMIT';
			orderObj.timeInForce	= 'GTC';	// The Order is "Good unTil Cancelled"
		}
		
		if (options.stoploss) {
			orderObj["stopLossOnFill"]	= {
				"timeInForce":	"GTC",
				"price":		options.stoploss
			};
		}
		if (options.takeprofit) {
			orderObj["takeProfitOnFill"]	= {
				"price": options.takeprofit
			};
		}
		
		scope.oanda.orders.open(orderObj, function(response) {
			buffer.order	= response;
			done();
		});
	});
	
	stack.start(function() {
		callback(buffer);
	});
}



module.exports = bot;