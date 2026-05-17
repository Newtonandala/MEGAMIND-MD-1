const axios = require('axios');
const qrcode = require('qrcode');
const { saveTempFile, downloadMedia } = require('../lib/utils');
const settings = require('../settings');
const fs = require('fs-extra');

module.exports = [
  {
    name: 'sticker',
    aliases: ['s', 'stiker'],
    category: 'Utility',
    description: 'Convert image/video to sticker',
    async execute({ sock, msg, from, reply, sendSticker }) {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const target = quoted || msg.message;
      if (!target) return reply('Reply to an image or short video to make a sticker.');
      try {
        const { default: webp } = await import('webp-converter');
        let buffer, ext;
        if (target.imageMessage) {
          buffer = await downloadMedia(target.imageMessage, 'image');
          ext = 'jpg';
        } else if (target.videoMessage) {
          buffer = await downloadMedia(target.videoMessage, 'video');
          ext = 'mp4';
        } else {
          return reply('❌ Please reply to an image or short video.');
        }
        const tmpIn = await saveTempFile(buffer, ext);
        const tmpOut = tmpIn.replace(`.${ext}`, '.webp');
        if (ext === 'jpg') {
          await webp.cwebp(tmpIn, tmpOut, '-q 70');
        } else {
          const ffmpeg = require('fluent-ffmpeg');
          await new Promise((res, rej) =>
            ffmpeg(tmpIn)
              .outputOptions(['-vcodec libwebp', '-vf scale=512:512:force_original_aspect_ratio=decrease,fps=15', '-loop 0', '-preset default', '-an', '-vsync 0', '-t 00:00:05'])
              .toFormat('webp')
              .save(tmpOut)
              .on('end', res)
              .on('error', rej)
          );
        }
        const stickerBuffer = await fs.readFile(tmpOut);
        await sendSticker(stickerBuffer);
        await fs.remove(tmpIn).catch(() => {});
        await fs.remove(tmpOut).catch(() => {});
      } catch (err) {
        await reply(`❌ Failed to create sticker: ${err.message}`);
      }
    },
  },
  {
    name: 'tts',
    aliases: ['say'],
    category: 'Utility',
    description: 'Text to speech',
    async execute({ sock, from, msg, args, reply, sendAudio }) {
      if (!args.length) return reply('Usage: .tts <text>');
      const text = args.join(' ');
      try {
        const url = `https://api.streamelements.com/kappa/v2/speech?voice=Brian&text=${encodeURIComponent(text)}`;
        const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
        const buffer = Buffer.from(res.data);
        await sock.sendMessage(from, { audio: buffer, mimetype: 'audio/mpeg', ptt: true }, { quoted: msg });
      } catch (err) {
        await reply(`❌ TTS failed: ${err.message}`);
      }
    },
  },
  {
    name: 'qr',
    aliases: ['qrgen'],
    category: 'Utility',
    description: 'Generate a QR code from text/URL',
    async execute({ args, reply, sendImage }) {
      if (!args.length) return reply('Usage: .qr <text or URL>');
      try {
        const text = args.join(' ');
        const buffer = await qrcode.toBuffer(text, { errorCorrectionLevel: 'H', width: 512 });
        await sendImage(buffer, `🔳 QR Code for: ${text}`);
      } catch (err) {
        await reply(`❌ QR generation failed: ${err.message}`);
      }
    },
  },
  {
    name: 'weather',
    aliases: ['cuaca'],
    category: 'Utility',
    description: 'Get weather for a city',
    async execute({ args, reply }) {
      if (!args.length) return reply('Usage: .weather <city>');
      const apiKey = settings.apiKeys.weather;
      if (!apiKey) return reply('❌ Weather API key not configured. Set WEATHER_API_KEY in .env');
      try {
        const city = args.join(' ');
        const res = await axios.get(
          `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`,
          { timeout: 10000 }
        );
        const d = res.data;
        const text = `
🌤️ *Weather in ${d.name}, ${d.sys.country}*
━━━━━━━━━━━━━━━━━━━━
🌡️ Temp: ${d.main.temp}°C (feels like ${d.main.feels_like}°C)
🌥️ Condition: ${d.weather[0].description}
💧 Humidity: ${d.main.humidity}%
💨 Wind: ${d.wind.speed} m/s
👁️ Visibility: ${(d.visibility / 1000).toFixed(1)} km
━━━━━━━━━━━━━━━━━━━━
🧠 MEGAMIND-MD`.trim();
        await reply(text);
      } catch {
        await reply('❌ City not found or API error.');
      }
    },
  },
  {
    name: 'translate',
    aliases: ['tr'],
    category: 'Utility',
    description: 'Translate text to another language',
    async execute({ args, reply }) {
      if (args.length < 2) return reply('Usage: .translate <lang> <text>\nExample: .translate es Hello World');
      const lang = args[0];
      const text = args.slice(1).join(' ');
      try {
        const res = await axios.get(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${lang}`,
          { timeout: 10000 }
        );
        const translated = res.data?.responseData?.translatedText;
        if (!translated) return reply('❌ Translation failed.');
        await reply(`🌐 *Translation (${lang})*\n\n${translated}`);
      } catch {
        await reply('❌ Translation service unavailable.');
      }
    },
  },
  {
    name: 'shorturl',
    aliases: ['short'],
    category: 'Utility',
    description: 'Shorten a URL',
    async execute({ args, reply }) {
      if (!args[0]) return reply('Usage: .shorturl <url>');
      try {
        const res = await axios.get(
          `https://tinyurl.com/api-create.php?url=${encodeURIComponent(args[0])}`,
          { timeout: 10000 }
        );
        await reply(`🔗 Shortened URL:\n${res.data}`);
      } catch {
        await reply('❌ URL shortening failed.');
      }
    },
  },
  {
    name: 'ping',
    aliases: ['speed'],
    category: 'Utility',
    description: 'Check bot response speed',
    async execute({ reply }) {
      const start = Date.now();
      await reply('🏓 Pong!');
      const end = Date.now();
      await reply(`⚡ Response time: ${end - start}ms`);
    },
  },
  {
    name: 'toimg',
    aliases: ['toimage'],
    category: 'Utility',
    description: 'Convert sticker to image',
    async execute({ sock, from, msg, reply, sendImage }) {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted?.stickerMessage) return reply('❌ Reply to a sticker.');
      try {
        const buffer = await downloadMedia(quoted.stickerMessage, 'sticker');
        await sendImage(buffer, '🖼️ Converted sticker to image');
      } catch {
        await reply('❌ Conversion failed.');
      }
    },
  },
];
