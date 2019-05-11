const bot = require('../bot/index.js');
const db = require('../bot/db.js');
const botUtils = require('../bot/utils.js');

async function recentServerActivity (message) {
  let images = await db.images.find({}).sort({createdTimestamp: -1}).limit(500);
  let count = {}
  
  for (let image of images) {
    count[image.guildId] = (count[image.guildId] || 0) + 1
  }
  
  let top = Object.keys(count).sort((a, b) => count[b] - count[a]).filter(id => bot.client.guilds.get(id)).slice(0, 20);
    
  return bot.notify(message, top.map(id => bot.client.guilds.get(id).name + ' - ' + count[id] + ' - ' + bot.client.guilds.get(id).owner.user.tag + ' - ' + bot.client.guilds.get(id).memberCount).join('\n'));
}

async function showServerInfo (message, args) {
  let guild = bot.client.guilds.find(g => g.id == args[0] || g.name.toLowerCase() == args[0].toLowerCase());
  
  if (guild) {
    return bot.notify(message, guild.name + ' owned by ' + guild.owner.user.tag);
  }
  
  return bot.notify(message, "guild not found");
}

async function showProcessing (message) {
  console.log(botUtils.processing);
}

module.exports.commands = {
  'processing': showProcessing,
  'recent': recentServerActivity,
  'server info': showServerInfo
}