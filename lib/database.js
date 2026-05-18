const fs = require('fs-extra');
const path = require('path');

const DB_PATH = path.resolve(__dirname, '../database/db.json');

let db = { groups: {}, users: {}, settings: {}, stats: {} };

function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      db = fs.readJsonSync(DB_PATH);
    } else {
      fs.ensureDirSync(path.dirname(DB_PATH));
      fs.writeJsonSync(DB_PATH, db, { spaces: 2 });
    }
  } catch { db = { groups: {}, users: {}, settings: {}, stats: {} }; }
}

function saveDB() {
  try { fs.writeJsonSync(DB_PATH, db, { spaces: 2 }); } catch {}
}

loadDB();

// ── Groups ────────────────────────────────────────────────────────────────────
function getGroup(jid) {
  if (!db.groups[jid]) db.groups[jid] = {};
  return db.groups[jid];
}

function setGroup(jid, data) {
  db.groups[jid] = { ...(db.groups[jid] || {}), ...data };
  saveDB();
}

// ── Users ─────────────────────────────────────────────────────────────────────
function getUser(jid) {
  if (!db.users[jid]) db.users[jid] = { banned: false, warns: 0 };
  return db.users[jid];
}

function setUser(jid, data) {
  db.users[jid] = { ...(db.users[jid] || {}), ...data };
  saveDB();
}

// ── Global settings ───────────────────────────────────────────────────────────
function getSetting(key) { return db.settings[key]; }
function setSetting(key, val) { db.settings[key] = val; saveDB(); }

// ── Stats ─────────────────────────────────────────────────────────────────────
function incrementStat(key) {
  db.stats[key] = (db.stats[key] || 0) + 1;
  saveDB();
}
function getStats() { return db.stats; }

module.exports = { getGroup, setGroup, getUser, setUser, getSetting, setSetting, incrementStat, getStats };
