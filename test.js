const db = require('./bot/db.js');
/*
const Discord = require('discord.js');
const client = new Discord.Client();


client.on('ready', async () => {
    let msg = await client.channels.get('557308996701257772').fetchMessage('605427118351974411');
  console.log(msg.embeds[0].image)
})



client.login(process.env.TOKEN).catch(ex => {throw ex});
*/

(async () => {
  let users = await db.users.find({"_id": '467037758976950272'});
  console.log(users)
})();