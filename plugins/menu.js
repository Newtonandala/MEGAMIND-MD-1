const { listCommands } = require('../lib/pluginLoader');
const { formatUptime } = require('../lib/utils');
const settings = require('../settings');

module.exports = [
  {
    name: 'menu',
    aliases: ['help', 'start', 'commands', 'list'],
    category: 'General',
    description: 'Show all bot commands',
    async execute({ sock, from, msg, reply, isOwner, senderPhone }) {
      const p = settings.prefix;
      const uptime = formatUptime(process.uptime());
      const mem = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

      const menuText = `
╔══════════════════════════════╗
║   🧠  *MEGAMIND-MD BOT*  🧠   ║
║   The Most Powerful Bot      ║
╚══════════════════════════════╝

▸ *Bot:* ${settings.botName}
▸ *Version:* v${settings.botVersion}
▸ *Prefix:* \`${p}\`
▸ *Mode:* ${settings.mode}
▸ *Uptime:* ${uptime}
▸ *RAM:* ${mem} MB

╔══════════════════════════════╗
║   👑  *OWNER COMMANDS*        ║
╚══════════════════════════════╝
│ ${p}restart     │ Restart bot
│ ${p}shutdown    │ Shutdown bot
│ ${p}broadcast   │ Broadcast message
│ ${p}block       │ Block a user
│ ${p}unblock     │ Unblock a user
│ ${p}ban         │ Ban from bot
│ ${p}unban       │ Unban from bot
│ ${p}setppbot    │ Set bot profile pic
│ ${p}setbio      │ Set bot bio
│ ${p}autoread    │ Toggle auto read
│ ${p}anticall    │ Toggle anti call
│ ${p}botmode     │ Set bot mode
│ ${p}join        │ Join group by link
│ ${p}leave       │ Leave a group
│ ${p}repo        │ Bot source repo
│ ${p}pairsite    │ Pairing site link
│ ${p}botconnected│ Bot connection info

╔══════════════════════════════╗
║   👥  *GROUP COMMANDS*        ║
╚══════════════════════════════╝
│ ${p}kick        │ Remove a member
│ ${p}add         │ Add a member
│ ${p}promote     │ Make admin
│ ${p}demote      │ Remove admin
│ ${p}mute        │ Mute group
│ ${p}unmute      │ Unmute group
│ ${p}tagall      │ Tag all members
│ ${p}hidetag     │ Hidden tag all
│ ${p}groupinfo   │ Group information
│ ${p}welcome     │ Toggle welcome msg
│ ${p}antilink    │ Toggle anti-link
│ ${p}antibadword │ Toggle anti-badword
│ ${p}antidelete  │ Toggle anti-delete
│ ${p}togroup dp  │ Set group profile pic
│ ${p}gd          │ Set group description
│ ${p}addall      │ Add all from VCF
│ ${p}grouphack   │ [DANGER] Hack group

╔══════════════════════════════╗
║   ⬇️   *DOWNLOADERS*          ║
╚══════════════════════════════╝
│ ${p}ytmp3       │ YouTube audio
│ ${p}ytmp4       │ YouTube video
│ ${p}ytsearch    │ Search YouTube
│ ${p}tiktok      │ TikTok video
│ ${p}instagram   │ Instagram post
│ ${p}facebook    │ Facebook video
│ ${p}spotify     │ Spotify track
│ ${p}pinterest   │ Pinterest image
│ ${p}save        │ Save WhatsApp status

╔══════════════════════════════╗
║   🧠  *AI COMMANDS*           ║
╚══════════════════════════════╝
│ ${p}ai          │ Ask AI (ChatGPT/Gemini)
│ ${p}gpt         │ ChatGPT
│ ${p}gemini      │ Google Gemini
│ ${p}aicode      │ AI code helper
│ ${p}imagine     │ AI image generation
│ ${p}translate   │ Translate text
│ ${p}summarize   │ Summarize text

╔══════════════════════════════╗
║   🎭  *REACTIONS*             ║
╚══════════════════════════════╝
│ ${p}sad         │ Sad reaction GIF
│ ${p}happy       │ Happy reaction GIF
│ ${p}run         │ Run reaction GIF
│ ${p}shout       │ Shout reaction GIF
│ ${p}travel      │ Travel reaction GIF
│ ${p}hug         │ Hug someone
│ ${p}slap        │ Slap someone
│ ${p}pat         │ Pat someone
│ ${p}punch       │ Punch someone
│ ${p}dance       │ Dance GIF
│ ${p}cry         │ Cry reaction
│ ${p}laugh       │ Laugh reaction
│ ${p}angry       │ Angry reaction

╔══════════════════════════════╗
║   🎮  *FUN COMMANDS*          ║
╚══════════════════════════════╝
│ ${p}joke        │ Random joke
│ ${p}quote       │ Random quote
│ ${p}truth       │ Truth question
│ ${p}dare        │ Dare challenge
│ ${p}tod         │ Truth or Dare
│ ${p}meme        │ Random meme
│ ${p}8ball       │ Magic 8ball
│ ${p}flip        │ Flip a coin
│ ${p}roll        │ Roll a dice
│ ${p}roast       │ Roast someone
│ ${p}compliment  │ Compliment someone
│ ${p}ship        │ Ship two people

╔══════════════════════════════╗
║   🛠️   *UTILITY COMMANDS*     ║
╚══════════════════════════════╝
│ ${p}sticker     │ Make sticker
│ ${p}show        │ View once viewer
│ ${p}toimg       │ Sticker to image
│ ${p}tts         │ Text to speech
│ ${p}qr          │ Generate QR code
│ ${p}weather     │ Weather report
│ ${p}shorturl    │ Shorten URL
│ ${p}ping        │ Bot ping
│ ${p}pp          │ Set profile picture
│ ${p}system      │ System information
│ ${p}runtime     │ Bot runtime info
│ ${p}info        │ Bot info

╔══════════════════════════════╗
║   📌  *GENERAL*               ║
╚══════════════════════════════╝
│ ${p}owner       │ Contact owner
│ ${p}alive       │ Check if bot alive

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 *MEGAMIND-MD* | v${settings.botVersion}
_Powered by @whiskeysockets/baileys_
`.trim();

      const botImage = require('path').resolve(__dirname, '../media/bot-image.png');
      const fs = require('fs-extra');

      if (fs.existsSync(botImage)) {
        await sock.sendMessage(from, {
          image: { url: botImage },
          caption: menuText,
        }, { quoted: msg });
      } else {
        await reply(menuText);
      }
    },
  },

  {
    name: 'alive',
    aliases: ['active', 'online'],
    category: 'General',
    description: 'Check if bot is alive',
    async execute({ reply }) {
      const uptime = formatUptime(process.uptime());
      await reply(`🧠 *MEGAMIND-MD* is alive!\n⏰ Uptime: ${uptime}\n⚡ I am fully operational and ready!`);
    },
  },

  {
    name: 'info',
    aliases: ['botinfo'],
    category: 'General',
    description: 'Bot information',
    async execute({ reply }) {
      const mem = process.memoryUsage();
      await reply(`╔══════════════════════════╗
║   🧠 *BOT INFORMATION*    ║
╚══════════════════════════╝
▸ *Name:* ${settings.botName}
▸ *Version:* v${settings.botVersion}
▸ *Prefix:* \`${settings.prefix}\`
▸ *Mode:* ${settings.mode}
▸ *Node.js:* ${process.version}
▸ *Platform:* ${process.platform}
▸ *Uptime:* ${formatUptime(process.uptime())}
▸ *RAM Used:* ${Math.round(mem.heapUsed / 1024 / 1024)} MB
▸ *RAM Total:* ${Math.round(mem.heapTotal / 1024 / 1024)} MB

🧠 *MEGAMIND-MD* — Powered by Baileys`);
    },
  },

  {
    name: 'owner',
    aliases: ['creator'],
    category: 'General',
    description: 'Get owner contact',
    async execute({ reply, sock, from, msg }) {
      const ownerJid = settings.ownerNumber;
      await sock.sendMessage(from, {
        contacts: {
          displayName: settings.ownerName,
          contacts: [{ vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${settings.ownerName}\nTEL;type=CELL;waid=${ownerJid.split('@')[0]}:+${ownerJid.split('@')[0]}\nEND:VCARD` }],
        },
      }, { quoted: msg });
    },
  },
];
