require('dotenv').config();
const Discord = require('discord.js');
const db = require('quick.db');
const { Client } = require('discord.js');
const client = new Client({partials: ["MESSAGE","CHANNEL","REACTION"]});
const createCaptcha = require('./captcha');
const fs = require('fs').promises;
client.login(process.env.BOT_TOKEN);

client.on('ready', () => {
  client.user.setActivity("Kang Baso Development", {
    type: "LISTENING"
  })
    console.log(`${client.user.tag} has logged in.`);
});

let countChannel = {
  total: "726978439982088224",
  member: "726978816697827351",
  bots: "726978508672467035",
  serverID: "725200919050059797"
} 

client.on('guildMemberAdd', async member => {
    if (member.guild.id !== countChannel.serverID) return; // Avoid leaking.
  
  client.channels.cache.get(countChannel.total).setName(`Total Users: ${member.guild.memberCount}`);
  client.channels.cache.get(countChannel.member).setName(`Members: ${member.guild.members.cache.filter(m => !m.user.bot).size}`);
  client.channels.cache.get(countChannel.bots).setName(`Bots: ${member.guild.members.cache.filter(m => m.user.bot).size}`);

  const captcha = await createCaptcha();
    try {
        const msg = await member.send('You have 60 seconds to solve the captcha', {
            files: [{
                attachment: `${__dirname}/captchas/${captcha}.png`,
                name: `${captcha}.png`
            }]
        });
        try {
            const filter = m => {
                if(m.author.bot) return;
                if(m.author.id === member.id && m.content === captcha) return true;
                else {
                    m.channel.send('You entered the captcha incorrectly.');
                    return false;
                }
            };
            const response = await msg.channel.awaitMessages(filter, { max: 1, time: 20000, errors: ['time']});
            if(response) {
                await msg.channel.send('You have verified yourself!');
                await member.roles.add('725204496074145842');
                await fs.unlink(`${__dirname}/captchas/${captcha}.png`)
                    .catch(err => console.log(err));
            }
        }
        catch(err) {
            console.log(err);
            await msg.channel.send('You did not solve the captcha correctly on time ! \nUse this link to rejoin: https://discord.gg/tbFwEQz');
            await member.kick();
            await fs.unlink(`${__dirname}/captchas/${captcha}.png`)
                    .catch(err => console.log(err));
        }
    }
    catch(err) {
        console.log(err);
    }
});

client.on("guildMemberRemove", member => {
  if (member.guild.id !== countChannel.serverID) return;
  
  client.channels.cache.get(countChannel.total).setName(`Total Users: ${member.guild.memberCount}`);
  client.channels.cache.get(countChannel.member).setName(`Members: ${member.guild.members.cache.filter(m => !m.user.bot).size}`);
  client.channels.cache.get(countChannel.bots).setName(`Bots: ${member.guild.members.cache.filter(m => m.user.bot).size}`);
})

client.on("messageReactionAdd", async (reaction, user) => {
  // If a message gains a reaction and it is uncached, fetch and cache the message.
  // You should account for any errors while fetching, it could return API errors if the resource is missing.
  if (reaction.message.partial) await reaction.message.fetch(); // Partial messages do not contain any content so skip them.
  if (reaction.partial) await reaction.fetch();
  
  if (user.bot) return; // If the user was a bot, return.
  if (!reaction.message.guild) return; // If the user was reacting something but not in the guild/server, ignore them.
  if (reaction.message.guild.id !== "725200919050059797") return; // Use this if your bot was only for one server/private server.
  
  if (reaction.message.channel.id === "726983204665426001") { // This is a #self-roles channel.
    if (reaction.emoji.name === "🎉") {
      await reaction.message.guild.members.cache.get(user.id).roles.add("726985152282099763") // Minecraft role.
      return user.send("Giveaway Hunter role was given!").catch(() => console.log("Failed to send DM."));
    }
    
    if (reaction.emoji.name === "🏓") {
      await reaction.message.guild.members.cache.get(user.id).roles.add("726985982737514496"); // Roblox role.
      return user.send("Notification Team role was given!").catch(() => console.log("Failed to send DM."));
    }
  } else {
    return; // If the channel was not a #self-roles, ignore them.
  }
})

