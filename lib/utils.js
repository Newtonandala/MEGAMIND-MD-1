const { downloadContentFromMessage, getContentType } = require('@whiskeysockets/baileys');
const fs = require('fs-extra');
const path = require('path');
const logger = require('./logger');

// ── Runtime formatter ─────────────────────────────────────────────────────────
function formatRuntime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`;
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

// ── Bytes formatter ───────────────────────────────────────────────────────────
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ── Sleep helper ──────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Phone number from JID ─────────────────────────────────────────────────────
function phoneFromJid(jid) {
  return jid ? jid.replace(/@.+/, '').replace(/:\d+/, '') : '';
}

// ── Download media from message ───────────────────────────────────────────────
async function downloadMedia(message, type) {
  try {
    const stream = await downloadContentFromMessage(message, type);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
  } catch (err) {
    logger.error({ err }, 'Failed to download media');
    throw err;
  }
}

// ── Save buffer to temp file ──────────────────────────────────────────────────
async function saveTempFile(buffer, ext) {
  const tmpDir = path.resolve(__dirname, '../temp');
  await fs.ensureDir(tmpDir);
  const filename = `${Date.now()}.${ext}`;
  const filePath = path.join(tmpDir, filename);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

// ── Clean temp files older than 5 minutes ─────────────────────────────────────
async function cleanTemp() {
  const tmpDir = path.resolve(__dirname, '../temp');
  await fs.ensureDir(tmpDir);
  const files = await fs.readdir(tmpDir);
  const now = Date.now();
  for (const file of files) {
    const filePath = path.join(tmpDir, file);
    try {
      const stat = await fs.stat(filePath);
      if (now - stat.mtimeMs > 5 * 60 * 1000) await fs.remove(filePath);
    } catch {}
  }
}

// ── Get quoted message ────────────────────────────────────────────────────────
function getQuotedMsg(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
}

// ── Reply template ─────────────────────────────────────────────────────────────
function buildReply(text) {
  return { text: text.trim() };
}

// ── Mention formatter ─────────────────────────────────────────────────────────
function mentionUsers(jids) {
  return jids.map(j => `@${phoneFromJid(j)}`).join(' ');
}

// ── Get message type ──────────────────────────────────────────────────────────
function getMsgType(msg) {
  return getContentType(msg.message);
}

module.exports = {
  formatRuntime,
  formatBytes,
  sleep,
  phoneFromJid,
  downloadMedia,
  saveTempFile,
  cleanTemp,
  getQuotedMsg,
  buildReply,
  mentionUsers,
  getMsgType,
};
