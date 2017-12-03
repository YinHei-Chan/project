var express = require('express');
var session = require('cookie-session');
var bodyParser = require('body-parser');
var MongoClient = require('mongodb').MongoClient; 
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var request = require('request');
var fileUpload = require('express-fileupload');
var mongourl = 'mongodb://381project:project381@ds139904.mlab.com:39904/nancyyang';
var app = express();
app.use(fileUpload());
app.set('view engine','ejs');

var SECRETKEY1 = 'I want to pass COMPS381F';
var SECRETKEY2 = 'Keep this to yourself';

var users = new Array(
	{name: 'developer', password: 'developer'},
	{name: 'guest', password: 'guest'},
	{name: 'raymondso',password:'diuar'}
);


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
		MongoClient.connect(mongourl, function(err, db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		findRestaurants(db,{},1000,function(restaurants) {
			db.close();
			console.log('Disconnected MongoDB\n');	
					res.status(200).render('home',{name:req.session.username,re:restaurants});
		}); 
	});
	}
});

app.get('/login',function(req,res) {
	res.render('login');
});

app.post('/login',function(req,res) {
	console.log(req);
	for (var i=0; i<users.length; i++) {
		if (users[i].name == req.body.name &&
		    users[i].password == req.body.password) {
			req.session.authenticated = true;
			req.session.username = users[i].name;
			res.redirect('/');
		}	
	}
	res.end('You are not an user or your password is wrong');
});
app.get('/register',function(req,res){
	res.render('register');
})
app.post('/register',function(req,res){
	//TODO add reg function
	users.push({name: req.body.name, password: req.body.password});
	console.log(users);
	//res.status(200);
	//res.write("register successful");
	res.redirect("/login");
})
app.get('/logout',function(req,res) {
	req.session = null;
	res.redirect('/');
});
app.post('/restaurant',function(req,res){
	//TODO add restauramt
/*	var headers = {
    'User-Agent':       'server/0.0.1',
    'Content-Type':     'application/x-www-form-urlencoded'
}
	var options = {
    method: 'POST',
    headers: headers,
	body: JSON.stringify(req.body),
	port:8099
}
	request('http://localhost:8099/api/restaurant/create',options, function (error, res, body) {
		console.log(error);
		console.log(body);
    if (body.status == 'ok') {
        // Print out the response body
				console.log(body)
				res.redirect('/restaurantDetail?_id='+req.query._id)
    }else{

			
		}
	})*/
	var body = req.body;
	create(req,res,body);
});
app.get('/restaurant',function(req,res){
	//TODO get restaurant
	//depends on query
		if(req.query._id != null){
		  res.redirect('/restaurantDetail?_id='+req.query._id)
  	}else if(req.query.num != null){
			readandprint()
  	}else{
 			res.status(200).render('create')
  	}
});
app.get('/map', function(req,res) {
  res.render('gmap.ejs',
             {lat:req.query.lat,lon:req.query.lon});
});
app.get('/update',function(req,res){
	//TODO modify restaurant and rating
	if(req.query._id != null){
		MongoClient.connect(mongourl, function(err, db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		findRestaurants(db,{_id:ObjectId(req.query._id)},1,function(restaurants) {
			db.close();
			console.log('Disconnected MongoDB\n');
			if (restaurants.length == 0) {
				res.writeHead(500, {"Content-Type": "text/plain"});
				res.end('Not found!');
			}else{
				res.render('update',{re:restaurants[0]});
			}})
		})}else{
		res.status(401);
	}
})
app.post('/update',function(req,res){
	console.log(req.body);
	if(req.body.owner == req.session.username)
		update(req,res,req.body);
	else{
		res.status(401);
		res.end('You are not authorized to update the restaurant');
	}
})

