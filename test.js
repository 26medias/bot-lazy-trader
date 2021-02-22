var app			= require('./app');
var request 	= require('request');
var port		= 479;

var server = require('http').createServer(app);

// Start the local server to simulate AWS Lambda
server.listen(port, function() {
	console.log('Server started on port '+port);

	var tests = {}
	tests = {
		api:	function(endpoint, params, callback) {
			request({
				url:		"http://localhost:"+port+endpoint,
				method: 	"GET",
				json:		params,
				headers:	{
					'local-test':	'true'
				}
			}, function(error, response, body) {
				var output;
				try {
					output	= JSON.parse(body);
				} catch (e) {
					output	= body;
				}
				
				callback(JSON.stringify(output, null, 4));
			});
		},
		run:	function() {
			tests.api('/', {}, function(response) {
				console.log(response);
			});
		}
	}
	
	// Run the test
	tests.run();
});
