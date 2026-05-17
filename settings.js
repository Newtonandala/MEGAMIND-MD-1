// ╔══════════════════════════════════════════════╗
// ║         MEGAMIND-MD BOT SETTINGS             ║
// ╚══════════════════════════════════════════════╝

module.exports = {
  // ─── Bot Identity ────────────────────────────
  botName: process.env.BOT_NAME || 'MEGAMIND-MD',
  botVersion: '1.0.0',
  botImage: './media/bot-image.png',

  // ─── Owner Config ────────────────────────────
  ownerNumber: (process.env.OWNER_NUMBER || '').replace(/[^0-9]/g, '') + '@s.whatsapp.net',
  ownerName: process.env.OWNER_NAME || 'Owner',

  // ─── Prefix ──────────────────────────────────
  prefix: process.env.PREFIX || '.',

  // ─── Bot Mode ────────────────────────────────
  // 'public'  — anyone can use the bot
  // 'private' — only owner can use the bot
  mode: process.env.BOT_MODE || 'public',

  // ─── Auto Features ───────────────────────────
  autoRead: process.env.AUTO_READ === 'true' || false,
  autoTyping: process.env.AUTO_TYPING === 'true' || true,
  autoRecording: false,
  autoViewStatus: false,

  // ─── Session ─────────────────────────────────
  sessionDir: './session',
  sessionName: process.env.SESSION_NAME || 'megamind-session',

  // ─── Database ────────────────────────────────
  dbPath: './database/db.json',

  // ─── Anti-Features ───────────────────────────
  antiCrash: true,
  antiSpam: true,
  antiCall: process.env.ANTI_CALL === 'true' || false,
  antiLink: false,
  antiBadWord: false,
  antiDelete: false,

  // ─── Rate Limiting ───────────────────────────
  spamInterval: 5000,        // ms between same user calls
  maxSpamCount: 5,           // max commands in spamInterval

  // ─── Welcome / Goodbye Messages ──────────────
  welcomeMessage: process.env.WELCOME_MSG || '👋 Welcome to *{group}*, {user}! Glad to have you here.',
  goodbyeMessage: process.env.GOODBYE_MSG || '👋 Goodbye, {user}. Hope to see you again!',

  // ─── Theme Emojis ────────────────────────────
  emoji: {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    loading: '⏳',
    brain: '🧠',
    robot: '🤖',
    star: '⭐',
    crown: '👑',
    fire: '🔥',
    lightning: '⚡',
    shield: '🛡️',
    music: '🎵',
    video: '🎬',
    image: '🖼️',
  },

  // ─── API Keys ─────────────────────────────────
  apiKeys: {
    openai: process.env.OPENAI_API_KEY || '',
    gemini: process.env.GEMINI_API_KEY || '',
    weather: process.env.WEATHER_API_KEY || '',
    shortUrl: process.env.SHORT_URL_API || '',
    spotify: process.env.SPOTIFY_API || '',
    huggingface: process.env.HUGGINGFACE_API || '',
  },

  // ─── Express / Uptime ────────────────────────
  port: parseInt(process.env.PORT || '3000'),
  uptimeUrl: process.env.UPTIME_URL || '',

  // ─── Logging ─────────────────────────────────
  logLevel: process.env.LOG_LEVEL || 'info',

  // ─── Bot Footer ──────────────────────────────
  footer: '🧠 MEGAMIND-MD | Powered by Baileys',
};
