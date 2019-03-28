var Datastore = require('nedb-promises')

module.exports.images = Datastore.create({ filename: '.data/images', autoload: true, timestampData: false });
module.exports.users = Datastore.create({ filename: '.data/users', autoload: true, timestampData: false });
module.exports.channels = Datastore.create({ filename: '.data/channels', autoload: true, timestampData: false });
module.exports.servers = Datastore.create({filename: '.data/servers', autoload: true, timestampData: false})

module.exports.images.ensureIndex({ fieldName: 'hash' }, console.log);
module.exports.images.ensureIndex({ fieldName: 'createdTimestamp' }, console.log);
module.exports.images.ensureIndex({ fieldName: 'channelId' }, console.log);
module.exports.images.ensureIndex({ fieldName: 'guildId' }, console.log);

