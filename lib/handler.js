const { getCommand, listCommands } = require('./pluginLoader');
const { getGroup, getUser, setUser, incrementStat } = require('./database');
const { getBody, getQuoted } = require('./utils');
const logger = require('./logger');
const settings = require('../settings');

const spamMap = new Map();

async function handleMessage(sock, msg) {
  if (!msg.message || msg.key.fromMe) return;

  const from = msg.key.remoteJid;
  if (!from) return;

  const isGroup = from.endsWith('@g.us');
  const sender = isGroup ? msg.key.participant : from;
  const senderPhone = sender?.split('@')[0] || '';
  const isOwner = senderPhone === settings.ownerNumber.split('@')[0];

  // Get message body
  const body = getBody(msg);
  const prefix = settings.prefix;

  if (!body.startsWith(prefix)) return;

  const args = body.slice(prefix.length).trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();
  if (!commandName) return;

  const cmd = getCommand(commandName);
  if (!cmd) return;

  // ── Anti-spam ─────────────────────────────────────────────────────────────
  if (settings.antiSpam && !isOwner) {
    const now = Date.now();
    const key = `${sender}:${from}`;
    if (!spamMap.has(key)) spamMap.set(key, { count: 0, first: now });
    const spam = spamMap.get(key);
    if (now - spam.first > settings.spamInterval) {
      spam.count = 0; spam.first = now;
    }
    spam.count++;
    if (spam.count > settings.maxSpamCount) {
      return sock.sendMessage(from, { text: '⚠️ Slow down! You are sending commands too fast.' }, { quoted: msg });
    }
  }

  // ── Permission checks ─────────────────────────────────────────────────────
  if (cmd.ownerOnly && !isOwner) {
    return sock.sendMessage(from, { text: '👑 This command is for the *bot owner* only.' }, { quoted: msg });
  }

  const user = getUser(sender);
  if (user.banned && !isOwner) {
    return sock.sendMessage(from, { text: '🚫 You are banned from using this bot.' }, { quoted: msg });
  }

  let groupMeta = null;
  let botIsAdmin = false;
  let senderIsAdmin = false;

  if (isGroup) {
    try {
      groupMeta = await sock.groupMetadata(from);
      const participants = groupMeta.participants;
      const botId = sock.user?.id?.replace(/:.*@/, '@') || '';
      botIsAdmin = participants.some(p => p.id === botId && (p.admin === 'admin' || p.admin === 'superadmin'));
      senderIsAdmin = participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));
    } catch {}
  }

  if (cmd.groupOnly && !isGroup) {
    return sock.sendMessage(from, { text: '👥 This command can only be used in groups.' }, { quoted: msg });
  }

  if (cmd.adminOnly && !senderIsAdmin && !isOwner) {
    return sock.sendMessage(from, { text: '🛡️ This command is for *group admins* only.' }, { quoted: msg });
  }

  if (cmd.botAdmin && !botIsAdmin) {
    return sock.sendMessage(from, { text: '⚠️ I need to be an *admin* to use this command.' }, { quoted: msg });
  }

  if (cmd.privateOnly && isGroup) {
    return sock.sendMessage(from, { text: '📩 This command can only be used in private chat.' }, { quoted: msg });
  }

  // ── Auto typing ───────────────────────────────────────────────────────────
  if (settings.autoTyping) {
    await sock.sendPresenceUpdate('composing', from).catch(() => {});
  }

  // ── Build context ─────────────────────────────────────────────────────────
  const quoted = getQuoted(msg);
  const text = args.join(' ');

  async function reply(content) {
    if (typeof content === 'string') {
      return sock.sendMessage(from, { text: content }, { quoted: msg });
    }
    return sock.sendMessage(from, content, { quoted: msg });
  }

  async function react(emoji) {
    return sock.sendMessage(from, { react: { text: emoji, key: msg.key } }).catch(() => {});
  }

  const ctx = {
    sock, msg, from, sender, senderPhone, isGroup, isOwner,
    senderIsAdmin, botIsAdmin, groupMeta,
    args, text, body, quoted,
    reply, react,
    settings,
  };

  try {
    incrementStat('totalCommands');
    await react('⏳');
    await cmd.execute(ctx);
    await react('✅');
  } catch (err) {
    logger.error({ err, command: commandName }, 'Command error');
    await react('❌');
    await reply(`❌ Error: ${err.message}`);
  } finally {
    if (settings.autoTyping) {
      await sock.sendPresenceUpdate('paused', from).catch(() => {});
    }
  }
}

module.exports = { handleMessage, listCommands };
