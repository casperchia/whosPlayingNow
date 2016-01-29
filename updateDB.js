var http = require('http');
var config = require('./config');
var events = require('events');
var eventEmitter = new events.EventEmitter();
var pgp = require('pg-promise')({
    // Initialization Options
});

var options = {
   host: 'api.steampowered.com',
   port: 80,
   path: '/ISteamApps/GetAppList/v2/',
   method: 'GET'
}
var db;
var data = '';
http.get(options, function(res){
   res.on('data', function(chunk){
      data += chunk;
   })

   res.on('end', function(){
      console.log('Data received.')
      eventEmitter.emit('dataReceived')
   })
}).on('error', function(e){
   console.error(e);
});

eventEmitter.addListener('dataReceived', createDB);

function createDB(){
   db = pgp(config.dbConnection);
   db.query("CREATE TABLE IF NOT EXISTS games(id integer PRIMARY KEY, name text);")
   .then(function(){
      console.log("Created games table");
      eventEmitter.emit('dbCreated');
   })
   .catch(function(err){
      console.log("ERROR:", err.message);
   });
}

eventEmitter.addListener('dbCreated', updateDB);

function updateDB(){
   data = JSON.parse(data);
   var games = data.applist.apps;
   for(var i in games){
      var id = games[i].appid;
      var name = games[i].name;
      db.none("INSERT INTO games(id, name) values($1, $2) ON CONFLICT (id) DO UPDATE SET name = $3", [id, name, name])
         .then(function(){
            // success;
         })
         .catch(function(err){
            console.log("ERROR:", err.message);
         })
   }
   console.log("Updated games table");
}
