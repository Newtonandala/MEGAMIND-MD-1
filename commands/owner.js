const { getStats } = require('../lib/database');
const { banUser, unbanUser, setSetting, getSetting } = require('../lib/database');
const { formatRuntime, formatBytes } = require('../lib/utils');
const settings = require('../settings');
const si = require('systeminformation');
const fs = require('fs-extra');
const path = require('path');

module.exports = [
  {
    name: 'restart',
    aliases: ['reboot'],
    category: 'Owner',
    ownerOnly: true,
    description: 'Restart the bot',
    async execute({ reply }) {
      await reply('♻️ Restarting MEGAMIND-MD...');
      setTimeout(() => process.exit(0), 1000);
    },
  },
  {
    name: 'shutdown',
    aliases: ['stop'],
    category: 'Owner',
    ownerOnly: true,
    description: 'Shutdown the bot',
    async execute({ reply }) {
      await reply('⛔ Shutting down MEGAMIND-MD. Goodbye!');
      setTimeout(() => process.exit(0), 1000);
    },
  },
  {
    name: 'broadcast',
    aliases: ['bc'],
    category: 'Owner',
    ownerOnly: true,
    description: 'Broadcast a message to all chats',
    async execute({ sock, args, reply }) {
      if (!args.length) return reply('Usage: .broadcast <message>');
      const text = args.join(' ');
      const chats = await sock.groupFetchAllParticipating().catch(() => ({}));
      let sent = 0;
      for (const jid of Object.keys(chats)) {
        try {
          await sock.sendMessage(jid, { text: `📢 *Broadcast from MEGAMIND-MD*\n\n${text}` });
          sent++;
        } catch {}
      }
      await reply(`✅ Broadcast sent to ${sent} chats.`);
    },
  },
  {
    name: 'block',
    category: 'Owner',
    ownerOnly: true,
    description: 'Block a user',
    async execute({ sock, msg, args, reply }) {
      const target = args[0]?.replace('@', '') + '@s.whatsapp.net' ||
        msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      if (!target) return reply('Usage: .block @user');
      await sock.updateBlockStatus(target, 'block');
      banUser(target);
      await reply(`🚫 Blocked and banned ${args[0]}`);
    },
  },
  {
    name: 'unblock',
    category: 'Owner',
    ownerOnly: true,
    description: 'Unblock a user',
    async execute({ sock, args, reply }) {
      if (!args[0]) return reply('Usage: .unblock @user');
      const target = args[0].replace('@', '') + '@s.whatsapp.net';
      await sock.updateBlockStatus(target, 'unblock');
      unbanUser(target);
      await reply(`✅ Unblocked ${args[0]}`);
    },
  },
  {
    name: 'setppbot',
    category: 'Owner',
    ownerOnly: true,
    description: 'Set bot profile picture',
    async execute({ sock, msg, reply }) {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted?.imageMessage) return reply('Reply to an image to set it as the bot profile picture.');
      const { downloadMedia, saveTempFile } = require('../lib/utils');
      const buffer = await downloadMedia(quoted.imageMessage, 'image');
      await sock.updateProfilePicture(sock.user.id, buffer);
      await reply('✅ Bot profile picture updated!');
    },
  },
  {
    name: 'setbio',
    category: 'Owner',
    ownerOnly: true,
    description: 'Set bot status/bio',
    async execute({ sock, args, reply }) {
      if (!args.length) return reply('Usage: .setbio <status>');
      await sock.updateProfileStatus(args.join(' '));
      await reply('✅ Bio updated!');
    },
  },
  {
    name: 'autoread',
    category: 'Owner',
    ownerOnly: true,
    description: 'Toggle auto-read messages',
    async execute({ args, reply }) {
      const on = args[0] === 'on';
      setSetting('autoRead', on);
      await reply(`✅ Auto-read is now ${on ? 'ON' : 'OFF'}`);
    },
  },
  {
    name: 'anticall',
    category: 'Owner',
    ownerOnly: true,
    description: 'Toggle anti-call mode',
    async execute({ args, reply }) {
      const on = args[0] === 'on';
      setSetting('antiCall', on);
      await reply(`✅ Anti-call is now ${on ? 'ON' : 'OFF'}`);
    },
  },
  {
    name: 'ban',
    category: 'Owner',
    ownerOnly: true,
    description: 'Ban a user from using the bot',
    async execute({ args, msg, reply }) {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      const target = mentioned || (args[0]?.replace('@', '') + '@s.whatsapp.net');
      if (!target) return reply('Usage: .ban @user');
      banUser(target);
      await reply(`✅ Banned ${args[0] || target}`);
    },
  },
  {
    name: 'unban',
    category: 'Owner',
    ownerOnly: true,
    description: 'Unban a user',
    async execute({ args, msg, reply }) {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      const target = mentioned || (args[0]?.replace('@', '') + '@s.whatsapp.net');
      if (!target) return reply('Usage: .unban @user');
      unbanUser(target);
      await reply(`✅ Unbanned ${args[0] || target}`);
    },
  },
  {
    name: 'clearsession',
    category: 'Owner',
    ownerOnly: true,
    description: 'Clear bot session (requires re-login)',
    async execute({ reply }) {
      const sessionPath = path.resolve(__dirname, '../session');
      await fs.emptyDir(sessionPath);
      await reply('✅ Session cleared. Bot will need to re-authenticate on restart.');
      setTimeout(() => process.exit(0), 1500);
    },
  },
];
