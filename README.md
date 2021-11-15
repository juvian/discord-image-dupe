Discord Image Duplicate Detection
=================

This is a bot that keeps track of images in configured channels and lets you know when a duplicate is posted. Useful on servers with image posting channels such as wallpapers. Multiple servers supported. To check for duplicate images it uses the [blockhash](https://github.com/commonsmachinery/blockhash-js) library. When a duplicate is detected, a ♻ reaction is made on the message and if configured, a detailed embed is made on log channel.

Getting Started
--------------

After inviting bot to your server, use !watch command to start tracking images from selected channel. It will take a while before it scans older messages from the channel to identify old images. By default it tracks images up to 30 days ago, you can change this with !history command. You can check progress with !missing hashes and !missing process. It is also recommended to use !set log command to choose a channel where the duplicate image info will be posted. Without this, only a ♻ reaction will be seen on new duplicated content.

Feel free to dm me any questions to **juvian#4621**


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
- unwatch: takes a channel id or name and stops keeping track of its images. Only availale to admins
- config: shows current server configuration. Only available to mods
- help: displays link to github
- set time leeway: sets the amount of minutes to allow same author to post images without getting flagged. The default is 5 and this prevents cases where an user posts similar images from a set like girl with eyes open and then closed. Set to 0 for no leeway
- group: if you don't want to compare images against all others from server, you can make groups! An image will be compared against all images from channels with same group as channel it was posted. 

**Note: admin is either someone with the configured admin role or with administrator permissions. A mod is someone with the configured mod role or with manage guild permission**

Plugins
-------------

Plugins extend the functionality of the bot, and are great to build upon without changing other files that might conflict with future bot changes.

**topPosters**
-------------
This plugin adds a way to view how many images were posted by each user in a scoreboard. Commands:
- top: shows scoreboard. Can optionally add date from and date to for only counting within range. Note that the count is over the images bot has already scanned and kept, so the amount of history days it keeps is relevant for it
- top?: shows example of usage with date range
- reset top: resets scoreboard. Actually, it just changes the default from date of !top command to current date. Can be changed to a specific date adding the date parameter
- reset top?: shows example using date

There are a few .env settings related to this plugin:
- ALLOW_TOP=true (enables commands)
- TOP_PAGE_LIMIT=10 (sets the amount of users to show for each page with !top. 10 is the default so unless you want another amount line is not needed)
- EMOJI_LEFT=778664915085819914 (emoji id to use for scoreboard pagination to go to previous page)
- EMOJI_RIGHT=778664914650791969 (emoji id to use for scoreboard pagination to go to next page)

To get the id of an emoji you can either right click and open link and see the number before the .png part or you can write add a \ character before the emoji and submit it in a message and it will show its id

For Developers
------------
You can add commands as plugins by adding a file in plugins folder, look at plugins/messageCount.js for an example.
Necessary variables to setup in .env:

- BOT_OWNER= user id of bot owner
- TOKEN= bot token to login

**How to host the bot yourself**
-------------------------------
- Get a server where you will host it
- Install node
- Download code
- Run npm install in code directory
- Go to discord developer portal, create an app and then create a bot. Get the token
- Create a .env file setting BOT_OWNER and TOKEN as stated above
- Create a folder named .data (mkdir .data in cmd)
- Install dotenv: npm install dotenv --save
- Run bot: node -r dotenv/config bot/index.js

Common issues
----------------
Sometimes things don't install well and it does not work, in that case you can try:
- Remove node_modules folder
- Remove package-lock.json file
- Run npm cache clean --force
- Run again npm install
- Install dotenv again
- Run bot again

