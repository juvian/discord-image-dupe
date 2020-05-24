const db = require('../bot/db.js');
const bot = require('../bot/index.js');

async function getServerConfig (serverId) {
  let config = await db.servers.findOne({_id: serverId});
  if (config == null) {
    config = await db.servers.insert({_id: serverId, prefix: '!', history: 30, modRole: 'Futaba Mod', adminRole: 'Futaba Admin'});
  }
  return config;
}

async function getChannelConfig (channel) {
  let server = await getServerConfig(channel.guild.id);
  let config = await db.channels.findOne({_id: channel.id});
  let parent = await db.channels.findOne({_id: channel.parentID});
  
  if (parent && config == null) {
    config = await db.channels.insert({_id: channel.id});  
  }
  
  if (!parent && !config) return null;

  return Object.assign(server, parent || {}, config);
}

async function getGroupChannels(channelId, guildId) {
  if (bot.client.guilds.get(guildId) == null) return [];
  
  let serverConfig = await getServerConfig(guildId);
  let channels = await bot.client.guilds.get(guildId).channels.array();
  let dbChannels = await db.channels.find({_id: {$in: channels.map(c => c.id)}});
    
  let configs = solveConfigs(channels, dbChannels, serverConfig);
  
  let channel = configs.filter(c => c._id == channelId);
  if (channel.length == 0 || !channel[0].group) return configs;
  else return configs.filter(c => c.group == channel[0].group);
}

function solveConfigs(channels, dbChannels, serverConfig) {
  let configs = dbChannels.reduce((tot, cur) => {
    tot[cur._id] = cur;
    return tot;
  }, {});
  
  return channels.map(c => Object.assign({}, configs[c.parentID] || {}, configs[c.id] || {_id: c.id}))
}

async function getImageHashes (imageIds) {
  return db.images.find({$or: [{_id: {$in: imageIds}}, {messageId: {$in: imageIds}}]});
}


async function addRelatedInfo (images) {
  let userIds = new Set(images.map(i => i.author))
  let users = await db.users.find({_id: {$in: Array.from(userIds)}});
  let usersMap = new Map(users.map(u => [u._id, u]));

  userIds.forEach(async userId => {
    if (usersMap.get(userId) == null) {
      try {
        let user = await bot.client.fetchUser(userId);
        user = await addUser(user);
        usersMap.set(user._id, user);
      } catch (e) {}
    }
  })

  images.forEach(message => {
    message.author = usersMap.get(message.author.toString());
    message.channelName = (bot.client.channels.get(message.channelId) || {name: ""}).name;
  });
}

function getLeeway(config) {
  return config.timeLeeway == null ? 5 : config.timeLeeway;
}

function compactImages () {
    db.images.persistence.compactDatafile();
}

async function deleteOldImages (channelIds) {  
  for (let channelId of channelIds) {
    let channel = bot.client.channels.get(channelId);
    if (channel) { 
      let config = await getChannelConfig(channel);
      let days = (config || {history: 0}).history;

      let now = new Date();
      now.setDate(now.getDate() - days);
      await db.images.remove({createdTimestamp: {$lt: now.getTime()}, channelId: channelId}, {multi: true});
    }
  }
}

async function deleteVeryOldImages () {
  let now = new Date();
  now.setDate(now.getDate() - 90);
  await db.images.remove({createdTimestamp: {$lt: now.getTime()}}, {multi: true});
}

async function markAsProcessed (image) {
    await db.images.update({_id: image._id}, {$set: {processed: true}});
}

async function addUser (author, member) {
  let user = {
    _id: author.id,
    avatarUrl: author.avatarUrl,
    displayAvatarURL: author.displayAvatarURL,
    displayName: member? member.displayName : "",
    username: author.username,
    tag: author.tag
  };
  await db.users.update({_id: user._id}, {$set: user}, {upsert: true});
  return user;
}

module.exports = {
  getServerConfig: getServerConfig,
  compactImages: compactImages,
  getImageHashes: getImageHashes,
  addRelatedInfo: addRelatedInfo,
  deleteOldImages: deleteOldImages,
  markAsProcessed: markAsProcessed,
  addUser: addUser,
  getChannelConfig: getChannelConfig,
  deleteVeryOldImages: deleteVeryOldImages,
  getLeeway: getLeeway,
  getGroupChannels: getGroupChannels
}