// ╔══════════════════════════════════════════════════╗
// ║          MEGAMIND-MD WhatsApp Bot                ║
// ║          The Most Powerful WhatsApp Bot          ║
// ║          Powered by @whiskeysockets/baileys      ║
// ╚══════════════════════════════════════════════════╝

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs-extra');
const path = require('path');
const cron = require('node-cron');
const axios = require('axios');

const logger = require('./lib/logger');
const { connectToWhatsApp, connectWithPairingCode, getSocket } = require('./lib/connection');
const { handleMessage, listCommands } = require('./lib/handler');
const { loadPlugins } = require('./lib/pluginLoader');
const { setupQRRoutes, setupSocketIO } = require('./lib/qrServer');
const { getGroup, getSetting, incrementStat } = require('./lib/database');
const { cleanTemp } = require('./lib/utils');
const settings = require('./settings');

// ── Anti-crash ────────────────────────────────────────────────────────────────
if (settings.antiCrash) {
  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught Exception — bot continues');
  });
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled Rejection — bot continues');
  });
}

// ── Required directories ──────────────────────────────────────────────────────
['session', 'database', 'media', 'temp', 'plugins', 'public'].forEach(d => {
  fs.ensureDirSync(path.resolve(__dirname, d));
});

// ── Express + Socket.IO ───────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.json());
setupQRRoutes(app);
setupSocketIO(io);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
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
  cron.schedule('*/5 * * * *', async () => {
    try { await axios.get(settings.uptimeUrl, { timeout: 10000 }); logger.debug('Uptime ping sent'); }
    catch { logger.warn('Uptime ping failed'); }
  });
}

// ── Temp cleanup ──────────────────────────────────────────────────────────────
cron.schedule('*/10 * * * *', () => cleanTemp().catch(() => {}));

// ── Group events ──────────────────────────────────────────────────────────────
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
          text = settings.welcomeMessage.replace('{group}', meta.subject).replace('{user}', `@${jid.split('@')[0]}`);
        } else if (action === 'remove') {
          text = settings.goodbyeMessage.replace('{group}', meta.subject).replace('{user}', `@${jid.split('@')[0]}`);
        }
        if (text) await sock.sendMessage(id, { text, mentions: [jid] }).catch(() => {});
      }
    } catch (err) { logger.error({ err }, 'Group participant event error'); }
  });

  // Anti-link & anti-bad-word listener
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      const from = msg.key.remoteJid;
      if (!from?.endsWith('@g.us')) continue;
      const group = getGroup(from);
      const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
      const sender = msg.key.participant;

      // Anti-link
      if (group?.antiLink && /https?:\/\//i.test(body)) {
        const meta = await sock.groupMetadata(from).catch(() => null);
        const admins = meta?.participants?.filter(p => p.admin)?.map(p => p.id) || [];
        if (!admins.includes(sender)) {
          await sock.sendMessage(from, { delete: msg.key }).catch(() => {});
          await sock.sendMessage(from, { text: `⚠️ Links not allowed! @${sender?.split('@')[0]} has been warned.`, mentions: [sender] }).catch(() => {});
        }
      }

      // Anti-bad-word
      if (group?.antiBadWord) {
        const badWords = ['spam', 'scam', 'hack', 'porn', 'xxx', 'nude', 'pussy', 'dick', 'fuck', 'shit'];
        if (badWords.some(w => body.toLowerCase().includes(w))) {
          await sock.sendMessage(from, { delete: msg.key }).catch(() => {});
          await sock.sendMessage(from, { text: `⚠️ Watch your language, @${sender?.split('@')[0]}!`, mentions: [sender] }).catch(() => {});
        }
      }

      // Anti-delete (re-send deleted messages)
      if (group?.antiDelete) {
        const proto = msg.message?.protocolMessage;
        if (proto?.type === 0) {
          await sock.sendMessage(from, { text: `🗑️ @${sender?.split('@')[0]} deleted a message`, mentions: [sender] }).catch(() => {});
        }
      }
    }
  });
}

// ── Call rejection ────────────────────────────────────────────────────────────
function setupCallEvents(sock) {
  sock.ev.on('call', async (calls) => {
    for (const call of calls) {
      if ((getSetting('antiCall') ?? settings.antiCall) && call.status === 'offer') {
        await sock.rejectCall(call.id, call.from).catch(() => {});
        await sock.sendMessage(call.from, { text: '📵 Calls are not accepted. Please send a message.' }).catch(() => {});
      }
    }
  });
}

// ── Auto read ─────────────────────────────────────────────────────────────────
function setupAutoRead(sock) {
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    if (!settings.autoRead) return;
    for (const msg of messages) {
      await sock.readMessages([msg.key]).catch(() => {});
    }
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function start() {
  console.log('');
  console.log('  ███╗   ███╗███████╗ ██████╗  █████╗ ███╗   ███╗██╗███╗   ██╗██████╗ ');
  console.log('  ████╗ ████║██╔════╝██╔════╝ ██╔══██╗████╗ ████║██║████╗  ██║██╔══██╗');
  console.log('  ██╔████╔██║█████╗  ██║  ███╗███████║██╔████╔██║██║██╔██╗ ██║██║  ██║');
  console.log('  ██║╚██╔╝██║██╔══╝  ██║   ██║██╔══██║██║╚██╔╝██║██║██║╚██╗██║██║  ██║');
  console.log('  ██║ ╚═╝ ██║███████╗╚██████╔╝██║  ██║██║ ╚═╝ ██║██║██║ ╚████║██████╔╝');
  console.log('  ╚═╝     ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═════╝ ');
  console.log('');
  console.log('               🧠 The Most Powerful WhatsApp Bot — v' + settings.botVersion);
  console.log('               ⚡ Powered by @whiskeysockets/baileys');
  console.log('');

  // Start HTTP server first (so web UI loads before WA connects)
  const port = settings.port;
  server.listen(port, () => {
    logger.info(`🌐 Web UI at http://localhost:${port}`);
  });

  // Load all plugins
  logger.info('Loading plugins...');
  await loadPlugins();
  logger.info(`✅ ${listCommands().length} commands loaded`);

  // Connect to WhatsApp
  logger.info('Connecting to WhatsApp...');

  let sock;
  const usePairingCode = process.argv.includes('--pair');
  if (usePairingCode) {
    const phone = process.env.OWNER_NUMBER || '';
    if (!phone) { logger.error('Set OWNER_NUMBER in .env for pairing code mode'); process.exit(1); }
    await connectWithPairingCode(phone, handleMessage);
    sock = getSocket();
  } else {
    sock = await connectToWhatsApp(handleMessage);
  }

  setupGroupEvents(sock);
  setupCallEvents(sock);
  setupAutoRead(sock);

  logger.info('🧠 MEGAMIND-MD is ready!');
}

start().catch(err => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});
