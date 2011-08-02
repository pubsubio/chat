var server = require('router').create();

server.file('/','test.js');

server.listen(9090);