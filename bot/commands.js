const dbUtils = require('../utils/db.js');
const RichEmbed = require('discord.js').RichEmbed;
const blockHash = require('../libs/blockhash.js');
const bot = require('../bot/index.js');
const db = require('../bot/db.js');
const permissions = require('../bot/permissions.js');
const botUtils = require('../bot/utils.js');
const imageUtils = require('../utils/image.js');
const fs = require('fs');
const dmCommands = require('../bot/dm-commands.js').commands;

async function showMissingHashes (message) {
    let qty = await db.images.count({hash: {$exists: false}, guildId: message.guild.id});
    await bot.notify(message, qty + ' images left without hash');  
}

async function showMissingProcess (message) {
    let qty = await db.images.count({processed: {$ne: true}, guildId: message.guild.id});
    await bot.notify(message, qty + ' images left without checking duplicates');
}

async function deleteImage (message, args) {
  if (args.length == 0) return bot.notify(message, "Missing parameters. Usage: !delete image id where id is the image id or message id") 
  let qty = await db.images.remove({$or: [{_id: args[0], guildId: message.guild.id}, {messageId: args[0], guildId: message.guild.id}]});
  
  if (qty) return bot.notify(message, "Deleted " + qty + " images");
  return bot.notify(message, "No image found");
}


async function calculateDifference (message, args) {
    if (args.length < 2) return bot.notify(message, "Missing parameters. Usage: !difference id id")
    
    let hashes = (await dbUtils.getImageHashes(args.slice(0, 2))).map(i => i.hash)
  
    if (hashes.length == 2) 
      bot.notify(message, "There is a difference of " + blockHash.hammingDistance(hashes[0], hashes[1]) + " bits"); 
    else 
      bot.notify(message, "Could only find " + hashes.length + " images with those ids");
}

async function setHistoryDuration (message, args) {
    if (args.length < 1 || parseInt(args[1]) < 0) return bot.notify(message, "Invalid usage. Usage: !history channel days where days is the amount of days to preserve and channel is server/channelId/channelName")
    
    if (parseInt(args[1]) > 90) return bot.notify(message, "90 days is the maximum");
  
    if (args[0] == 'server' && parseInt(args[1])) {
      await db.servers.update({_id: message.guild.id}, {$set: {history: parseInt(args[1])}});
      await bot.react(message, "✅");
      return await dbUtils.deleteOldImages(message.guild.channels.array().map(c => c.id));
    }
    
    let channel = botUtils.getChannel(args[0], message);  
    let config = await dbUtils.getChannelConfig(channel);  
    if (!config) return bot.notify(message, "Channel is not on watch list, add it first using !watch");

    await db.channels.update({_id: channel.id}, {$set: {history: parseInt(args[1])}, $unset: {after: true, before: true}});
    await bot.react(message, "✅");
    await dbUtils.deleteOldImages([channel.id]);
}

async function closestMatch (message, args) {
    if (args.length == 0) return bot.notify(message, "Missing parameters. Usage: !closest id where id is image id or message id")
    let id = args[0];

    let images = await dbUtils.getImageHashes([id])
    
    if (images.length == 1) {
      let records = await db.images.find({hash: {$exists: true}, guildId: images[0].guildId});
      let closest = {img: null, dist: 10000};
       
      records.forEach((record) => {
       let dist = blockHash.hammingDistance(images[0].hash, record.hash);
       if (closest.dist > dist && images[0]._id != record._id) {
           closest = {img: record, dist: dist}
       }
      });
      
      if (closest.img == null) {
        return bot.notify(message, "There are no images to compare")
      }
      await dbUtils.addRelatedInfo([images[0], closest.img]);
         
      const embed = new RichEmbed().setDescription("Closest image to " +`${imageUtils.imageInfo(images[0], true)} is \n ${imageUtils.imageInfo(closest.img, true)} with ${closest.dist} bits of difference`);
      embed.setThumbnail(closest.img.url);
      await bot.notify(message, embed);             
    } else if (images.length > 1) {
      await bot.notify(message, "Too many images found with id " + id);
    } else {
      await bot.notify(message, "Could find no image with id " + id);
    }
}

async function setRole (message, args) {
  if (args.length == 0) return bot.notify(message, `Not enough parameters. Usage: !set ${this} role rolename`);
  if (message.guild.roles.some(r => r.name == args[0])) {
    await db.servers.update({_id: message.guild.id}, {$set: {[this + "Role"]: args[0]}});
    await bot.react(message, "✅");
  } else {
    return bot.notify(message, `There is no role named ${args[0]} on server`)
  }
}

async function setLogChannel (message, args) {
  if (args.length == 0) return bot.notify(message, "Invalid usage. Usage: !set log channelName where channelName is either the name or id of the channel")
  let channel = botUtils.getChannel(args[0], message);  
  await db.servers.update({_id: message.guild.id}, {$set: {logChannel: channel.id}});
  await bot.react(message, "✅");
}

async function unsetLogChannel (message) {
  await db.servers.update({_id: message.guild.id}, {$unset: {logChannel: true}});
  await bot.react(message, "✅");
}

async function setCommandsPrefix (message, args) {
  if (args.length == 0) return bot.notify(message, "Invalid usage. Usage: !set prefix prefixString")
  await db.servers.update({_id: message.guild.id}, {$set: {prefix: args[0]}});
  await bot.react(message, "✅");
}

