Discord Image Duplicate Detection
=================

This is a bot that keeps track of images in configured channels and lets you know when a duplicate is posted. Useful on servers with image posting channels such as wallpapers. Multiple servers supported. To check for duplicate images it uses the [blockhash](https://github.com/commonsmachinery/blockhash-js) library. When a duplicate is detected, a ♻ reaction is made on the message and if configured, a detailed embed is made on log channel.

Feel free to dm me any questions to **Juvian#4369**


Commands
------------

- commands: Shows available commands depending on your permissions
- missing hashes: Shows how many images are currently queued for calculating its hash (necessary for duplicate detection). Only available to mods or admins
- delete image: takes an image id or message id as parameter and deletes from internal database the referenced images. Only available to mods or admins
- missing process: Shows how many images already have their hash but have not been compared against others to check for duplicates. Only available to mods or admins
- difference: takes 2 image ids or message ids and calculates the hash difference between them (under 10 is usually the same or a slight variation)
- history: set the amount of days the server/channel will keep track of images. Maximum is 90. Category channels also work. If the history of a channel has not been defined, it uses the configuration of its category. If that is not defined either, it uses the configuration of the server. Default for server is 30. Messages will need to be reprocessed if this changes, use sparingly. Only available to admins
- closest: takes 1 image id or message id and returns info on closest image to that one
- set admin role: takes a role name to be considered the admin role. All users with this role can use admin commands. The default one is Futaba Admin. Only available to server owner
- set mod role: takes a role name to be considered the mod role. All users with this role can use mod commands. The default one is Futaba Mod. Only available to server owner
- set log: takes a channel id or name and sets it as the log channel. Here detailed information on duplicates will be posted. It is important to have this  set to avoid thinking an image with a ♻ reaction is a duplicate when it could be just a false positive (if not, can use closest command to know). Only availale to admins
- unset log: removes log channel from server configuration. Only availale to admins
- set prefix: Sets command prefix. Default is `!`. Only availale to admins
- watch: takes a channel id or name and starts keeping track of its images according to history. Only availale to admins
- unwatch: takes a channel id or name and stops keeping track of its images. . Only availale to admins
- config: shows current server configuration. Only available to mods
- help: displays link to here

**Note that server owner or bot owner bypasses all permissions**


For Developers
------------
You can add commands as plugins by adding a file in plugins folder, look at plugins/messageCount.js for an example.
Necessary variables to setup in .env:

- BOT_OWNER: user id of bot owner
- TOKEN: bot token to login


