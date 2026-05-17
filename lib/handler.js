const settings = require('../settings');
const { getUser, incrementStat, getGroup, getSetting } = require('./database');
const logger = require('./logger');
const { phoneFromJid, getMsgType } = require('./utils');
const NodeCache = require('node-cache');

// Spam protection: track calls per user
const spamCache = new NodeCache({ stdTTL: Math.ceil(settings.spamInterval / 1000) });

// Loaded commands map
const commandMap = new Map();

function registerCommand(cmd) {
  const aliases = [cmd.name, ...(cmd.aliases || [])];
  for (const alias of aliases) {
    commandMap.set(alias.toLowerCase(), cmd);
  }
}

function getCommand(name) {
  return commandMap.get(name.toLowerCase()) || null;
}

function listCommands() {
  const seen = new Set();
  const cmds = [];
  for (const cmd of commandMap.values()) {
    if (!seen.has(cmd.name)) {
      seen.add(cmd.name);
      cmds.push(cmd);
    }
  }
  return cmds;
}

// ── Main message handler ───────────────────────────────────────────────────────
async function handleMessage(sock, msg) {
  try {
    const from = msg.key.remoteJid;
    if (!from) return;

    const isGroup = from.endsWith('@g.us');
    const sender = isGroup ? msg.key.participant : from;
    const senderJid = sender || '';
    const senderPhone = phoneFromJid(senderJid);
    const isOwner = senderJid.replace(/:\d+@/, '@') === settings.ownerNumber;

    // Auto-read
    if (getSetting('autoRead')) {
      await sock.readMessages([msg.key]);
    }

    // Auto-typing indicator
    if (settings.autoTyping) {
      await sock.sendPresenceUpdate('composing', from).catch(() => {});
    }

    // Anti-call: handled separately in call events

    // Extract text body
    const msgType = getMsgType(msg);
    let body = '';
    if (msg.message?.conversation) {
      body = msg.message.conversation;
    } else if (msg.message?.extendedTextMessage?.text) {
      body = msg.message.extendedTextMessage.text;
    } else if (msg.message?.imageMessage?.caption) {
      body = msg.message.imageMessage.caption;
    } else if (msg.message?.videoMessage?.caption) {
      body = msg.message.videoMessage.caption;
    } else if (msg.message?.buttonsResponseMessage?.selectedButtonId) {
      body = msg.message.buttonsResponseMessage.selectedButtonId;
    } else if (msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId) {
      body = msg.message.listResponseMessage.singleSelectReply.selectedRowId;
    }

    // Check prefix
    const prefix = settings.prefix;
    if (!body.startsWith(prefix)) {
      // Handle non-command events (welcome, anti-link etc.) — delegated elsewhere
      return;
    }

    const args = body.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();
    if (!commandName) return;

    // Lookup command
    const command = getCommand(commandName);
    if (!command) return;

    // Get user record
    const user = getUser(senderJid);

    // Check if banned
    if (user.banned && !isOwner) {
      return sock.sendMessage(from, { text: '❌ You are banned from using this bot.' }, { quoted: msg });
    }

    // Mode check
    if (settings.mode === 'private' && !isOwner) {
      return sock.sendMessage(from, { text: '🔒 Bot is in private mode. Only the owner can use commands.' }, { quoted: msg });
    }

    // Owner-only commands
    if (command.ownerOnly && !isOwner) {
      return sock.sendMessage(from, { text: '👑 This command is only for the owner.' }, { quoted: msg });
    }

    // Group-only commands
    if (command.groupOnly && !isGroup) {
      return sock.sendMessage(from, { text: '👥 This command can only be used in groups.' }, { quoted: msg });
    }

    // Admin-only commands
    if (command.adminOnly && isGroup) {
      const groupMeta = await sock.groupMetadata(from).catch(() => null);
      const admins = groupMeta?.participants?.filter(p => p.admin).map(p => p.id) || [];
      const isBotAdmin = admins.includes(sock.user?.id);
      const isSenderAdmin = admins.includes(senderJid);
      if (!isSenderAdmin && !isOwner) {
        return sock.sendMessage(from, { text: '🛡️ This command is for group admins only.' }, { quoted: msg });
      }
    }

    // Spam protection
    if (settings.antiSpam && !isOwner) {
      const key = `spam_${senderJid}`;
      const count = (spamCache.get(key) || 0) + 1;
      spamCache.set(key, count);
      if (count > settings.maxSpamCount) {
        return sock.sendMessage(from, {
          text: `⚠️ Slow down! You're sending commands too fast.`,
        }, { quoted: msg });
      }
    }

    // Build context object
    const ctx = {
      sock,
      msg,
      from,
      sender: senderJid,
      senderPhone,
      isOwner,
      isGroup,
      args,
      body,
      prefix,
      msgType,
      reply: (text) => sock.sendMessage(from, { text }, { quoted: msg }),
      replyWithMention: (text, jids) => sock.sendMessage(from, { text, mentions: jids }, { quoted: msg }),
      sendImage: (buffer, caption) => sock.sendMessage(from, { image: buffer, caption }, { quoted: msg }),
      sendVideo: (buffer, caption) => sock.sendMessage(from, { video: buffer, caption }, { quoted: msg }),
      sendAudio: (buffer) => sock.sendMessage(from, { audio: buffer, mimetype: 'audio/mp4' }, { quoted: msg }),
      sendSticker: (buffer) => sock.sendMessage(from, { sticker: buffer }, { quoted: msg }),
    };

    // Execute command
    incrementStat('commandsRun');
    logger.info({ command: commandName, sender: senderPhone, from }, 'Command executed');

    await command.execute(ctx);
  } catch (err) {
    logger.error({ err }, 'Unhandled error in handleMessage');
    try {
      await sock.sendMessage(msg.key.remoteJid, {
        text: `❌ An error occurred: ${err.message}`,
      }, { quoted: msg });
    } catch {}
  } finally {
    incrementStat('messagesHandled');
    // Reset typing
    if (settings.autoTyping) {
      sock.sendPresenceUpdate('paused', msg.key.remoteJid).catch(() => {});
    }
  }
}

module.exports = { handleMessage, registerCommand, getCommand, listCommands };
