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
		findRestaurants(db,{},20,function(restaurants) {
			db.close();
			console.log('Disconnected MongoDB\n');	
					res/*.status(200)*/.render('home',{name:req.session.username,re:restaurants});
		}); 
	});
	}
});

app.get('/login',function(req,res) {
	res.sendFile(__dirname + '/public/login.html');
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
app.post('restaurant',function(req,res){
	//TODO add restauramt
	var headers = {
    'User-Agent':       'server/0.0.1',
    'Content-Type':     'application/x-www-form-urlencoded'
}
	var options = {
    url: '/api/restaurant/create',
    method: 'POST',
    headers: headers,
    body: req.body
}
	request(options, function (error, res, body) {
    if (body.status == 'ok') {
        // Print out the response body
				console.log(body)
				res.redirect('/restaurantDetail?_id='+req.query._id)
    }else{
			res.status(500);
			res.end("internal server error")
		}
})
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
app.patch('/restaurant',function(req,res){
	//TODO modify restaurant and rating
	if(req.body.owner == req.session.username)
		update(res,req.body);
	else{
		res.status(401);
	}
})
app.delete('/restaurant',function(req,res){
	//TODO delete restaurant
	if (req.session.username == req.body.owner){
		remove(res,{'id':req.body.id});
	}else{
		res.status(401);
		res.end("you are not the owner of the document");
	}
})
app.get('/search',function(req,res){
	//TODO filter restaurant
})
app.get('/restaurantDetail',function(req,res){
	//get one
	resdetail(res,{_id:ObjectId(req.query._id)},1);
})
app.post('/rate',function(req,res){
	req.body.grades.forEach(function(p){
		if(p.name == req.session.name){
			res.end('you have already rated this');
		}
	});
	//TODO modify restaurant
	modifyrestaurant();
})
app.post('api/restaurant/create',function(req,res){
	//TODO add restauramt
	var body = req.body;
	create(res,body);
});


//Method for mongodb ops

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
function update(res,queryAsObject){
	var new_r = {};	// document to be inserted
	if (queryAsObject.id) new_r['resId'] = queryAsObject.resID;
	new_r['resName'] = queryAsObject.resName;
	if (queryAsObject.borough) new_r['borough'] = queryAsObject.borough;
	if (queryAsObject.cuisine) new_r['cuisine'] = queryAsObject.cuisine;
	if (queryAsObject.files.photo) new_r['photo'] = queryAsObject.files.photo.data.toString('base64');
	if (queryAsObject.files.photo) new_r['photo_mime'] = queryAsObject.files.photo.mimetype;
	if (queryAsObject.building || queryAsObject.street || queryAsObject.zipcode || queryAsObject.lon ||queryAsObject.lat) {
		var address = {};
		if (queryAsObject.building) address['building'] = queryAsObject.building;
		if (queryAsObject.street) address['street'] = queryAsObject.street;
		if (queryAsObject.zipcode) address['zipcode'] = queryAsObject.zipcode;
		if (queryAsObject.coord) address['lon'] = queryAsObject.lon;
		if (queryAsObject.coord) address['lat'] = queryAsObject.lat;
		new_r['address'] = address;
	}
	if (queryAsObject.score) {
		var grade = {};
		grade['user'] = queryAsObject.user;
		grade['score'] = queryAsObject.score;
		new_r['grades'] = grade;
	}
	new_r['owner'] = queryAsObject.owner;

	console.log('About to insert: ' + JSON.stringify(new_r));

	MongoClient.connect(mongourl,function(err,db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		updateRestaurant(db,queryAsObject._id,new_r,function(result) {
			db.close();
			res.redirect('/restaurantDetail?_id='+queryAsObject._id)
		});
	});
}

function create(res,queryAsObject) {
	var new_r = {};	// document to be inserted
	if (queryAsObject.id) new_r['resId'] = queryAsObject.resID;
	new_r['resName'] = queryAsObject.resName;
	if (queryAsObject.borough) new_r['borough'] = queryAsObject.borough;
	if (queryAsObject.cuisine) new_r['cuisine'] = queryAsObject.cuisine;
	if (queryAsObject.files.photo) new_r['photo'] = queryAsObject.files.photo.data.toString('base64');
	if (queryAsObject.files.photo) new_r['photo_mime'] = queryAsObject.files.photo.mimetype;
	if (queryAsObject.building || queryAsObject.street || queryAsObject.zipcode || queryAsObject.lon ||queryAsObject.lat) {
		var address = {};
		if (queryAsObject.building) address['building'] = queryAsObject.building;
		if (queryAsObject.street) address['street'] = queryAsObject.street;
		if (queryAsObject.zipcode) address['zipcode'] = queryAsObject.zipcode;
		if (queryAsObject.coord) address['lon'] = queryAsObject.lon;
		if (queryAsObject.coord) address['lat'] = queryAsObject.lat;
		new_r['address'] = address;
	}
	if (queryAsObject.score) {
		var grade = {};
		grade['user'] = queryAsObject.user;
		grade['score'] = queryAsObject.score;
		new_r['grades'] = grade;
	}
	new_r['owner'] = queryAsObject.owner;

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
				res.render('detail',restaurants);
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
	db.collection('project').deleteOne(criteria,function(err,result) {
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
function updateRestaurant(db,_id,criteria,callback) {
	db.collection('project').updateOne({'$_id':ObjectID(_id)},criteria,function(err,result) {
		assert.equal(err,null);
		console.log("Delete was successfully");
		callback(result);
	});
}
function gpsDecimal(direction,degrees,minutes,seconds) {
  var d = degrees + minutes / 60 + seconds / (60 * 60);
  return (direction === 'S' || direction === 'W') ? d *= -1 : d;
}
app.listen(process.env.PORT || 8099);
