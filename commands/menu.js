const { listCommands } = require('../lib/handler');
const { getStats, getUser } = require('../lib/database');
const { formatRuntime, formatBytes } = require('../lib/utils');
const settings = require('../settings');
const si = require('systeminformation');
const os = require('os');
const fs = require('fs-extra');
const path = require('path');

module.exports = [
  {
    name: 'menu',
    aliases: ['help', 'commands', 'list'],
    category: 'General',
    description: 'Show the bot menu',
    async execute({ sock, from, msg, isOwner, reply, sendImage }) {
      const stats = getStats();
      const uptime = Date.now() - stats.startTime;
      const mem = process.memoryUsage();
      const cmds = listCommands();
      const ping = Date.now();

      // Group commands by category
      const categories = {};
      for (const cmd of cmds) {
        const cat = cmd.category || 'General';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(cmd);
      }

      const catEmojis = {
        Owner: '👑', Group: '👥', Downloader: '⬇️',
        AI: '🧠', Fun: '🎮', Utility: '🛠️', General: '📌',
      };

      let menuText = `
╔══════════════════════════════╗
║  🧠  *MEGAMIND-MD*  v${settings.botVersion}    ║
╚══════════════════════════════╝

⚡ *Ping:* ${Date.now() - ping}ms
⏱️ *Uptime:* ${formatRuntime(uptime)}
💾 *RAM:* ${formatBytes(mem.heapUsed)} / ${formatBytes(mem.heapTotal)}
📦 *Commands:* ${cmds.length}
📩 *Handled:* ${stats.messagesHandled}
🔑 *Prefix:* ${settings.prefix}
🌐 *Mode:* ${settings.mode.toUpperCase()}

`.trim();

      for (const [category, cmdList] of Object.entries(categories)) {
        if (!isOwner && category === 'Owner') continue;
        const emoji = catEmojis[category] || '📌';
        menuText += `\n\n${emoji} *${category.toUpperCase()}*\n`;
        for (const cmd of cmdList) {
          menuText += `  ┣ ${settings.prefix}${cmd.name}`;
          if (cmd.aliases?.length) menuText += ` _(${cmd.aliases.join(', ')})_`;
          menuText += `\n`;
        }
      }

      menuText += `\n\n━━━━━━━━━━━━━━━━━━━━━\n🧠 *${settings.botName}* | ${settings.footer}`;

      // Try to send with bot image
      try {
        const imgPath = path.resolve(__dirname, '../media/bot-image.png');
        if (await fs.pathExists(imgPath)) {
          const buffer = await fs.readFile(imgPath);
          await sock.sendMessage(from, {
            image: buffer,
            caption: menuText,
          }, { quoted: msg });
          return;
        }
      } catch {}
      await reply(menuText);
    },
  },
  {
    name: 'info',
    aliases: ['botinfo', 'about'],
    category: 'General',
    description: 'Show bot info',
    async execute({ sock, from, msg, reply, sendImage }) {
      const stats = getStats();
      const uptime = Date.now() - stats.startTime;
      const mem = process.memoryUsage();

      const text = `
🧠 *MEGAMIND-MD Bot Info*
━━━━━━━━━━━━━━━━━━━━
🤖 *Name:* ${settings.botName}
📌 *Version:* ${settings.botVersion}
⚡ *Platform:* Node.js ${process.version}
⏱️ *Uptime:* ${formatRuntime(uptime)}
💾 *RAM Used:* ${formatBytes(mem.heapUsed)}
📦 *Total Commands:* ${listCommands().length}
📩 *Messages Handled:* ${stats.messagesHandled}
🔑 *Prefix:* ${settings.prefix}
🌐 *Mode:* ${settings.mode}
━━━━━━━━━━━━━━━━━━━━
${settings.footer}`.trim();

      try {
        const imgPath = require('path').resolve(__dirname, '../media/bot-image.png');
        const fs = require('fs-extra');
        if (await fs.pathExists(imgPath)) {
          const buffer = await fs.readFile(imgPath);
          await sock.sendMessage(from, { image: buffer, caption: text }, { quoted: msg });
          return;
        }
      } catch {}
      await reply(text);
    },
  },
  {
    name: 'runtime',
    aliases: ['uptime', 'stats'],
    category: 'General',
    description: 'Show bot runtime and stats',
    async execute({ reply }) {
      const stats = getStats();
      const uptime = Date.now() - stats.startTime;
      const mem = process.memoryUsage();
      await reply(`
⏱️ *Runtime Stats*
━━━━━━━━━━━━━━━━━━
⏳ Uptime: ${formatRuntime(uptime)}
💾 Heap Used: ${formatBytes(mem.heapUsed)}
💾 Heap Total: ${formatBytes(mem.heapTotal)}
📩 Messages: ${stats.messagesHandled}
🤖 Commands Run: ${stats.commandsRun}
━━━━━━━━━━━━━━━━━━
${settings.footer}`.trim());
    },
  },
  {
    name: 'owner',
    category: 'General',
    description: 'Contact the bot owner',
    async execute({ reply }) {
      await reply(`
👑 *Bot Owner*
━━━━━━━━━━━━━━━━━━
🤖 *Bot:* ${settings.botName}
👤 *Owner:* ${settings.ownerName}
📞 *Contact:* wa.me/${settings.ownerNumber.replace('@s.whatsapp.net', '')}
━━━━━━━━━━━━━━━━━━
${settings.footer}`.trim());
    },
  },
];
