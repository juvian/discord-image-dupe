const db = require('./bot/db.js');

(async function () {
  let res = await db.images.find({guildId: {$ne: "535395010485682176"}}).sort({createdTimestamp: -1}).limit(5);
  console.log(res)
}())