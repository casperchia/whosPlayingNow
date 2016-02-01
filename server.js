var url = require('url');
var http = require('http');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var config = require('./config');
var pgp = require('pg-promise')({
    // Initialization Options
});
var currentPlayersPath = '/ISteamUserStats/GetNumberOfCurrentPlayers/v1?appid=';
var db = pgp(config.dbConnection);
var options = {
   host: 'api.steampowered.com',
   port: 80,
   path: '',
   method: 'GET'
}
var Steam = require('steam-webapi');
Steam.key = config.steamkey;
var steam = new Steam();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function (req, res) {
   res.render('index', {bodyText: 'Hello World!'})
})

app.get('/profile', function(req, res){
   Steam.ready(function(err){
      if(err) return console.error(err);
      steam.resolveVanityURL({vanityurl: req.query.id}, getGamesForUser)
   })
   res.render('index', {bodyText: req.query.id})
})

var server = app.listen(8080, function () {
  var port = server.address().port
  console.log("App listening at localhost:%s", port)
})

function getGamesWithCurrentPlayers(err, gamesList){
   console.log(gamesList);
   for(var i in gamesList){
      var id = gamesList[i].appid;
      var steamObj = new Steam({appid : id});
      steamObj.getNumberOfCurrentPlayers(steamObj, function(err, playerCount){
         console.log(playerCount);
      })
   }
}

function getGamesForUser(err, steamId){
   if(steamId.success == 1){
      steamId.include_appinfo = true;
      steamId.include_played_free_games=true;
      steamId.appids_filter="";
      steam.getOwnedGames(steamId, getNumOfPlayersForGames);
   }else{
      console.log("Unable to retrieve profile for: " + req.query.id);
   }
}

function getNumOfPlayersForGames(err, gamesList){
   for(var i in gamesList.games){
      var id = gamesList.games[i].appid;
      // console.log(id);
      // Get number of players for game
      options.path = currentPlayersPath + id;
      http.get(options, processHttpResponse)
         .on('error', function(e){
            console.error(e);
         });
   }
   console.log("====================================\n");
}

function processHttpResponse(res){
   var responses = [];
   res.on('data', function(chunk){
      responses.push(chunk);
   });
   res.on('end', function(){
      return extractResponseData(responses, res);
   });
}

function extractResponseData(responses, res){
   var gameData = JSON.parse(responses.join());
   if(gameData.response.result == 1){
      var url_parts = url.parse(res.req.path, true);
      var appid = url_parts.query.appid;
      // console.log(appid + " : " + gameData.response.player_count);
      db.one("SELECT * FROM games WHERE id = $1", [appid])
         .then(function(data){
            console.log(data.id + " : " + data.name + " : " + gameData.response.player_count);
         })
         .catch(function(err){
            console.log("ERROR:", err.message);
         })
      // console.log(res.req.path);
   }else{
      console.log("No results for " + res.req.path);
   }
}
