var express = require('express');
var session = require('cookie-session');
var bodyParser = require('body-parser');
var app = express();
var MongoClient = require('mongodb').MongoClient; 
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var mongourl = 'mongodb://localhost:27017/test';

app = express();
app.set('view engine','ejs');

var SECRETKEY1 = 'I want to pass COMPS381F';
var SECRETKEY2 = 'Keep this to yourself';

var users = new Array(
	{name: 'developer', password: 'developer'},
	{name: 'guest', password: 'guest'}
);

app.set('view engine','ejs');

app.use(session({
  name: 'session',
  keys: [SECRETKEY1,SECRETKEY2]
}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/',function(req,res) {
	console.log(req.session);
	if (!req.session.authenticated) {
		res.redirect('/login');
	} else {
		res.status(200);
		res.render('secrets',{name:req.session.username});
	}
});

app.get('/login',function(req,res) {
	res.sendFile(__dirname + '/public/login.html');
});

app.post('/login',function(req,res) {
	for (var i=0; i<users.length; i++) {
		if (users[i].name == req.body.name &&
		    users[i].password == req.body.password) {
			req.session.authenticated = true;
			req.session.username = users[i].name;
			res.redirect('/');
			break;
		}
		else {
			res.end('You are not an user or your password is wrong');
		}
	}
});

app.get('/logout',function(req,res) {
	req.session = null;
	res.redirect('/');
});
app.post('/restaurant',function(req,res){
	//TODO add restauramt
});
app.get('/restaurant',function(req,res){
	//TODO get restaurant
	//depends on query
})
app.patch('/restaurant',function(req,res){
	//TODO modify restaurant and rating
})
app.delete('/restaurant',function(req,res){
	//TODO delete restaurant
})
app.get('/search',function(req,res){
	//TODO filter restaurant
})
//Method for mongodb ops
function read_n_print(res,criteria,max) {
	MongoClient.connect(mongourl, function(err, db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		findRestaurants(db,criteria,max,function(restaurants) {
			db.close();
			console.log('Disconnected MongoDB\n');
			if (restaurants.length == 0) {
				res.writeHead(500, {"Content-Type": "text/plain"});
				res.end('Not found!');
			} else {
				res.writeHead(200, {"Content-Type": "text/html"});			
				res.write('<html><head><title>Restaurant</title></head>');
				res.write('<body><H1>Restaurants</H1>');
				res.write('<H2>Showing '+restaurants.length+' document(s)</H2>');
				res.write('<ol>');
				for (var i in restaurants) {
					res.write('<li>'+restaurants[i].name+'</li>');
				}
				res.write('</ol>');
				res.end('</body></html>');
				return(restaurants);
			}
		}); 
	});
}

function searchbyborough(res) {
	MongoClient.connect(mongourl, function(err, db) {
		assert.equal(null, err);
		findDistinctBorough(db, function(boroughs) {
			db.close();
			res.writeHead(200, {"Content-Type": "text/html"});
			res.write("<html><body>");
			res.write("<form action=\"/search\" method=\"get\">");
			res.write("Borough: ");
			res.write("<select name=\"borough\">");
			for (i in boroughs) {
				res.write("<option value=\"" +
					boroughs[i] + "\">" + boroughs[i] + "</option>");
			}
			res.write("</select>");
			res.write("<input type=\"submit\" value=\"Search\">");
			res.write("</form>");
			res.write("</body></html>");
			res.end();
			/*
			console.log(today.toTimeString() + " " + "CLOSED CONNECTION "
							+ req.connection.remoteAddress);
			*/
		});
 	});
}

function create(res,queryAsObject) {
	var new_r = {};	// document to be inserted
	if (queryAsObject.id) new_r['id'] = queryAsObject.id;
	if (queryAsObject.name) new_r['name'] = queryAsObject.name;
	if (queryAsObject.borough) new_r['borough'] = queryAsObject.borough;
	if (queryAsObject.cuisine) new_r['cuisine'] = queryAsObject.cuisine;
	if (queryAsObject.building || queryAsObject.street) {
		var address = {};
		if (queryAsObject.building) address['building'] = queryAsObject.building;
		if (queryAsObject.street) address['street'] = queryAsObject.street;
		new_r['address'] = address;
	}

	console.log('About to insert: ' + JSON.stringify(new_r));

	MongoClient.connect(mongourl,function(err,db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		insertRestaurant(db,new_r,function(result) {
			db.close();
			res.writeHead(200, {"Content-Type": "text/plain"});
			res.write(JSON.stringify(new_r));
			res.end("\ninsert was successful!");			
		});
	});
}

function remove(res,criteria) {
	console.log('About to delete ' + JSON.stringify(criteria));
	MongoClient.connect(mongourl,function(err,db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		deleteRestaurant(db,criteria,function(result) {
			db.close();
			res.writeHead(200, {"Content-Type": "text/plain"});
			res.end("delete was successful!");			
		});
	});
}

function findRestaurants(db,criteria,max,callback) {
	var restaurants = [];
	if (max > 0) {
		cursor = db.collection('restaurants').find(criteria).limit(max); 		
	} else {
		cursor = db.collection('restaurants').find(criteria); 				
	}
	cursor.each(function(err, doc) {
		assert.equal(err, null); 
		if (doc != null) {
			restaurants.push(doc);
		} else {
			callback(restaurants); 
		}
	});
}

function insertRestaurant(db,r,callback) {
	db.collection('restaurants').insertOne(r,function(err,result) {
		assert.equal(err,null);
		console.log("Insert was successful!");
		console.log(JSON.stringify(result));
		callback(result);
	});
}

function deleteRestaurant(db,criteria,callback) {
	db.collection('restaurants').deleteMany(criteria,function(err,result) {
		assert.equal(err,null);
		console.log("Delete was successfully");
		callback(result);
	});
}

function findDistinctBorough(db,callback) {
	db.collection('restaurants').distinct("borough", function(err,result) {
		console.log(result);
		callback(result);
	});
}

app.listen(process.env.PORT || 8099);
