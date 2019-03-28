const dbUtils = require('../utils/db.js')
const bot = require('../bot/index.js')

function requireRole(role, func) {
  return async function (message) {
    let serverConfig = await dbUtils.getServerConfig();
    if (message.isCommand && message.author.id != process.env.BOT_OWNER && message.guild.owner.id != message.author.id && (role == "owner" || (message.member.roles.map(String.toLowerCase).includes(serverConfig[role]) == false && message.member.roles.map(String.toLowerCase).includes(serverConfig.adminRole) == false))) {
       return await bot.notify(message, "Insufficient Permissions");
    } else {
       await func.apply(func, Array.from(arguments));
    }
  }
}

function admin (func) {
  return requireRole("adminRole", func);
}

function mod (func) {
  return requireRole("modRole", func);
}

function owner (func) {
  return requireRole("owner", func);
}

module.exports = {
  admin: admin,
  mod: mod
}