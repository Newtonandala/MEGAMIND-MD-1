const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const fs = require('fs-extra');
const logger = require('./logger');

const dbPath = path.resolve(__dirname, '../database/db.json');
fs.ensureFileSync(dbPath);

const adapter = new FileSync(dbPath);
const db = low(adapter);

// ── Default Schema ──────────────────────────────────────────────────────────
db.defaults({
  users: [],
  groups: [],
  banned: [],
  blocklist: [],
  settings: {
    antiCall: false,
    autoRead: false,
    autoTyping: true,
    antiSpam: true,
    antiLink: false,
    antiBadWord: false,
    antiDelete: false,
  },
  stats: {
    messagesHandled: 0,
    commandsRun: 0,
    startTime: Date.now(),
  },
}).write();

// ── User Helpers ─────────────────────────────────────────────────────────────
function getUser(jid) {
  let user = db.get('users').find({ jid }).value();
  if (!user) {
    db.get('users').push({ jid, warns: 0, banned: false, premium: false, joinedAt: Date.now() }).write();
    user = db.get('users').find({ jid }).value();
  }
  return user;
}

function updateUser(jid, data) {
  db.get('users').find({ jid }).assign(data).write();
}

function banUser(jid) {
  updateUser(jid, { banned: true });
  const blocklist = db.get('blocklist').value();
  if (!blocklist.includes(jid)) {
    db.get('blocklist').push(jid).write();
  }
}

function unbanUser(jid) {
  updateUser(jid, { banned: false });
  db.get('blocklist').remove(jid).write();
}

function warnUser(jid) {
  const user = getUser(jid);
  const warns = (user.warns || 0) + 1;
  updateUser(jid, { warns });
  return warns;
}

// ── Group Helpers ─────────────────────────────────────────────────────────────
function getGroup(jid) {
  let group = db.get('groups').find({ jid }).value();
  if (!group) {
    db.get('groups').push({
      jid,
      welcome: false,
      antiLink: false,
      antiBadWord: false,
      antiSpam: false,
      antiDelete: false,
      antiViewOnce: false,
      muted: false,
      createdAt: Date.now(),
    }).write();
    group = db.get('groups').find({ jid }).value();
  }
  return group;
}

function updateGroup(jid, data) {
  getGroup(jid); // ensure exists
  db.get('groups').find({ jid }).assign(data).write();
}

// ── Stats Helpers ─────────────────────────────────────────────────────────────
function incrementStat(key) {
  const current = db.get(`stats.${key}`).value() || 0;
  db.set(`stats.${key}`, current + 1).write();
}

function getStats() {
  return db.get('stats').value();
}

// ── Settings Helpers ──────────────────────────────────────────────────────────
function getSetting(key) {
  return db.get(`settings.${key}`).value();
}

function setSetting(key, value) {
  db.set(`settings.${key}`, value).write();
}

module.exports = {
  db,
  getUser,
  updateUser,
  banUser,
  unbanUser,
  warnUser,
  getGroup,
  updateGroup,
  incrementStat,
  getStats,
  getSetting,
  setSetting,
};
