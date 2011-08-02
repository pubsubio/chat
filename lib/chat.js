var create = function(config) {
	var common = require('common');
	var db = require('mongojs').connect(config.db);

	var noop = function() {};

	var chatDB = (function() {
		var users = db.collection('users');
		var messages = db.collection('messages');
		return {
			valid : function(name, password, callback) {
				users.findOne({name:name,password:password},common.fork(callback,function(user) {
					callback(null,!!user);
				}));
			},
			exists: function(name,callback) {
				users.findOne({name:name},common.fork(callback,function(user) {
					callback(null,!!user);
				}))
			},
			create : function(name, password, callback) {
				users.findOne({name:name},common.fork(callback,function(user) {
					if(user) {
						callback(new Error("User already exists"));
						return;
					}

					users.save({name:name,password:password},callback);
				}));
			},
			conversation : function(to,from,callback) {
				messages.find({$or:[{to:to,from:from},{to:from,from:to}]},{sort:{time:-1}},callback);
			},
			chat : function(to,from,message,callback) {
				callback = callback || noop;
				messages.save({to:to,from:from,message:message,time:(new Date())},callback)
			},
			users: function(callback) {
				users.find({},{fields:{name:1,status:1}},callback);
			},
			status : function(name,status,callback) {
				users.update({name:name},{$set:{status:status}},callback);
			}
		};
	}());


	var user = function(name) {
		return {
			conversation : function(to,callback) {
				chatDB.conversation(to,name,callback);
			},
			chat : function(to,message,callback) {
				chatDB.chat(to,name,message,callback);
			},
			users: function(callback) {
				chatDB.chat(callback);
			},
			status : function(status,callback) {
				chatDB.status(name,status,callback);
			}
		}
	};

	var createUser = function(name,password,callback) {
		chatDB.create(name,password,common.fork(callback,function() {
			callback(null,user(name));
		}));
	};

	var isValidUser = function(name,password,callback) {
		chatDB.valid(name,password,callback);
	};

	var exists = function(name,callback) {
		chatDB.exists(name,callback);
	};

	var getUser = function(name,callback) {
		chatDB.exists(name,common.fork(callback,function(valid) {
			if(valid) {
				callback(null,user(name));
				return;
			}
			callback(new Error('User cannot be retrieved'));
		}));
	};

	var getUsers = function(callback) {
		chatDB.users(callback);
	};
	
	return {
		getUser:getUser,
		getUsers:getUsers,
		createUser:createUser,
		isValidUser:isValidUser,
		exists:exists
	}
};
exports.create = create;