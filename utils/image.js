const db = require('../bot/db.js')
const blockHash = require('../libs/blockhash.js')
const timeago = require("timeago.js");
const imageUtils = require('../utils/image.js');
const botUtils = require('../bot/utils.js');
const RichEmbed = require('discord.js').RichEmbed;
const dbUtils = require('../utils/db.js')
const bot = require('../bot/index.js');
const probeSize = require('probe-image-size');
const prettyBytes = require('pretty-bytes');


function imageInfo (image, useMarkdown) {
    image.author = image.author || {username: '?', displayName: '?'}
    return (useMarkdown ? '[' : '') + `${image.width} x ${image.height} (${prettyBytes(image.fileSize || 0)}) posted by ${image.author.displayName || image.author.username} in ${image.channelName} ${timeago.format(image.createdTimestamp)} ${image.diff != null ? '(' + image.diff + ' bits)' : ''}` + (useMarkdown ? `](${image.messageUrl})` : "")
}

function getResizedUrls(imageData, image) {
      let ratio = imageData.width > 800 ? imageData.width / 800 : 1;
      let params = `?width=${Math.floor(imageData.width / ratio)}&height=${Math.floor(imageData.height / ratio)}`;
  
      let urls = [];

      if (image.url.includes("discordapp") && image.width) {
        urls.push(image.url.replace("cdn.discordapp.com", "media.discordapp.net") + (image.url.includes("cdn.discordapp.com") ? params : ''))
      } else {
        urls.push("https://rsz.io/" + image.url.replace("https://", "").replace("http://", "") + params);
        urls.push("http://www.picresize.com/api" + params + "&fetch=" + image.url);
        urls.push(image.url + params);
      }

      urls.push(image.url);
  
      return urls;
}

async function updateImageHash (image, index) {
  if (image && image.hash == null) {
    try {
      if (image.tries >= 3) throw "Too many tries for " + image.url;
      await db.images.update({_id: image._id}, {$inc: {tries: 1}});
      if (index % 100 == 0) dbUtils.compactImages();
      
      let imageData = await probeSize(image.url);
      let urls = getResizedUrls(imageData, image);
      let url;

      while (urls.length && !url) {
        let tempUrl = urls.shift();
        try {
          await probeSize(tempUrl);
          url = tempUrl;
        } catch (ex) {}
      }
      
      let hash = await blockHash.blockhash(url, imageData, 16, 2)
      await db.images.update({_id: image._id}, {$set: {hash: hash, type: imageData.type, fileSize: imageData.length || image.fileSize, width: imageData.width, height: imageData.height}});
    } catch (ex) {
      if (image.tries >= 3) {
        console.log(ex, "image removed", image.url);
        await db.images.remove({_id: image._id});
      } else console.log(ex)
    }
  }
}


async function getImageWithoutHash (message) {
  return await db.images.findOne({hash: {$exists: false}});
}

async function calculateMissingHashes (message) {
  let image = await getImageWithoutHash(message);
  let index = 0;
  
  while (image != null) {
      await updateImageHash(image, index++);
      image = await getImageWithoutHash();
  }
}

function isHigherQuality (img, image) {
    let area1 = img.width * img.height;
    let area2 = image.width * image.height;
    return area1 >= area2 // || (area1 == area2 && img.fileSize > image.fileSize * 0.95);
}


function ratioDiff (img, image) {
    let a1 = img.width * img.height;
    let a2 = image.width * image.height;
    return Math.max(a1 / a2, a2 / a1);
}

function isSimilar (img, image) {
  return blockHash.hammingDistance(img.hash, image.hash) <= Math.min(Math.ceil(6 * ratioDiff(img, image)), 12);
}

let show = i => ({id: i._id, processed: i.processed})

async function findDuplicateHashes () {
    let image = await db.images.find({hash: {$exists: true}, processed: {$ne: true}}).sort({createdTimestamp: 1}).limit(1);
    if (!image.length) return;
    image = image[0];  
    let filters = {createdTimestamp: {$lt: image.createdTimestamp}, guildId: image.guildId, hash: {$exists: true}};
  
    try {
      let channelIds = (await dbUtils.getGroupChannels(image.channelId, image.guildId)).map(c => c._id);
      filters.channelId = {$in: channelIds};
    } catch(ex) {}
  
    let images = (await db.images.find(filters)).filter(im => isSimilar(im, image) && im._id != image._id);
    let messages = {originals: []}
    let config = await dbUtils.getServerConfig(image.guildId);  
    
    images.forEach(img => {
        if (Math.abs(img.createdTimestamp - image.createdTimestamp) / 60000 >= dbUtils.getLeeway(config) || img.author != image.author) {
            img.diff = blockHash.hammingDistance(img.hash, image.hash);
            if (isHigherQuality(img, image)) {
                messages.originals.push(img);
            }
        }
    })
    
    await dbUtils.addRelatedInfo([image].concat(messages.originals));
    return {originals: messages.originals, image: image, config: config};
}

async function findDuplicates () {
    let data = await findDuplicateHashes();
    while (data != null) {
        let config = data.config;  
        if (data.originals.length > 0) {
            const embed = new RichEmbed().setDescription(imageInfo(data.image, true));
            embed.setThumbnail(data.image.url);

            embed.addField('Duplicate of', data.originals.map(v => `${imageInfo(v, true)}`).join("\n").substring(0, 1024))
            let imageMessage;
          
            try {
              imageMessage = await bot.client.channels.get(data.image.channelId).fetchMessage(data.image.messageId);
            } catch (ex) {
              await db.images.remove({_id: data.image._id});
            }
          
            await bot.react(imageMessage, "♻");
            if (config.logChannel) await bot.notify({channel : {id: config.logChannel}}, embed);
        }
        let a = await dbUtils.markAsProcessed(data.image);
        data = await findDuplicateHashes();
    }        
}



module.exports = {
  updateImageHash: updateImageHash,
  calculateMissingHashes: botUtils.globalLock(calculateMissingHashes),
  findDuplicates: botUtils.globalLock(findDuplicates),
  imageInfo: imageInfo,
  getResizedUrls: getResizedUrls
}