const fs = require('fs-extra');
const path = require('path');
const { setSetting, getSetting, setUser } = require('../lib/database');
const { formatUptime, downloadBuffer } = require('../lib/utils');
const settings = require('../settings');

module.exports = [
  {
    name: 'restart',
    aliases: ['reboot'],
    category: 'Owner',
    description: 'Restart the bot',
    ownerOnly: true,
    async execute({ reply }) {
      await reply('🔄 Restarting MEGAMIND-MD...');
      setTimeout(() => process.exit(0), 1500);
    },
  },

  {
    name: 'shutdown',
    aliases: ['stop', 'off'],
    category: 'Owner',
    description: 'Shutdown the bot',
    ownerOnly: true,
    async execute({ reply }) {
      await reply('⚠️ Shutting down MEGAMIND-MD... Goodbye!');
      setTimeout(() => process.exit(0), 1500);
    },
  },

  {
    name: 'broadcast',
    aliases: ['bc'],
    category: 'Owner',
    description: 'Broadcast a message to all chats',
    ownerOnly: true,
    async execute({ sock, reply, text, msg }) {
      if (!text) return reply('Usage: .broadcast <message>');
      const chats = await sock.groupFetchAllParticipating().catch(() => ({}));
      let sent = 0;
      for (const jid of Object.keys(chats)) {
        try {
          await sock.sendMessage(jid, { text: `📢 *BROADCAST*\n\n${text}` });
          sent++;
          await new Promise(r => setTimeout(r, 500));
        } catch {}
      }
      await reply(`✅ Broadcast sent to ${sent} groups`);
    },
  },

  {
    name: 'ban',
    aliases: [],
    category: 'Owner',
    description: 'Ban a user from using the bot',
    ownerOnly: true,
    async execute({ reply, args, msg, sock, from }) {
      const target = msg.message?.extendedTextMessage?.contextInfo?.participant
        || (args[0] ? args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null);
      if (!target) return reply('Usage: Reply to a message with .ban or .ban <number>');
      setUser(target, { banned: true });
      await reply(`🚫 *@${target.split('@')[0]}* has been banned from using the bot.`, { mentions: [target] });
    },
  },

  {
    name: 'unban',
    aliases: [],
    category: 'Owner',
    description: 'Unban a user',
    ownerOnly: true,
    async execute({ reply, args, msg }) {
      const target = msg.message?.extendedTextMessage?.contextInfo?.participant
        || (args[0] ? args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null);
      if (!target) return reply('Usage: Reply to a message with .unban');
      setUser(target, { banned: false });
      await reply(`✅ *@${target.split('@')[0]}* has been unbanned.`);
    },
  },

  {
    name: 'block',
    aliases: [],
    category: 'Owner',
    description: 'Block a user on WhatsApp',
    ownerOnly: true,
    async execute({ sock, reply, args, msg }) {
      const target = msg.message?.extendedTextMessage?.contextInfo?.participant
        || (args[0] ? args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null);
      if (!target) return reply('Reply to a message or provide a number');
      await sock.updateBlockStatus(target, 'block');
      await reply(`🚫 Blocked *@${target.split('@')[0]}*`);
    },
  },

  {
    name: 'unblock',
    aliases: [],
    category: 'Owner',
    description: 'Unblock a user on WhatsApp',
    ownerOnly: true,
    async execute({ sock, reply, args, msg }) {
      const target = msg.message?.extendedTextMessage?.contextInfo?.participant
        || (args[0] ? args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null);
      if (!target) return reply('Reply to a message or provide a number');
      await sock.updateBlockStatus(target, 'unblock');
      await reply(`✅ Unblocked *@${target.split('@')[0]}*`);
    },
  },

  {
    name: 'setppbot',
    aliases: ['setbotpp'],
    category: 'Owner',
    description: 'Set bot profile picture',
    ownerOnly: true,
    async execute({ sock, reply, msg, quoted }) {
      const imgMsg = quoted?.message?.imageMessage || msg.message?.imageMessage;
      if (!imgMsg) return reply('Reply to an image with .setppbot');
      const buffer = await sock.downloadMediaMessage(quoted || msg);
      await sock.updateProfilePicture(sock.user.id, buffer);
      await reply('✅ Bot profile picture updated!');
    },
  },

  {
    name: 'setbio',
    aliases: ['setbotbio'],
    category: 'Owner',
    description: 'Set bot status/bio',
    ownerOnly: true,
    async execute({ sock, reply, text }) {
      if (!text) return reply('Usage: .setbio <new bio text>');
      await sock.updateProfileStatus(text);
      await reply('✅ Bot bio updated!');
    },
  },

  {
    name: 'autoread',
    aliases: [],
    category: 'Owner',
    description: 'Toggle auto read messages',
    ownerOnly: true,
    async execute({ reply, args }) {
      const val = args[0] === 'on';
      setSetting('autoRead', val);
      await reply(`✅ Auto Read: *${val ? 'ON' : 'OFF'}*`);
    },
  },

  {
    name: 'anticall',
    aliases: [],
    category: 'Owner',
    description: 'Toggle anti-call',
    ownerOnly: true,
    async execute({ reply, args }) {
      const val = args[0] === 'on';
      setSetting('antiCall', val);
      await reply(`✅ Anti Call: *${val ? 'ON' : 'OFF'}*`);
    },
  },

  {
    name: 'botmode',
    aliases: ['mode'],
    category: 'Owner',
    description: 'Set bot mode (public/private)',
    ownerOnly: true,
    async execute({ reply, args }) {
      const mode = args[0];
      if (!['public', 'private'].includes(mode)) return reply('Usage: .botmode public OR .botmode private');
      settings.mode = mode;
      await reply(`✅ Bot mode set to *${mode}*`);
    },
  },

  {
    name: 'join',
    aliases: [],
    category: 'Owner',
    description: 'Join a group via invite link',
    ownerOnly: true,
    async execute({ sock, reply, args }) {
      const link = args[0];
      if (!link) return reply('Usage: .join <invite_link>');
      const code = link.split('https://chat.whatsapp.com/')[1];
      if (!code) return reply('Invalid WhatsApp invite link');
      await sock.groupAcceptInvite(code);
      await reply('✅ Joined group!');
    },
  },

  {
    name: 'leave',
    aliases: [],
    category: 'Owner',
    description: 'Leave a group',
    ownerOnly: true,
    groupOnly: true,
    async execute({ sock, reply, from }) {
      await reply('👋 Leaving this group... Goodbye!');
      await sock.groupLeave(from);
    },
  },

  {
    name: 'repo',
    aliases: ['github', 'source'],
    category: 'Owner',
    description: 'Show bot repository link',
    async execute({ reply }) {
      await reply(`🧠 *MEGAMIND-MD Source*\n\n📦 GitHub: https://github.com/MEGAMIND-MD/MEGAMIND-MD\n\n_Star ⭐ the repo if you like the bot!_`);
    },
  },

  {
    name: 'pairsite',
    aliases: ['getid', 'session', 'pair'],
    category: 'Owner',
    description: 'Get the pairing site link',
    async execute({ reply }) {
      const url = process.env.PAIR_SITE_URL || process.env.UPTIME_URL || 'https://your-pairing-site.onrender.com';
      await reply(`🔗 *MEGAMIND-MD Pairing Site*\n\n🌐 ${url}\n\n_Visit this link to get your SESSION ID_\n_Each visitor gets their own unique session — safe to share!_`);
    },
  },

  {
    name: 'botconnected',
    aliases: ['connection', 'status'],
    category: 'Owner',
    description: 'Show bot connection status',
    async execute({ sock, reply }) {
      const user = sock.user;
      const mem = process.memoryUsage();
      await reply(`╔══════════════════════════╗
║  🔌 *BOT CONNECTION INFO* ║
╚══════════════════════════╝
▸ *Status:* 🟢 Connected
▸ *Number:* ${user?.id?.split(':')[0] || 'Unknown'}
▸ *Name:* ${user?.name || 'MEGAMIND-MD'}
▸ *Platform:* ${process.platform}
▸ *Node:* ${process.version}
▸ *Uptime:* ${formatUptime(process.uptime())}
▸ *RAM:* ${Math.round(mem.heapUsed / 1024 / 1024)} MB / ${Math.round(mem.heapTotal / 1024 / 1024)} MB
▸ *Bot Mode:* ${settings.mode}
▸ *Prefix:* \`${settings.prefix}\`

🧠 *MEGAMIND-MD* is fully operational!`);
    },
  },

  {
    name: 'runtime',
    aliases: ['uptime'],
    category: 'Owner',
    description: 'Show bot runtime',
    async execute({ reply }) {
      await reply(`⏰ *Bot Runtime:* ${formatUptime(process.uptime())}\n🧠 MEGAMIND-MD is running strong!`);
    },
  },

  {
    name: 'system',
    aliases: ['sysinfo', 'specs'],
    category: 'Owner',
    description: 'Show system information',
    async execute({ reply }) {
      const si = require('systeminformation');
      const [cpu, mem, os] = await Promise.all([
        si.cpu().catch(() => ({})),
        si.mem().catch(() => ({})),
        si.osInfo().catch(() => ({})),
      ]);
      const totalMem = mem.total ? Math.round(mem.total / 1024 / 1024 / 1024 * 10) / 10 : '?';
      const usedMem = mem.used ? Math.round(mem.used / 1024 / 1024 / 1024 * 10) / 10 : '?';
      await reply(`╔══════════════════════════╗
║  💻 *SYSTEM INFORMATION* ║
╚══════════════════════════╝
▸ *OS:* ${os.distro || process.platform} ${os.release || ''}
▸ *CPU:* ${cpu.manufacturer || ''} ${cpu.brand || 'Unknown'}
▸ *Cores:* ${cpu.cores || 'N/A'}
▸ *RAM:* ${usedMem} GB / ${totalMem} GB
▸ *Node:* ${process.version}
▸ *PID:* ${process.pid}
▸ *Uptime:* ${formatUptime(process.uptime())}
▸ *Bot RAM:* ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB

🧠 *MEGAMIND-MD* — Running at full power!`);
    },
  },
];
