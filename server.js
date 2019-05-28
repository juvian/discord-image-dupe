// server.js
// where your node app starts

// init project
const express = require('express');
const app = express();
const bot = require("./bot/index");
const hbars = require('express-handlebars');
const db = require('./bot/db.js');

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));
app.engine('handlebars', hbars({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');
app.enable('trust proxy')

// http://expressjs.com/en/starter/basic-routing.html
app.get('/', function(request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

app.get('/recent', async function(req, res) {
  if (req.ip != process.env.ADMIN_IP) return res.status(404).send({message: 'error'});
  
  let images = await db.images.find({}).sort({createdTimestamp: -1}).limit(500);
  let servers = images.reduce((servers, im) => {
    servers[im.guildId] = servers[im.guildId] || {images: [], count: 0, name: (bot.client.guilds.get(im.guildId) || {name: im.guildId}).name};
    if(servers[im.guildId].images.length < 10) servers[im.guildId].images.push(im);
    servers[im.guildId].count++;
    return servers;
  }, {});
  
  res.render('recent', {servers: servers});
})

// listen for requests :)
const listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});
