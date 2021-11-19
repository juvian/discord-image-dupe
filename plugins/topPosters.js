const bot = require('../bot/index.js');
const botUtils = require('../bot/utils.js');
const dbUtils = require('../utils/db.js');
const db = require('../bot/db.js');
const RichEmbed = require('discord.js').RichEmbed;
const permissions = require('../bot/permissions.js');

const EMOJI_LEFT = process.env.EMOJI_LEFT || '⏪';
const EMOJI_RIGHT = process.env.EMOJI_RIGHT || '⏩';
const PAGE_LIMIT = Number(process.env.TOP_PAGE_LIMIT || "10");
const ALLOW_TOP = process.env.ALLOW_TOP == 'true';
const COUNTER_TEXT = process.env.COUNTER_TEXT || 'images';

const isSameEmoji = (emoji, str) => emoji.id == str || emoji.name == str;

async function paginate(message, newMessage, embed, page, filters, hasNext) {
    let emojis = await newMessage.awaitReactions((reaction, user) => ((isSameEmoji(reaction.emoji, EMOJI_LEFT) && page > 0) || (isSameEmoji(reaction.emoji, EMOJI_RIGHT) && hasNext)) && user.id == message.author.id, {max: 1, time: 60000}).catch(_ => {});
    if (!emojis || !emojis.first()) return;
    page = isSameEmoji(emojis.first()._emoji, EMOJI_LEFT) ? page - 1 : page + 1;
    embed = await createEmbed(message.guild.id, page, filters);
    await newMessage.edit(embed);

    paginate(message, newMessage, embed, page, filters, embed._qty == PAGE_LIMIT);   
}

async function createEmbed(guildId, page, filters) {
    const topUsers = await getTop(guildId, page, filters);
    const usersMap = await dbUtils.getUsers(topUsers.map(u => u.userId));
    const richEmbed = new RichEmbed();

    richEmbed.setTitle('Scoreboard page ' + (page + 1));
    let lines = [];

    for (let i = 0; i < topUsers.length; i++) {
      const name = usersMap.has(topUsers[i].userId) ? usersMap.get(topUsers[i].userId).tag : topUsers[i].userId;
      lines.push(`${i + (page * PAGE_LIMIT) + 1}.  ${name}  - ${topUsers[i].posts} ${COUNTER_TEXT}`);
    }

    richEmbed.setDescription(lines.join('\n'));

    richEmbed._qty = topUsers.length;

    return richEmbed;
}

async function topPosters(message, params) {
  const filters = {
    from: params.length > 0 ? new Date(params[0]).getTime() : 0,
    to: params.length > 1 ? new Date(params[1]) : new Date().getTime()
  }
  
  if (params.length == 0) {
    const server = await dbUtils.getServerConfig(message.guild.id);
    if (server.scoreboardTimeFrom) filters.from = +server.scoreboardTimeFrom;
  }

  const embed = await createEmbed(message.guild.id, 0, filters);
  const newMessage = await message.channel.send({ content: '', embed });

  if (embed._qty == PAGE_LIMIT) {
    newMessage.react(EMOJI_LEFT).then(() => newMessage.react(EMOJI_RIGHT));
    paginate(message, newMessage, embed, 0, filters, true);
  }
}

function topPostersHelp(message) {
  return bot.notify(message, 'Command top can be used by itself or provide an optional date range such as !top 2014-04-07T13:58:10.104Z 2019-04-07T13:58:10.104Z');
}

async function getTop(guildId, page, filters) {
  console.log("getTop", filters)
  const images = await db.images.find({guildId, createdTimestamp: {$gte: filters.from, $lte: filters.to}});
  const postsByUser = images.reduce((obj, img) => {
    obj[img.author] = (obj[img.author] || 0) + 1;
    return obj;
  }, {});
  return Object.keys(postsByUser).sort((a, b) => postsByUser[b] - postsByUser[a]).slice(page * PAGE_LIMIT, (page + 1) * PAGE_LIMIT).map(userId => ({userId, posts: postsByUser[userId]}));
} 

async function resetTop(message, params) {
  const dt = params.length > 0 ? new Date(params[0]) : new Date().getTime();
  await db.servers.update({_id: message.guild.id}, {$set: {scoreboardTimeFrom: dt}});
  await bot.react(message, "✅");
}

function resetTopHelp(message) {
  return bot.notify(message, 'Command top can be used by itself or provide an optional date such as !reset top 2021-11-22T13:58:10.104Z. It will make !top have that date as the default from range');
}

getTop.visibility = topPostersHelp.visibility = resetTopHelp.visibility = resetTop.visibility = ALLOW_TOP;

module.exports = {
  commands: {
    'top': botUtils.serverLock(topPosters),
    'top?': topPostersHelp,
    'reset top': permissions.admin(resetTop),
    'reset top?': resetTopHelp
  }
}