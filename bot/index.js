const Discord = require('discord.js');
const client = new Discord.Client();
const RichEmbed = Discord.RichEmbed;
const dbUtils = require('../utils/db.js')
const imageUtils = require('../utils/image.js')
const commands = require('../bot/commands.js')
const db = require('../bot/db.js');
const botUtils = require('../bot/utils.js')

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}! in ${client.guilds.size} servers`);
  dbUtils.deleteVeryOldImages();
  doWork();
});

client.on("message", async message => {
  if (!message.guild) return await commands.processDM(message.content, message);
  try{
    message.channel.config = await dbUtils.getChannelConfig(message.channel);
    await checkCommands(message);
    if (message.channel.config) {
      await updateMessagesFromChannel(message);  
      await doWork();
    }
  } catch (ex){console.log(ex)}
});

client.on("messageUpdate", async (oldMessage, newMessage) => {
  let config = await dbUtils.getChannelConfig(newMessage.channel);
  processMessages([newMessage], config);
});

setInterval(doWork, 60000)

async function doWork () {
  try {
    await imageUtils.calculateMissingHashes()
    await imageUtils.findDuplicates();
    dbUtils.compactImages(); 
  } catch (ex){console.log(ex)}
}

client.on("messageDelete", async message => {
  await db.images.remove({messageId: message.id}, {multi: true});
})

async function updateMessagesFromChannel (message) {  
  if (message.channel.config) {
      await processMessagesFromChannel(message, message.channel.config, "after"); 
  }
}

async function processMessagesFromChannel (message, config, field) {
  let days = config.history;
  let now = new Date();
  now.setDate(now.getDate() - days);

  while (true) {
    let opts = {limit: 100, [field]: config[field]}
    let messages = await client.channels.get(config._id).fetchMessages(opts);
    let updates = {_id: config._id}
    await processMessages(messages.array(), config);

    if (messages.size) {
      updates[field] = config[field] = (field == 'before' ? messages.lastKey() : messages.firstKey());
    }

    await db.channels.update({_id: config._id}, {$set: updates});
    
    if (messages.size < 100 || (now.getTime() > messages.last().createdTimestamp)) {
      if (field == "after") field = "before";
      else {
        return await db.channels.update({_id: config._id}, {$set: {scannedOnce: true}});
      }
    }
  }
  
  await dbUtils.deleteOldImages([message.channel.id], message.guild.id);
}

processMessagesFromChannel = botUtils.channelLock(processMessagesFromChannel);

async function processMessages (messages, config) {
  if (!config) return;
  
  messages.forEach(async message => {     
    let added = false;
    botUtils.getAttachmentsAndEmbedsFrom(message).forEach(async attachment => {
      let extension = attachment.url.split(".").pop();
      
      if (attachment.width && attachment.height && extension.startsWith('jpg') || extension.startsWith('png')) {
        let image = {
          _id: attachment.id,
          url: attachment.url,
          createdTimestamp: message.createdTimestamp,
          author: message.author.id,
          messageId: message.id,
          messageUrl: message.url,
          channelId: message.channel.id,
          guildId: message.guild.id
        }

        if (config.scannedOnce != true) image.processed = true;
        
        await db.images.update({_id: image._id}, {$set: image}, {upsert: true});

        added = true;
      }
    });  
    
    if (added) {
      await dbUtils.addUser(message.author);
    }
  });  
}

async function checkCommands (message) {
    let serverConfig = await dbUtils.getServerConfig(message.guild.id);
    if (message.content.startsWith(serverConfig.prefix) && !message.author.bot) {
      await commands.processCommand(message.content.substring(serverConfig.prefix.length), message);
    }
}

module.exports.logError = async function (msg, error) {
  console.log("logError", error)
  if (error && error.toString().trim())
    try {
      await client.channels.get(msg.channel.id).send(error.toString().trim()); 
    } catch (ex) {console.log(ex)};
}

module.exports.notify = async function (msg, message) {
  if (message && (message instanceof RichEmbed || message.toString().trim()))
    try {
      await client.channels.get(msg.channel.id).send(message instanceof RichEmbed ? message : message.toString().trim());
    } catch (ex) {console.log(ex)}
}

module.exports.react = async function (msg, reaction) {
  if (msg)
    await msg.react(reaction);
}

module.exports.client = client;
module.exports.updateMessagesFromChannel = updateMessagesFromChannel;

client.login(process.env.TOKEN);

