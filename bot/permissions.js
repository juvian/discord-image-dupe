const dbUtils = require('../utils/db.js')
const bot = require('../bot/index.js')

function permission(verify, action) {
  return async function (message) {
    if (message.isCommand && message.author.id != process.env.BOT_OWNER && message.config && !verify(message, message.config)) {
       return await bot.notify(message, "Insufficient Permissions");
    } else {
       await action.apply(null, Array.from(arguments));
    }
  }
}

function admin (func) {
  return permission((message, config) => message.member.hasPermission('ADMINISTRATOR', false, true, true) || message.member.roles.map(String.toLowerCase).includes(config['adminRole'].toLowerCase()) ,func);
}

function mod (func) {
  return permission((message, config) => message.member.hasPermission('MANAGE_GUILD', false, true, true) || message.member.roles.map(String.toLowerCase).includes(config['modRole'].toLowerCase()), func);
}

function owner (func) {
  return permission((message, config) => message.guild.owner.id == message.author.id, func);
}

module.exports = {
  admin: admin,
  mod: mod,
  owner: owner
}