class CustomError extends Error {}

let processing = {}

function getChannel (channel, message) {
  let channels = message.guild.channels.array().filter(c => c.id == channel || c.name == channel || "<#" + c.id + ">" == channel);
  if (channels.length == 0) {
    throw new CustomError(channel + " does not exist");
  }
  return channels[0];
}

function lock (func, key) {
  let cache = processing[func.name] = processing[func.name] || {};
  
  return async function () {
    let id = key instanceof Function ? key(Array.from(arguments)) : key;
    if (cache[id]) {
      if (key != "global") throw "Command already running"
      else return;
    }
    cache[id] = true;
    try {
      await func.apply(func, Array.from(arguments));
    } catch (ex) {
        throw ex;
    } finally {
        delete cache[id];
    }
  }
}

function serverLock (func) {
  return lock(func, (args) => args[0].guild.id);
}

function channelLock (func) {
  return lock(func, (args) => args[0].channel.id);
}

function globalLock (func) {
  return lock(func, "global");
}

function getAttachmentsAndEmbedsFrom (message) {  
    let msgs = message.attachments.array();
    
    message.embeds.forEach(function(embed,index){
        let image = embed.image || embed.thumbnail;
        if ((embed.type == 'image' || (embed.type == 'rich' && embed.url)) && image) {
            image.id = message.id + '-' + index;
            msgs.push(image)
        }
    });
  
  return msgs;
} 

function getDefaultChannel (guild) {
  return guild.channels.get(guild.id) ||
         guild.channels.find(channel => channel.name === "general") ||
         guild.channels
   .filter(c => c.type === "text" &&
     c.permissionsFor(guild.client.user).has("SEND_MESSAGES"))
   .sort((a, b) => a.position - b.position)
   .first();
}

module.exports = {
  getChannel: getChannel,
  serverLock: serverLock,
  channelLock: channelLock,
  globalLock: globalLock,
  lock: lock,
  getAttachmentsAndEmbedsFrom: getAttachmentsAndEmbedsFrom,
  processing: processing,
  CustomError: CustomError,
  getDefaultChannel: getDefaultChannel
}