app.post('/deleteRestaurant',function(req,res){
	//TODO delete restaurant
	var target = {'_id':req.query._id};
	if (req.session.username == req.body.owner){
		remove(res,target);
	}else{
		res.status(401);
		res.end("you are not the owner of the document");
	}
})
app.get('/restaurantDetail',function(req,res){
	//get one
	resdetail(res,{_id:ObjectId(req.query._id)},1);
})
app.get('/rate', function(req,res){
	if(req.query._id != null){
		MongoClient.connect(mongourl, function(err, db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		findRestaurants(db,{_id:ObjectId(req.query._id)},1,function(restaurants) {
			db.close();
			console.log('Disconnected MongoDB\n');
			if(restaurants.grades == null){
				res.render('rating',{re:restaurants[0]});
			}
			else{
			restaurants.grades.forEach(function(p){
			if(p.user == req.session.name){
				res.end('you have already rated this');
				}});
			res.render('rating',{re:restaurants[0]});
			}})
		})}else{
		res.status(401);
	}
})
app.post('/rate',function(req,res){
	//TODO modify restaurant
	
	rating(req,res,req.body);
})
app.post('/api/restaurant/create',function(req,res){
	//TODO add restauramt
	var body = req.body;
	apicreate(req,res,body);
});
app.get('/search',function(req,res){
	res.render('search');
});
app.post('/search',function(req,res){
	var q = req.body.qs;
	console.log(q);
	c = {}
	c[q]=req.body.a;
	console.log(c);
	MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err,null);
			console.log('Connected to MongoDB\n');
		findRestaurants(db,c,20,function(restaurants) {
			db.close();
			console.log('Disconnected MongoDB\n');
			if (restaurants.length == 0) {
				res.writeHead(500, {"Content-Type": "text/plain"});
				res.end('Not found!');
			}else{
				res.status(200).render('result',{re:restaurants});
			}
		});
	});
});
app.get('/api/restaurant/read/:q/:a', function(req,res) {
	var c = {}
	c[req.params.q]=req.params.a;
	console.log(c);
	MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err,null);
			console.log('Connected to MongoDB\n');
		findRestaurants(db,c,20,function(restaurants) {
			db.close();
			console.log('Disconnected MongoDB\n');
			if (restaurants.length == 0) {
				res.writeHead(500, {"Content-Type": 'application/json'});
				res.send({});
			}else{
				res.writeHead(200, {"Content-Type": 'application/json'});
				res.send(restaurants);
			}
		});
	});
});
//Method for mongodb ops

function apicreate(req,res,queryAsObject) {
	var new_r = {};	// document to be inserted
	if (queryAsObject.resID) new_r['resID'] = queryAsObject.resID;
	new_r['resName'] = queryAsObject.resName;
	if (queryAsObject.borough) new_r['borough'] = queryAsObject.borough;
	if (queryAsObject.cuisine) new_r['cuisine'] = queryAsObject.cuisine;
	if(req.files){
		if (req.files.photo) new_r['photo'] = req.files.photo.data.toString('base64');
		if (req.files.photo) new_r['photo_mime'] = req.files.photo.mimetype;
	}
	if (queryAsObject.building || queryAsObject.street || queryAsObject.zipcode || queryAsObject.lon ||queryAsObject.lat) {
		var address = {};
		if (queryAsObject.building) address['building'] = queryAsObject.building;
		if (queryAsObject.street) address['street'] = queryAsObject.street;
		if (queryAsObject.zipcode) address['zipcode'] = queryAsObject.zipcode;
		if (queryAsObject.lon) address['lon'] = queryAsObject.lon;
		if (queryAsObject.lat) address['lat'] = queryAsObject.lat;
		new_r['address'] = address;
	}
		new_r['grades'] = [];

	new_r['owner'] = req.session.username;

	console.log('About to insert: ' + JSON.stringify(new_r));

	MongoClient.connect(mongourl,function(err,db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		insertRestaurant(db,new_r,function(result) {
			db.close();
			if(result.result.ok ==1){
				var temp = {}
				temp['_id'] = result.insertedId;
				temp['status'] = "ok"
				res.setHeader('Content-Type', 'application/json');
				res.send(temp);
			}else{
				var temp = {}
				temp['status'] = "failed"
				res.setHeader('Content-Type', 'application/json');
				res.send(temp);
			}
		});
	});
}
function update(req,res,queryAsObject){
	var new_r = {};	// document to be inserted
	var target = req.query._id;
	if (queryAsObject.resID) new_r['resID'] = queryAsObject.resID;
	new_r['resName'] = queryAsObject.resName;
	if (queryAsObject.borough) new_r['borough'] = queryAsObject.borough;
	if (queryAsObject.cuisine) new_r['cuisine'] = queryAsObject.cuisine;
	if(req.files){
		if (req.files.photo) new_r['photo'] = req.files.photo.data.toString('base64');
		if (req.files.photo) new_r['photo_mime'] = req.files.photo.mimetype;
	}
	if (queryAsObject.building || queryAsObject.street || queryAsObject.zipcode || queryAsObject.lon ||queryAsObject.lat) {
		var address = {};
		if (queryAsObject.building) address['building'] = queryAsObject.building;
		if (queryAsObject.street) address['street'] = queryAsObject.street;
		if (queryAsObject.zipcode) address['zipcode'] = queryAsObject.zipcode;
		if (queryAsObject.lon) address['lon'] = queryAsObject.lon;
		if (queryAsObject.lat) address['lat'] = queryAsObject.lat;
		new_r['address'] = address;
	}
		

	new_r['owner'] = req.session.username;
	console.log('About to insert: ' + JSON.stringify(new_r));
	console.log(target);

	MongoClient.connect(mongourl,function(err,db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		updateRestaurant(db,req.query._id,new_r,function(result) {
			db.close();
			res.redirect('/restaurantDetail?_id='+target);
		});
	});
}

