const db = require('./bot/db.js');
const probeSize = require('probe-image-size');

/*
const Discord = require('discord.js');
const client = new Discord.Client();


client.on('ready', async () => {
    let msg = await client.channels.get('557308996701257772').fetchMessage('674642702981267456');
  console.log(msg.embeds[0].thumbnail, msg.embeds[0].provider)
})
*/


client.login(process.env.TOKEN).catch(ex => {throw ex});

