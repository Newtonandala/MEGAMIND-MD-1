// ╔══════════════════════════════════════════════════╗
// ║          MEGAMIND-MD WhatsApp Bot                ║
// ║          Powered by @whiskeysockets/baileys      ║
// ╚══════════════════════════════════════════════════╝

require('dotenv').config();
const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const logger = require('./lib/logger');
const { connectToWhatsApp, connectWithPairingCode, getSocket } = require('./lib/connection');
const { handleMessage, listCommands } = require('./lib/handler');
const { loadPlugins } = require('./lib/pluginLoader');
const { setupQRRoutes } = require('./lib/qrServer');
const { getGroup, getSetting, incrementStat } = require('./lib/database');
const { cleanTemp } = require('./lib/utils');
const settings = require('./settings');
const cron = require('node-cron');

// ── Anti-crash protection ─────────────────────────────────────────────────────
if (settings.antiCrash) {
  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught Exception — bot continues running');
  });
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled Promise Rejection — bot continues running');
  });
}

// ── Ensure required directories ───────────────────────────────────────────────
['session', 'database', 'media', 'temp', 'plugins'].forEach(dir => {
  fs.ensureDirSync(path.resolve(__dirname, dir));
});

// ── Express app setup ─────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

// Mount the QR/pairing web page and all web routes
setupQRRoutes(app);

// Health endpoint
app.get('/health', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status: 'online',
    bot: settings.botName,
    version: settings.botVersion,
    uptime: process.uptime(),
    commands: listCommands().length,
    memory: {
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + 'MB',
    },
    timestamp: new Date().toISOString(),
  });
});

// ── Uptime self-ping ──────────────────────────────────────────────────────────
if (settings.uptimeUrl) {
  const axios = require('axios');
  cron.schedule('*/5 * * * *', async () => {
    try {
      await axios.get(settings.uptimeUrl, { timeout: 10000 });
      logger.info('Uptime ping sent');
    } catch {
      logger.warn('Uptime ping failed');
    }
  });
}

// ── Clean temp files every 10 minutes ────────────────────────────────────────
cron.schedule('*/10 * * * *', () => {
  cleanTemp().catch(() => {});
});

// ── Group event handlers ──────────────────────────────────────────────────────
function setupGroupEvents(sock) {
  sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
    const group = getGroup(id);
    if (!group?.welcome) return;
    try {
      const meta = await sock.groupMetadata(id).catch(() => null);
      if (!meta) return;
      for (const jid of participants) {
        let text;
        if (action === 'add') {
          text = settings.welcomeMessage
            .replace('{group}', meta.subject)
            .replace('{user}', `@${jid.split('@')[0]}`);
        } else if (action === 'remove') {
          text = settings.goodbyeMessage
            .replace('{group}', meta.subject)
            .replace('{user}', `@${jid.split('@')[0]}`);
        }
        if (text) {
          await sock.sendMessage(id, { text, mentions: [jid] });
        }
      }
    } catch (err) {
      logger.error({ err }, 'Error in group participant update');
    }
  });

  // Anti-link & anti-bad-word
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      const from = msg.key.remoteJid;
      if (!from?.endsWith('@g.us')) continue;
      const group = getGroup(from);
      const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
      const sender = msg.key.participant;

      if (group?.antiLink && /https?:\/\//.test(body)) {
        const admins = (await sock.groupMetadata(from).catch(() => null))
          ?.participants?.filter(p => p.admin)?.map(p => p.id) || [];
        if (!admins.includes(sender)) {
          await sock.sendMessage(from, { delete: msg.key }).catch(() => {});
          await sock.sendMessage(from, {
            text: `⚠️ Links are not allowed here, @${sender?.split('@')[0]}!`,
            mentions: [sender],
          }).catch(() => {});
        }
      }

      if (group?.antiBadWord) {
        const badWords = ['spam', 'scam', 'hack'];
        if (badWords.some(w => body.toLowerCase().includes(w))) {
          await sock.sendMessage(from, { delete: msg.key }).catch(() => {});
          await sock.sendMessage(from, {
            text: `⚠️ Watch your language, @${sender?.split('@')[0]}!`,
            mentions: [sender],
          }).catch(() => {});
        }
      }
    }
  });
}

// ── Call rejection ────────────────────────────────────────────────────────────
function setupCallEvents(sock) {
  sock.ev.on('call', async (calls) => {
    for (const call of calls) {
      if (getSetting('antiCall') && call.status === 'offer') {
        await sock.rejectCall(call.id, call.from);
        await sock.sendMessage(call.from, {
          text: '📵 Calls are not allowed. Please send a message instead.',
        });
      }
    }
  });
}

// ── Main start function ───────────────────────────────────────────────────────
async function start() {
  console.log('\n');
  console.log('  ███╗   ███╗███████╗ ██████╗  █████╗ ███╗   ███╗██╗███╗   ██╗██████╗ ');
  console.log('  ████╗ ████║██╔════╝██╔════╝ ██╔══██╗████╗ ████║██║████╗  ██║██╔══██╗');
  console.log('  ██╔████╔██║█████╗  ██║  ███╗███████║██╔████╔██║██║██╔██╗ ██║██║  ██║');
  console.log('  ██║╚██╔╝██║██╔══╝  ██║   ██║██╔══██║██║╚██╔╝██║██║██║╚██╗██║██║  ██║');
  console.log('  ██║ ╚═╝ ██║███████╗╚██████╔╝██║  ██║██║ ╚═╝ ██║██║██║ ╚████║██████╔╝');
  console.log('  ╚═╝     ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═════╝ ');
  console.log('                    WhatsApp Multi-Device Bot v' + settings.botVersion);
  console.log('                    Powered by @whiskeysockets/baileys\n');

  const usePairingCode = process.argv.includes('--pair');

  // Start Express server first so QR page is available immediately
  app.listen(settings.port, () => {
    logger.info(`🌐 Web interface running on port ${settings.port}`);
    logger.info(`📱 Visit your bot URL to scan the QR code`);
  });

  // Load plugins/commands
  logger.info('Loading plugins...');
  await loadPlugins();
  logger.info(`Ready with ${listCommands().length} commands`);

  // Connect to WhatsApp
  logger.info('Connecting to WhatsApp...');

  let sock;
  if (usePairingCode) {
    const phoneNumber = process.env.OWNER_NUMBER || '';
    if (!phoneNumber) {
      logger.error('OWNER_NUMBER must be set in .env for pairing code mode');
      process.exit(1);
    }
    logger.info(`Requesting pairing code for ${phoneNumber}...`);
    await connectWithPairingCode(phoneNumber, handleMessage);
    sock = getSocket();
  } else {
    sock = await connectToWhatsApp(handleMessage);
  }

  setupGroupEvents(sock);
  setupCallEvents(sock);

  logger.info('🧠 MEGAMIND-MD is ready!');
}

start().catch(err => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});
