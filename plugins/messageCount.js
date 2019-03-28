const bot = require('../bot/index.js');
const botUtils = require('../bot/utils.js');

async function messageCount (msg, params) {  
    if (params.length < 2) return bot.notify(msg, 'Not enough parameters. Usage: !count messages 540405532197126163 2014-04-07T13:58:10.104Z 2019-04-07T13:58:10.104Z')
    params[1] = new Date(params[1])
    params[2] = params.length > 2 ? new Date(params[2]) : new Date();
    
    params[1].setMinutes(params[1].getMinutes() + params[1].getTimezoneOffset())
    params[2].setMinutes(params[2].getMinutes() + params[2].getTimezoneOffset())
  
    let message = await bot.client.channels.get(process.env.MESSAGE_COUNT_CHANNEL).fetchMessage(params[0]);

    let role = message.guild.roles.find(role => role.name === "Giveaway Entry");
    let winnersRole = message.guild.roles.find(role => role.name === "Giveaway Winner");
    if (!role || !winnersRole) return bot.notify(msg, 'role not found');

    let response = '';   
    let errors = ''

    let reaction = message.reactions.find((r) => r.emoji.name == '☑');

    if (reaction) {
      let interestingUsers = (await reaction.fetchUsers()).filter((u) => !u.roles.has(winnersRole)).map((u) => u.id)
      let users = {}
      for (let channelId of process.env.CHANNELS_TO_COUNT.split(',')) {
          let messages = await bot.client.channels.get(channelId).fetchMessages({limit: 100});
          while (messages.size) {
              messages.array().forEach((message) => {
                  if (message.createdTimestamp <= params[2].getTime() && message.createdTimestamp >= params[1].getTime()) {
                    users[message.author.id] = users[message.author.id] || {count: 0, username: message.author.username}
                    users[message.author.id].count++;
                  }
              })
              if (messages.array()[0].createdTimestamp < params[1].getTime()) break;
              messages = await bot.client.channels.get(channelId).fetchMessages({limit: 100, before: messages.lastKey()});
          }
      };

      let newUsers = new Set();   

      for (let userId in users) {
          if (users[userId].count >= 100 && interestingUsers.includes(userId)) {
            response += users[userId].username + ": " + users[userId].count + '\n';
            newUsers.add(userId);
            try{
              await message.guild.members.get(userId).addRole(role);
            } catch (ex) {
              errors += 'Could not add role to ' + users[userId].username + '\n';
            }
          }
      }    

      for (let member of role.members.array()) {
        if (newUsers.has(member.user.id) == false) {
          try {
            await member.removeRole(role);
          } catch (ex) {
            errors += 'Could not remove role from ' + member.user.username + '\n';
          }
        }
    }

      bot.notify(msg, "Count messages done \n" + response + '\n' + errors);
    } else {
      bot.notify(msg, "No ☑ reactions found on message");
    }
}

messageCount.visibility = (message) => message.guild.id == process.env.COUNT_SERVER;

module.exports = {
  commands: {
    'count messages': botUtils.serverLock(messageCount)
  }
}