function rating(req, res, queryAsObject){
	var grades = {};
	if(queryAsObject.score){
		grades['user'] = req.session.username;
		grades['score'] = queryAsObject.score;
	}
	console.log('About to insert: ' + JSON.stringify(grades));

	MongoClient.connect(mongourl,function(err,db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		updateScore(db,req.query._id,grades,function(result) {
			db.close();
			res.redirect('/restaurantDetail?_id='+req.query._id);
		});
	});
}

function create(req,res,queryAsObject) {
	var new_r = {};	// document to be inserted
	if (queryAsObject.resID) new_r['resID'] = queryAsObject.resID;
	new_r['resName'] = queryAsObject.resName;
	if (queryAsObject.borough) new_r['borough'] = queryAsObject.borough;
	if (queryAsObject.cuisine) new_r['cuisine'] = queryAsObject.cuisine;
	if(req.files){
		if (req.files.photo) new_r['photo'] = req.files.photo.data.toString('base64');
		if (req.files.photo) new_r['photo_mime'] = req.files.photo.mimetype;
	}
	if (queryAsObject.building || queryAsObject.street || queryAsObject.zipcode || queryAsObject.lon ||queryAsObject.lat) {
		var address = {};
		if (queryAsObject.building) address['building'] = queryAsObject.building;
		if (queryAsObject.street) address['street'] = queryAsObject.street;
		if (queryAsObject.zipcode) address['zipcode'] = queryAsObject.zipcode;
		if (queryAsObject.lon) address['lon'] = queryAsObject.lon;
		if (queryAsObject.lat) address['lat'] = queryAsObject.lat;
		new_r['address'] = address;
	}
		new_r['grades'] = [];

	new_r['owner'] = req.session.username;

	console.log('About to insert: ' + JSON.stringify(new_r));

	MongoClient.connect(mongourl,function(err,db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		insertRestaurant(db,new_r,function(result) {
			db.close();
			res.redirect('/');			
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
function resdetail(res,criteria,max) {
	MongoClient.connect(mongourl, function(err, db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		findRestaurants(db,criteria,max,function(restaurants) {
			db.close();
			console.log('Disconnected MongoDB\n');
			if (restaurants.length == 0) {
				res.writeHead(500, {"Content-Type": "text/plain"});
				res.end('Not found!');
			}else{
				res.render('detail',{re:restaurants[0]});
			}
		}
	)}
)}
function findRestaurants(db,criteria,max,callback) {
	var restaurants = [];
	if (max > 0) {
		cursor = db.collection('project').find(criteria).limit(max); 		
	} else {
		cursor = db.collection('project').find(criteria); 				
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
	db.collection('project').insertOne(r,function(err,result) {
		assert.equal(err,null);
		console.log("Insert was successful!");
		console.log(JSON.stringify(result));
		callback(result);
	});
}

function deleteRestaurant(db,criteria,callback) {
	db.collection('project').remove(criteria,function(err,result) {
		assert.equal(err,null);
		console.log("Delete was successfully");
		callback(result);
	});
}

function findDistinctBorough(db,callback) {
	db.collection('project').distinct("borough", function(err,result) {
		console.log(result);
		callback(result);
	});
}
function updateRestaurant(db,target,criteria,callback) {
	db.collection('project').updateOne({_id:ObjectId(target)},{$set:criteria},function(err,result) {
		assert.equal(err,null);
		console.log("UPDATE was successfully");
		callback(result);
	});
}
function updateScore(db, target, criteria, callback){
	db.collection('project').updateOne({_id:ObjectId(target)}, {$push: {grades: {$each: [criteria]}}}, function(err, result){
		assert.equal(err,null);
		console.log('Rating success');
		callback(result);
	});
}

function gpsDecimal(direction,degrees,minutes,seconds) {
  var d = degrees + minutes / 60 + seconds / (60 * 60);
  return (direction === 'S' || direction === 'W') ? d *= -1 : d;
}
app.listen(process.env.PORT || 8099);
