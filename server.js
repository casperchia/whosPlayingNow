var express = require('express');
var app = express();

app.set('view engine', 'ejs');

app.get('/', function (req, res) {
   res.render('index', {bodyText: 'Hello World!'})
})

var server = app.listen(8080, function () {
  var port = server.address().port
  console.log("App listening at localhost:%s", port)
})
