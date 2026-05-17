const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  isJidBroadcast,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const path = require('path');
const fs = require('fs-extra');
const pino = require('pino');
const logger = require('./logger');
const { sessionDir } = require('../settings');
const { setQR, setConnected, setDisconnected } = require('./qrServer');

let sock = null;
let reconnectAttempts = 0;
const MAX_RECONNECT = 10;

async function connectToWhatsApp(onMessage) {
  const sessionPath = path.resolve(__dirname, '..', sessionDir);
  await fs.ensureDir(sessionPath);

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();

  logger.info(`Using Baileys version: ${version.join('.')}`);

  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
    },
    browser: ['MEGAMIND-MD', 'Chrome', '1.0.0'],
    syncFullHistory: false,
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: true,
    logger: pino({ level: 'silent' }),
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 30000,
    getMessage: async () => ({ conversation: '' }),
    shouldIgnoreJid: jid => isJidBroadcast(jid),
  });

  // ── Save credentials on update ─────────────────────────────────────────────
  sock.ev.on('creds.update', saveCreds);

  // ── Connection state updates ───────────────────────────────────────────────
  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      logger.info('QR Code generated — visit the bot URL to scan');
      setQR(qr);
    }

    if (connection === 'close') {
      setDisconnected();
      const statusCode = lastDisconnect?.error instanceof Boom
        ? lastDisconnect.error.output?.statusCode
        : 0;

      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      logger.warn({ statusCode }, `Connection closed${shouldReconnect ? ', reconnecting...' : ' (logged out)'}`);

      if (shouldReconnect && reconnectAttempts < MAX_RECONNECT) {
        reconnectAttempts++;
        const delay = Math.min(1000 * 2 ** reconnectAttempts, 30000);
        logger.info(`Reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT} in ${delay / 1000}s`);
        setTimeout(() => connectToWhatsApp(onMessage), delay);
      } else if (reconnectAttempts >= MAX_RECONNECT) {
        logger.error('Max reconnect attempts reached. Please restart the bot.');
        process.exit(1);
      }
    }

    if (connection === 'open') {
      reconnectAttempts = 0;
      const number = sock.user?.id || '';
      setConnected(number);
      logger.info('✅ MEGAMIND-MD connected to WhatsApp!');
      logger.info(`Bot number: ${number}`);
    }
  });

  // ── Message events ─────────────────────────────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg.message) continue;
      try {
        await onMessage(sock, msg);
      } catch (err) {
        logger.error({ err }, 'Error handling message');
      }
    }
  });

  return sock;
}

function getSocket() {
  return sock;
}

// ── Pairing code support ───────────────────────────────────────────────────────
async function connectWithPairingCode(phoneNumber, onMessage) {
  const { setPairingCode } = require('./qrServer');
  const s = await connectToWhatsApp(onMessage);
  await new Promise(r => setTimeout(r, 3000));
  if (!s.authState.creds.registered) {
    const code = await s.requestPairingCode(phoneNumber.replace(/[^0-9]/g, ''));
    setPairingCode(code);
    logger.info(`\n\n📱 PAIRING CODE: ${code}\n\nVisit your bot URL to enter this code in WhatsApp\n`);
    return code;
  }
  return null;
}

module.exports = { connectToWhatsApp, connectWithPairingCode, getSocket };