async function watchChannel (message, args) {
    if (args.length == 0) return bot.notify(message, "Missing parameters. Usage: !watch channel where channel is either the name or id of the channel")
    let channel = botUtils.getChannel(args[0], message);  
    
    if ((await db.channels.findOne({_id: channel.id})) == null) {
      await db.channels.insert({_id: channel.id});
    }
  
    await bot.react(message, "✅");
}

async function unwatchChannel (message, args) {
    if (args.length == 0) return bot.notify(message, "Missing parameters. Usage: !unwatch channel where channel is either the name or id of the channel")
    let channel = botUtils.getChannel(args[0], message);  
    let ids = [];

    await db.channels.remove({_id: channel.id});

    if (channel.type == "category") {
      for (let child of channel.children.array()) {
        await db.channels.remove({_id: child.id});
        ids.push(child.id);
      }
    } else {
      ids.push(channel.id);
    }
  
    await bot.react(message, "✅");
    await dbUtils.deleteOldImages(ids, message.guild.id); 
}

async function showConfig (message) {
  let server = await dbUtils.getServerConfig(message.guild.id);
  
  let status = [];
  
  status.push(`Command prefix: **${server.prefix}**`)
  status.push(`Server history: **${server.history}** days`);
  status.push(`Bot mod role: **${server.modRole}**. Bot admin role: **${server.adminRole}**`);
    
  for (let channel of message.guild.channels.array()) {
      let config = await dbUtils.getChannelConfig(channel);
      if (config) {
        status.push(`${channel.name} history **${config.history}** days ${config.group ? ' group: **' + config.group + '**' : ''}`);
      }
  };
  
  status.push(`Time leeway: ` + dbUtils.getLeeway(server) + ' minutes');
  
  status.push(server.logChannel ? `Log channel: **${message.guild.channels.get(server.logChannel).name}**` : 'No log channel configured' );  
  
  await bot.notify(message, status.join('\n'));
}



async function help (message) {
  return bot.notify(message, "<https://github.com/juvian/discord-image-dupe>")
}

async function setTimeLeeway (message, args) {
    if (args.length == 0 || parseInt(args[0]) < 0) return bot.notify(message, "Missing parameters. Usage: !set time leeway minutes where minutes is the amount of minutes to allow the same user to post similar images without getting marked as duplicate")
    
    await db.servers.update({_id: message.guild.id}, {$set: {timeLeeway: parseInt(args[0])}});
    await bot.react(message, "✅");
}

async function setGroup(message, args) {
  if (args.length <= 1) return bot.notify(message, "Missing parameters. Usage: !group channel groupname where channel is either the name or id of the channel. Images are only compared against channels with same group");
  let channel = botUtils.getChannel(args[0], message); 
  
  let config = await dbUtils.getChannelConfig(channel);  
  if (!config) return bot.notify(message, "Channel is not on watch list, add it first using !watch");
  
  await db.channels.update({_id: channel.id}, {$set: {group: args[1]}});
  await bot.react(message, "✅");
}

var commands = {
    'missing hashes': permissions.mod(showMissingHashes),
    'delete image': permissions.mod(deleteImage),
    'missing process' : permissions.mod(showMissingProcess),
    'difference' : calculateDifference,
    'history' : permissions.admin(setHistoryDuration),
    'closest': closestMatch,
    'set admin role': permissions.owner(setRole.bind('admin')),
    'set mod role': permissions.owner(setRole.bind('mod')),
    'set log': permissions.admin(setLogChannel),
    'unset log': permissions.admin(unsetLogChannel),
    'set prefix': permissions.admin(setCommandsPrefix),
    'watch': permissions.admin(watchChannel),
    'unwatch': permissions.admin(unwatchChannel),
    'config': permissions.mod(showConfig),
    'set time leeway': permissions.mod(setTimeLeeway),
    'group': permissions.mod(setGroup),
    'help': help 
}


function isVisible (command, message) {
  return command && command.visibility instanceof Function ? command.visibility(message) : true;
}

async function processCommands(commands, command, message) {
  try{
    if (command == "commands") return bot.notify(message, Object.keys(commands).filter(command => isVisible(commands[command], message)).join(', '));
    if (commands.hasOwnProperty(command.toLowerCase()) && isVisible(commands[command], message)) {
        return await commands[command](message, command.toLowerCase().split(command)[1].split(/ +/).filter(s => s.length));
    } else {
        for (var cmd in commands) {
            if (command.toLowerCase().startsWith(cmd + ' ') && isVisible(commands[cmd], message)) {
                return await commands[cmd](message, command.split(cmd)[1].split(/ +/).filter(s => s.length))
            }
        }
        return bot.notify(message, "Command not recognized, do !commands for list of commands");
    }
  } catch (ex) {
      if (ex instanceof botUtils.CustomError) return bot.notify(message, ex.message);
      return bot.logError(message, "An error occured processing " + command + ": " + ex.message); 
  } 
}

module.exports.processCommand = function (command, message) {
  message.isCommand = true;
  return processCommands(commands, command, message);
  message.isCommand = false;
}

module.exports.processDM = function (command, message) {
  if (message.author.id == process.env.BOT_OWNER) {
    message.isCommand = true;
    return processCommands(dmCommands, command, message)
    message.isCommand = false;
  }
}

fs.readdirSync("./plugins/").forEach(function(file) {
    if (file == "index.js") return;
    var name = file.substr(0, file.indexOf('.'));
    let cmds = require('../' + 'plugins/' + name + '.js');
    Object.assign(commands, cmds.commands);
    Object.assign(dmCommands, cmds.dmCommands);
});


module.exports.commands = commands;