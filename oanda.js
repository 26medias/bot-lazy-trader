
var _			= require("underscore");
var request		= require("request");
var path		= require("path");
var pstack		= require("pstack");
var fs			= require("fs");


lib = function(core, options) {
	var methods = {};
	methods = {
		apikey:	options.OANDA_KEY,
		accId:	options.OANDA_ACC,
		// Account methods
		account: {
			summary:	function(callback) {
				methods.get("/accounts/"+methods.accId+"/summary", {
					
				}, function(response) {
					//core.log("Oanda", "account.summary response", response);
					if (response.account) {
						callback(response.account);
					} else {
						callback(core.errorResponse('Error getting the account summary', response));
					}
				});
			},
			instruments:	function(callback) {
				methods.get("/accounts/"+methods.accId+"/instruments", {
					
				}, function(response) {
					//core.log("Oanda", "account.summary response", response);
					if (response.instruments) {
						callback(response.instruments);
					} else {
						callback(core.errorResponse('Error getting the instrument list', response));
					}
				});
			},
		},
		// Orders-related methods
		orders: {
			list:	function(callback) {
				methods.get("/accounts/"+methods.accId+"/orders", {
					
				}, function(response) {
					//core.log("Oanda", "orders.list response", response);
					if (response.orders) {
						callback(response.orders);
					} else {
						callback(core.errorResponse('Error getting the orders', response));
					}
				});
			},
			get:	function(orderId, callback) {
				methods.get("/accounts/"+methods.accId+"/orders/"+orderId, {
					
				}, function(response) {
					//core.log("Oanda", "account.summary response", response);
					if (response.order) {
						callback(response.order);
					} else {
						callback(core.errorResponse('Error getting the order details', response));
					}
				});
			},
			open:	function(order, callback) {
				//core.log("Oanda", "Open order: ", order);
				methods.post("/accounts/"+methods.accId+"/orders", {
					order:	_.extend({
						"units":		"1",
						"instrument":	"EUR_USD",
						"timeInForce":	"FOK",
						"type":			"MARKET",
						"positionFill":	"DEFAULT"
					}, order)
				}, function(response) {
					//core.log("Oanda", "account.summary response", response);
					if (response) {
						callback(response);
					} else {
						callback(core.errorResponse('Error open the position', response));
					}
				});
			},
			close:	function(orderId, callback) {
				methods.post("/accounts/"+methods.accId+"/trades/"+orderId+"/close", {
					units:	"ALL"
				}, function(response) {
					//core.log("Oanda", "account.summary response", response);
					if (response) {
						callback(response);
					} else {
						callback(core.errorResponse('Error open the position', response));
					}
				});
			},
			takeProfit:	function(orderId, price, callback) {
				methods.post("/accounts/"+methods.accId+"/orders", {
					order:	{
						"timeInForce":	"GTC",
						"price":		price,
						"type":			"TAKE_PROFIT",
						"tradeID":		orderId
					}
				}, function(response) {
					//core.log("Oanda", "account.summary response", response);
					if (response) {
						callback(response);
					} else {
						callback(core.errorResponse('Error open the position', response));
					}
				});
			},
			stopLoss:	function(orderId, price, callback) {
				methods.post("/accounts/"+methods.accId+"/orders", {
					order:	{
						"timeInForce":	"GTC",
						"price":		price,
						"type":			"STOP_LOSS",
						"tradeID":		orderId
					}
				}, function(response) {
					//core.log("Oanda", "account.summary response", response);
					if (response) {
						callback(response);
					} else {
						callback(core.errorResponse('Error open the position', response));
					}
				});
			}
		},
		// Data-related methods
		data: {
			candles: function(params, callback) {
				params	= _.extend({
					pair:		'EUR_USD',
					timeframe:	'H1',
					bars:		1000	// Max 5000
				}, params);
				methods.get("/instruments/"+params.pair+"/candles", {
					price:			'AB',
					granularity:	params.timeframe,
					count:			params.bars
				}, function(response) {
					
					if (response && response.candles) {
						callback(_.map(response.candles, function(item) {
							return {
								date:	new Date(item.time),
								ask:	parseFloat(item.ask.o),
								bid:	parseFloat(item.bid.o),
								high:	parseFloat(item.ask.h),
								low:	parseFloat(item.ask.l),
								close:	parseFloat(item.ask.c),
								volume:	parseInt(item.volume)
							}
						}))
					} else {
						callback(core.errorResponse('Unexpected response from Oanda', {response:response}));
					}
				});
			},
			getMultiplePairs:	function(pairs, params, callback) {
				params	= _.extend({
					timeframe:	'H1',
					bars:		1000	// Max 5000
				}, params);
				
				if (!pairs) {
					callback(false);
					return false;
				}
				
				var stack	= new pstack();
				var buffer	= {};
				
				_.each(pairs, function(pair) {
					stack.add(function(done) {
						methods.data.candles(_.extend(params, {pair:pair}), function(response) {
							buffer[pair]	= response;
							done();
						});
					});
				});
				
				
				stack.start(function() {
					callback(buffer);
				});
				
			}
		},
		// Shortcut for GET requests
		post:	function(endpoint, params, callback) {
			methods.api("POST", endpoint, params, callback);
		},
		// Shortcut for GET requests
		get:	function(endpoint, params, callback) {
			methods.api("GET", endpoint, params, callback);
		},
		// API call on Oanda
		api:	function(method, endpoint, params, callback) {
			var obj = {
				url:		"https://api-fxpractice.oanda.com/v3"+endpoint,	// https://api-fxtrade.oanda.com/v3/instruments/"+parameters.pair+"/candles
				method: 	method,
				json:		params,	// One or the other...
				qs:			params,	// One or the other...
				headers:	{
					"Content-Type":		"application/json",
					"Authorization":	"Bearer "+methods.apikey
				}
			};
			
			//core.log("Oanda", "api obj", obj);
			
			request(obj, function(error, response, body) {
				/*var output;
				try {
					output	= JSON.parse(body);
				} catch (e) {
					callback({
						status:		'Request Error',
						error:		error,
						body:		body,
						response:	response
					});
					return false;
				}
				
				callback(output.body);*/
				callback(body);
			});
		},
		currencies: [
		{
			"label": "USD/THB",
			"value": "USD_THB",
			"pipValue": "0.01",
			"pipLocation": -2
		},
		{
			"label": "GBP/CHF",
			"value": "GBP_CHF",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "EUR/GBP",
			"value": "EUR_GBP",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "EUR/JPY",
			"value": "EUR_JPY",
			"pipValue": "0.01",
			"pipLocation": -2
		},
		{
			"label": "EUR/SGD",
			"value": "EUR_SGD",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "CAD/JPY",
			"value": "CAD_JPY",
			"pipValue": "0.01",
			"pipLocation": -2
		},
		{
			"label": "GBP/ZAR",
			"value": "GBP_ZAR",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "EUR/CHF",
			"value": "EUR_CHF",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "SGD/CHF",
			"value": "SGD_CHF",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "CHF/ZAR",
			"value": "CHF_ZAR",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "SGD/JPY",
			"value": "SGD_JPY",
			"pipValue": "0.01",
			"pipLocation": -2
		},
		{
			"label": "NZD/USD",
			"value": "NZD_USD",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "NZD/CHF",
			"value": "NZD_CHF",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "EUR/HKD",
			"value": "EUR_HKD",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "USD/HKD",
			"value": "USD_HKD",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "USD/DKK",
			"value": "USD_DKK",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "AUD/HKD",
			"value": "AUD_HKD",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "EUR/CZK",
			"value": "EUR_CZK",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "EUR/NOK",
			"value": "EUR_NOK",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "NZD/JPY",
			"value": "NZD_JPY",
			"pipValue": "0.01",
			"pipLocation": -2
		},
		{
			"label": "AUD/USD",
			"value": "AUD_USD",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "AUD/NZD",
			"value": "AUD_NZD",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "EUR/CAD",
			"value": "EUR_CAD",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "GBP/PLN",
			"value": "GBP_PLN",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "ZAR/JPY",
			"value": "ZAR_JPY",
			"pipValue": "0.01",
			"pipLocation": -2
		},
		{
			"label": "USD/SAR",
			"value": "USD_SAR",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "GBP/CAD",
			"value": "GBP_CAD",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "AUD/JPY",
			"value": "AUD_JPY",
			"pipValue": "0.01",
			"pipLocation": -2
		},
		{
			"label": "GBP/JPY",
			"value": "GBP_JPY",
			"pipValue": "0.01",
			"pipLocation": -2
		},
		{
			"label": "USD/TRY",
			"value": "USD_TRY",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "EUR/NZD",
			"value": "EUR_NZD",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "EUR/ZAR",
			"value": "EUR_ZAR",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "GBP/USD",
			"value": "GBP_USD",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "USD/MXN",
			"value": "USD_MXN",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "EUR/PLN",
			"value": "EUR_PLN",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "EUR/DKK",
			"value": "EUR_DKK",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "USD/NOK",
			"value": "USD_NOK",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "USD/CZK",
			"value": "USD_CZK",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "NZD/SGD",
			"value": "NZD_SGD",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "USD/HUF",
			"value": "USD_HUF",
			"pipValue": "0.01",
			"pipLocation": -2
		},
		{
			"label": "GBP/HKD",
			"value": "GBP_HKD",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "USD/SEK",
			"value": "USD_SEK",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "GBP/SGD",
			"value": "GBP_SGD",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "AUD/CHF",
			"value": "AUD_CHF",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "AUD/SGD",
			"value": "AUD_SGD",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "USD/CNH",
			"value": "USD_CNH",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "TRY/JPY",
			"value": "TRY_JPY",
			"pipValue": "0.01",
			"pipLocation": -2
		},
		{
			"label": "AUD/CAD",
			"value": "AUD_CAD",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "CAD/HKD",
			"value": "CAD_HKD",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "SGD/HKD",
			"value": "SGD_HKD",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "GBP/NZD",
			"value": "GBP_NZD",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "NZD/CAD",
			"value": "NZD_CAD",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "USD/ZAR",
			"value": "USD_ZAR",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "EUR/SEK",
			"value": "EUR_SEK",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "USD/SGD",
			"value": "USD_SGD",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "HKD/JPY",
			"value": "HKD_JPY",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "EUR/USD",
			"value": "EUR_USD",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "GBP/AUD",
			"value": "GBP_AUD",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "USD/PLN",
			"value": "USD_PLN",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "USD/CAD",
			"value": "USD_CAD",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "CAD/SGD",
			"value": "CAD_SGD",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "CHF/HKD",
			"value": "CHF_HKD",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "USD/CHF",
			"value": "USD_CHF",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "NZD/HKD",
			"value": "NZD_HKD",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "EUR/AUD",
			"value": "EUR_AUD",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "CAD/CHF",
			"value": "CAD_CHF",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "CHF/JPY",
			"value": "CHF_JPY",
			"pipValue": "0.01",
			"pipLocation": -2
		},
		{
			"label": "USD/JPY",
			"value": "USD_JPY",
			"pipValue": "0.01",
			"pipLocation": -2
		},
		{
			"label": "EUR/TRY",
			"value": "EUR_TRY",
			"pipValue": "0.0001",
			"pipLocation": -4
		},
		{
			"label": "EUR/HUF",
			"value": "EUR_HUF",
			"pipValue": "0.01",
			"pipLocation": -2
		}]
	}
	return methods;
}



module.exports = lib;