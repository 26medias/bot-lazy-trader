// Load the dependencies
var _		= require("underscore");
var pstack	= require("pstack");
var express	= require('express');
var moment	= require('moment-timezone');

// Some utilities to speed up bot development
var core	= require("./core");
var Bot		= require("./bot");

/*
	Edit those variables
*/

const testMode	= false;	// True: Ignore what day/time it is & will open buy-stop & sell-stop positions on all pairs

// Oanda API Key
const OANDA_KEY	= process.env.OANDA_KEY;	// Get that fro the envs
const OANDA_ACC	= process.env.OANDA_ACC;	// Get that fro the envs

// Risk per position, in percents of your acccount balance
const RISK		= 1.0;	

// The 3 pairs to use (but you can add more to the array, no limit)
const PAIRS		= ["EUR_USD","EUR_JPY","USD_JPY"];

// When we're allowed to open a position
const TIMEZONE	= "America/New_York";
const DAY		= 0;	// 0:Sunday, 1:Monday, ...
const TIME		= 17;	// 5pm

// Rules:
// From the reddit post:
// At the opening hour of Forex trading (5pm EST Sunday for me) I place both a pending buy-stop and sell-stop order 30 pips away from the opening price for each pair.
// I place stop-loss at 50 pips and take-profit at 150 pips for each. I also instruct MT4 to use a trailing stop of 500 points (50 pips) once the position moves in to profit.
const openDistance	= 30;
const slDistance	= 50;
const tpDistance	= 150;
// I'm skipping the trailing stop in this first version, I don't have enough time to implement that feature and I don't have code laying around for this







/*
	The logic
*/
// This webservice is a GET HTTP endpoint, executed via AWS API Gateway by an AWS Cloudwatch rule.
// You can also test it locally; In your console: `node test`
var app		= express();	// Create an ExpressJS instance
app.get('/', function(req, res) {
	
	
	// Get the current date & time in the specified timezone
	var localDate	= moment().tz(TIMEZONE);
	
	// Is it sunday 5pm? (or whatever the settings define)
	if (testMode || (localDate.day() == DAY && localDate.hour() == TIME)) {
		// Time to trade!
		// Create a new bot instance (bot.js)
		var bot = new Bot(core, {
			OANDA_KEY:	OANDA_KEY,
			OANDA_ACC:	OANDA_ACC
		});
		
		
		// Refresh the account status (make sure we have enough money & margin, get account stats)
		bot.refresh(function(accStatus) {
			if (accStatus && accStatus.balance >= 0) {
				// We have money on the balance. Let's trade!
				
				
				// First, let's get the data from the pairs:
				bot.oanda.data.getMultiplePairs(PAIRS, {timeframe: 'H1', bars: 10}, function(dataResponse) {
					// Now we have the last 10 bars of each pairs
					
					// Opening a position is an asynchronous operation.
					// To avoid a callback hell (we're already 3 deep) and because I don't like promises, I'm creating an async call stack, since all of those ops should be executed at the same time
					var stack	= new pstack({
						async:		true	// Execute all the call stacks at once ("sync": Execute them one by one, in order)
					});
					
					
					// We're going to save the responses from the API when we open positions
					var positionResponses	= {};
					
					// For each pairs
					_.each(PAIRS, function(pair, pairIndex) {
						
						var pairData	= dataResponse[pair];
						if (!pairData) {
							// No data for this pair :(
							core.log("Error", pair, "No data found for this pair");
							return false;
						}
						
						
						// Find the most recent datapoint
						var lastDatapoint = pairData[pairData.length-1];
						
						// Get the bid & ask
						var bidValue	= lastDatapoint['bid'];
						var askValue	= lastDatapoint['ask'];
						
						// What's a pip's value for that currency pair?
						// Look it up in the currency list that I've embedded in oanda.js
						var currencyData = _.find(bot.oanda.currencies, function(item) {
							return item.value == pair;
						})
						if (!currencyData) {
							console.log("ERROR: Pair not supported by Oanda");
							return false;
						}
						var pipValue	= parseFloat(currencyData.pipValue);	// It's saved as a string, so we must convert to a float to use it
						
						
						// Create a sell-stop position
						stack.add(function(done) {
							// At the opening hour of Forex trading (5pm EST Sunday for me) I place both a pending buy-stop and sell-stop order 30 pips away from the opening price for each pair.
							// I place stop-loss at 50 pips and take-profit at 150 pips for each. I also instruct MT4 to use a trailing stop of 500 points (50 pips) once the position moves in to profit.
							
							// Create a sell-stop
							var sellStopValue	= bidValue-(pipValue*openDistance);
							var stopLossValue	= sellStopValue+(pipValue*slDistance);
							var takeProfitValue	= sellStopValue-(pipValue*tpDistance);
							
							bot.sell({
								pair:		pair,
								precision:	Math.abs(currencyData.pipLocation),	// Decimals when rounding prices
								size:		(accStatus.balance*(RISK/100))/slDistance/pipValue, // Based on the max risk allowed
								stoploss:	stopLossValue.toFixed(5),
								takeprofit:	takeProfitValue.toFixed(5),
								price:		sellStopValue	// If you don't specify, it'll be a market order
							}, function(sellResponse) {
								positionResponses[pair+'_sell'] = sellResponse;
								done();
							});
						});
						
						// Create a buy-stop position
						stack.add(function(done) {
							// At the opening hour of Forex trading (5pm EST Sunday for me) I place both a pending buy-stop and sell-stop order 30 pips away from the opening price for each pair.
							// I place stop-loss at 50 pips and take-profit at 150 pips for each. I also instruct MT4 to use a trailing stop of 500 points (50 pips) once the position moves in to profit.
							
							// Create a sell-stop
							var buyStopValue	= askValue+(pipValue*openDistance);
							var stopLossValue	= buyStopValue-(pipValue*slDistance);
							var takeProfitValue	= buyStopValue+(pipValue*tpDistance);
							
							bot.buy({
								pair:		pair,
								precision:	Math.abs(currencyData.pipLocation),	// Decimals when rounding prices
								size:		(accStatus.balance*(RISK/100))/slDistance/pipValue, // Based on the max risk allowed
								stoploss:	stopLossValue.toFixed(5),
								takeprofit:	takeProfitValue.toFixed(5),
								price:		buyStopValue	// If you don't specify, it'll be a market order
							}, function(buyResponse) {
								positionResponses[pair+'_buy'] = buyResponse;
								done();
							});
						});
					});
					
					
					// When all the call stacks have been executed...
					stack.start(function() {
						// Display the position responses in CloudWatch or in the console if you're not running this on AWS Lambda
						core.log("All done!", "Position Responses:", positionResponses);
						res.send({});	// End
					});
				});
				
			} else {
				core.log("Can't trade on that account", "Account Status:", accStatus);
				res.send({});	// End
			}
		});
	} else {
		console.log("It's "+moment().format("dddd ha")+", it's not the right time to trade...");
		res.send({});	// End
	}
	
});


// Export your Express configuration so that it can be consumed by the Lambda handler
module.exports = app
