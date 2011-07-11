var router = require('router');
var common = require('common');
var chat = require('./chat');
var parse = require('url').parse;
var cookie = require('galletita');

var pubsub = require('pubsub.io').connect('localhost:10547');

var noop = function() {};

var server = router.create();
/* Subscribe to messages {origin: {$not:'server'},from: {$has:1},to:{$has:1},message:{$has:1}}*/
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

server.get('/login', '../static/login.html', router.onfilerequest('.'));

server.get('/users', '../static/users.html', router.onfilerequest('.'));

server.get('/chat',  '../static/chat.html', router.onfilerequest('.'));

server.get('/', function(request,response) {
	response.end('hi');
})
server.get('/api/{method}', function(request, response) {
	var url = parse(request.url,true);

    var onerror = function(error) {
		response.writeHead(500, {'Content-Type': 'text/plain'});
		response.write(error.stack);
		response.end();
	}
	
	var write = common.fork(onerror,function(data) {
		response.writeHead(200, {'Content-Type': 'application/javascript'});
		response.write(JSON.stringify(data));
		response.end();
	}); 
	
	switch(request.matches.method) {
		case 'auth':
		chat.isValidUser(url.query.name,url.query.password,common.fork(onerror,function(valid) {
		    response.writeHead(200, {'Content-Type': 'text/html','Set-Cookie':cookie.stringify(url.query.name)});
		    response.end(JSON.stringify(valid && url.query.name));
		}));
		break;
	
		case 'create':
		if(!url.query.name || url.query.name.replace(/\s/g,"") == "") {
			onerror(new Error('User cannot be empty'));
			return;
		}
		chat.createUser(url.query.name, url.query.password,write);
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