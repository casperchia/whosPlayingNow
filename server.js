var http = require('http');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var config = require('./config');
var pgp = require('pg-promise')({
    // Initialization Options
});
var db = pgp(config.dbConnection);
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function (req, res) {
   res.render('index', {bodyText: 'Hello World!'})
})

app.get('/profile', function(req, res){
   res.render('index', {bodyText: req.query.id})
})

var server = app.listen(8080, function () {
  var port = server.address().port
  console.log("App listening at localhost:%s", port)
})
