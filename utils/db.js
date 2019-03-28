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

async function getImageHashes (imageIds) {
  return db.images.find({$or: [{_id: {$in: imageIds}}, {messageId: {$in: imageIds}}]});
}


async function addRelatedInfo (images) {
  let userIds = new Set(images.map(i => i.author))
  let users = await db.users.find({_id: {$in: Array.from(userIds)}});
  let usersMap = new Map(users.map(u => [u._id, u]));

  userIds.forEach(async userId => {
    if (usersMap.get(userId) == null) {
      let user = await bot.client.fetchUser(userId);
      user = await addUser(user);
      usersMap.set(user._id, user);
    }
  })

  images.forEach(message => {
    message.author = usersMap.get(message.author.toString());
    message.channelName = bot.client.channels.get(message.channelId).name;
  });
}


function compactImages () {
    db.images.persistence.compactDatafile();
}

async function deleteOldImages (channelIds) {  
  for (let channelId of channelIds) {
    let channel = bot.client.channels.get(channelId);
    if (channel) { 
      let config = await getChannelConfig(channel);
      let days = config.history;

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

async function addUser (author) {
  let user = {
    _id: author.id,
    avatarUrl: author.avatarUrl,
    displayAvatarURL: author.displayAvatarURL,
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
  deleteVeryOldImages: deleteVeryOldImages
}