var server = require('router').create();
var common = require('common');
var bark = require('bark');
var parse = require('url').parse;
var cookie = require('galletita');

var argv = require('optimist')
	.alias('c','config')
	.argv;

config = {
	hub: {
		web: 'localhost:9999',
		server: 'localhost'
	},
	db:'mongodb://root:root@flame.mongohq.com:27108/chat'
};
if (argv.config) {
	config = JSON.parse(require('fs').readFileSync(argv.config, 'utf-8'));
}
var chat = require('./chat').create(config);
var pubsub = require('pubsub.io').connect(config.hub.server);

var noop = function() {};

pubsub.subscribe({
	origin: {$not:'server'},
	from: {$has:1},
	to:{$has:1},
	message:{$has:1}
}, function(doc) {
	chat.getUser(doc.from, common.fork(noop,function(user) {
		user.chat(doc.to, doc.message);
    }));
});

server.get('/','/in',server.route); //todo: add session based redirection
server.get('/in', bark.file('../static/login.html'));
server.get('/users', bark.file('../static/users.html'));
server.get('/chat', bark.template('../static/chat.html',{hub:config.hub}));
server.get('/js/{*}', bark.file('../js_modules/{*}'));

server.get('/api/{method}', function(request, response) {
	var url = parse(request.url,true);

    var onerror = function(message) {
		response.writeHead(200, {'Content-Type': 'application/javascript'});
		response.write(JSON.stringify({error:message}));
		response.end();
	}
	
	var write = common.fork(onerror,function(data) {
		response.writeHead(200, {'Content-Type': 'application/javascript'});
		response.write(JSON.stringify(data));
		response.end();
	}); 
	
	switch(request.params.method) {
		case 'auth':
		chat.isValidUser(url.query.name,url.query.password,common.fork(onerror,function(valid) {
		    response.writeHead(200, {'Content-Type': 'text/html','Set-Cookie':cookie.stringify(url.query.name)});
		    response.end(JSON.stringify(valid && url.query.name));
		}));
		break;
	
		case 'create':
		if (!url.query.name || url.query.name.replace(/\s/g,"") == "") {
			onerror('Choose a username');
			return;
		}
		if (!url.query.password || url.query.password.replace(/\s/g,"") == "") {
			onerror('Set a password');
			return;
		}
		
		common.step([
			function(next) {
				chat.exists(url.query.name, next);
			},
			function(exists) {
				if (exists) {
					onerror('Username is taken');
					return;
				}
				chat.createUser(url.query.name,url.query.password,write);
			}
		],function(err) {
			onerror();
		});
		break;
		
		case 'users':
		chat.getUsers(write);
		break;
		
		case 'conversation':
		chat.getUser(url.query.name, common.fork(write, function(user) {
		    user.conversation(url.query.to,write);
		}));
		break;
				
		case 'status':
		chat.getUser(url.query.name,common.fork(write, function(user) {
		   	user.status(url.query.status,write);
		}));
		break;
		
		case 'chat':
		chat.getUser(url.query.name,common.fork(write, function(user) {
		   	user.chat(url.query.to,url.query.message,write);
			pubsub.publish({
			    origin: 'server',
			    from: name,
			    to:url.query.to,
			    message: url.query.message
			});
		}));
		break;
	}
});
server.listen(12000);

console.log('server running on port 12000');