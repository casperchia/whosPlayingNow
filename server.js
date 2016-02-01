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
var games = []
var completedRequests = 0;
var gamesCount;
var events = require('events');
var eventEmitter = new events.EventEmitter();
var resultsRenderer;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function (req, res) {
   res.render('index', {bodyText: 'Hello World!', games: []})
})

app.get('/profile', function(req, res){
   games = [];
   completedRequests = 0;
   resultsRenderer = renderResults(req, res);
   Steam.ready(function(err){
      if(err) return console.error(err);
      steam.resolveVanityURL({vanityurl: req.query.id}, getGamesForUser)
   })
})

function renderResults(req, res){
   var req = req;
   var res = res;

   function complete(){
      if(completedRequests == gamesCount){
         res.render('index', {bodyText: req.query.id, games: games})
      }
   }
   return {
      complete:complete
   }
}

var server = app.listen(8080, function () {
  var port = server.address().port
  console.log("App listening at localhost:%s", port)
})

function getGamesForUser(err, steamId){
   if(steamId.success == 1){
      console.log("Retrieved profile");
      steamId.include_appinfo = true;
      steamId.include_played_free_games=true;
      steamId.appids_filter="";
      steam.getOwnedGames(steamId, getNumOfPlayersForGames);
   }else{
      console.log("Unable to retrieve profile");
   }
}

function getNumOfPlayersForGames(err, gamesList){
   gamesCount = gamesList.games.length;
   for(var i in gamesList.games){
      var id = gamesList.games[i].appid;
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
      var playerCount = gameData.response.player_count;
      db.one("SELECT * FROM games WHERE id = $1", [appid])
         .then(function(data){
            // console.log(data.id + " : " + data.name + " : " + playerCount);
            var game = {};
            game.id = data.id;
            game.name = data.name;
            game.playerCount = playerCount;
            games.push(game);
            // console.log(games);
         })
         .catch(function(err){
            console.log("ERROR:", err.message);
         })
   }else{
      console.log("No results for " + res.req.path);
   }
   completedRequests++;
   resultsRenderer.complete();
}