client.on("messageReactionRemove", async (reaction, user) => {
  // We're gonna make a trigger, if the user remove the reaction, the bot will take the role back.
  if (reaction.message.partial) await reaction.message.fetch();
  if (reaction.partial) await reaction.fetch();
  
  if (user.bot) return;
  if (!reaction.message.guild) return;
  if (reaction.message.guild.id !== "725200919050059797") return;
  
  if (reaction.message.channel.id === "726983204665426001") {
    if (reaction.emoji.name === "🎉") {
      await reaction.message.guild.members.cache.get(user.id).roles.remove("726985152282099763") // Minecraft role removed.
      return user.send("Giveaway Hunter role was taken!").catch(() => console.log("Failed to send DM."));
    }
    
    if (reaction.emoji.name === "🏓") {
      await reaction.message.guild.members.cache.get(user.id).roles.remove("726985982737514496") // Roblox role removed.
      return user.send("Notifcation Team role was taken!").catch(() => console.log("Failed to send DM."));
    }
  } else {
    return;
  }
})

client.on('message', async message => {
  if (message.author.bot) return; // Ignore if the user is a bot.
  
  let pref = db.get(`prefix.${message.guild.id}`);
  let prefix;
  
  if (!pref) {
    prefix = "^"; // If the server doesn't have any custom prefix, return default.
  } else {
    prefix = pref;
  }
  
  if (!message.content.startsWith(prefix)) return; // use this. so your bot will be only executed with prefix.
  
  let args = message.content.slice(prefix.length).trim().split(/ +/g);
  let msg = message.content.toLowerCase();
  let cmd = args.shift().toLowerCase();
  
  if (msg.startsWith(prefix + "reaction-roles")) {
    let channel = client.channels.cache.get("726983204665426001")//We want to sent the embed, directly to this channel.
    const embed = new Discord.MessageEmbed()
    .setColor(0xffffff)
    .setTitle("Pick your roles!")
    .setDescription(`**🎉 Giveaway Hunter**\n\n**🏓 Notification Team**`) // We're gonna try an unicode emoji. Let's find it on emojipedia.com !
    channel.send(embed).then(async msg => {
      await msg.react("🎉");
      await msg.react("🏓");
      // We're gonna using an await, to make the react are right in order.
    });
  };
});
client.on('messageReactionAdd', async (reaction, user) => {
    const handleStarboard = async () => {
        const starboard = client.channels.cache.find(channel => channel.name.toLowerCase() === 'starboard');
        const msgs = await starboard.messages.fetch({ limit: 100 });
        const existingMsg = msgs.find(msg => 
            msg.embeds.length === 1 ?
            (msg.embeds[0].footer.text.startsWith(reaction.message.id) ? true : false) : false);
        if(existingMsg) existingMsg.edit(`${reaction.count} - 🌟`);
        else {
            const embed = new Discord.MessageEmbed()
                .setAuthor(reaction.message.author.tag, reaction.message.author.displayAvatarURL())
                .addField('Url', reaction.message.url)
                .setDescription(reaction.message.content)
                .setFooter(reaction.message.id + ' - ' + new Date(reaction.message.createdTimestamp));
            if(starboard)
                starboard.send('1 - 🌟', embed);
        }
    }
    if(reaction.emoji.name === '🌟') {
        if(reaction.message.channel.name.toLowerCase() === 'starboard') return;
        if(reaction.message.partial) {
            await reaction.fetch();
            await reaction.message.fetch();
            handleStarboard();
        }
        else
            handleStarboard();
    }
});

client.on('messageReactionRemove', async (reaction, user) => {
    const handleStarboard = async () => {
        const starboard = client.channels.cache.find(channel => channel.name.toLowerCase() === 'starboard');
        const msgs = await starboard.messages.fetch({ limit: 100 });
        const existingMsg = msgs.find(msg => 
            msg.embeds.length === 1 ? 
            (msg.embeds[0].footer.text.startsWith(reaction.message.id) ? true : false) : false);
        if(existingMsg) {
            if(reaction.count === 0)
                existingMsg.delete({ timeout: 2500 });
            else
                existingMsg.edit(`${reaction.count} - 🌟`)
        };
    }
    if(reaction.emoji.name === '🌟') {
        if(reaction.message.channel.name.toLowerCase() === 'starboard') return;
        if(reaction.message.partial) {
            await reaction.fetch();
            await reaction.message.fetch();
            handleStarboard();
        }
        else
            handleStarboard();
    }
})