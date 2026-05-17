const settings = require('../settings');

module.exports = {
  ...settings,

  // Baileys connection config
  connectionConfig: {
    printQRInTerminal: true,
    browser: ['MEGAMIND-MD', 'Chrome', '1.0.0'],
    syncFullHistory: false,
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: true,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 30000,
  },

  // Allowed media types for sticker
  allowedStickerMimes: ['image/png', 'image/jpeg', 'image/webp', 'video/mp4'],

  // Command categories for menu
  commandCategories: [
    { name: 'Owner', emoji: '👑' },
    { name: 'Group', emoji: '👥' },
    { name: 'Downloader', emoji: '⬇️' },
    { name: 'AI', emoji: '🧠' },
    { name: 'Fun', emoji: '🎮' },
    { name: 'Utility', emoji: '🛠️' },
    { name: 'General', emoji: '📌' },
  ],

  // Supported languages for translation
  languages: {
    en: 'English', es: 'Spanish', fr: 'French', de: 'German',
    ar: 'Arabic', hi: 'Hindi', zh: 'Chinese', pt: 'Portuguese',
    ru: 'Russian', ja: 'Japanese', ko: 'Korean', it: 'Italian',
  },
};
