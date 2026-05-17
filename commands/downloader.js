const axios = require('axios');
const ytdl = require('ytdl-core');
const { saveTempFile } = require('../lib/utils');
const fs = require('fs-extra');

async function downloadWithAxios(url) {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
  return Buffer.from(res.data);
}

module.exports = [
  {
    name: 'ytmp3',
    aliases: ['yta', 'ytaudio', 'song'],
    category: 'Downloader',
    description: 'Download YouTube audio (mp3)',
    async execute({ args, reply, sock, from, msg }) {
      if (!args[0]) return reply('Usage: .ytmp3 <YouTube URL>');
      const url = args[0];
      if (!ytdl.validateURL(url)) return reply('❌ Invalid YouTube URL.');
      await reply('⏳ Downloading audio...');
      try {
        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title;
        const duration = parseInt(info.videoDetails.lengthSeconds);
        if (duration > 600) return reply('❌ Video is too long (max 10 minutes).');
        const stream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);
        await sock.sendMessage(from, {
          audio: buffer,
          mimetype: 'audio/mp4',
          fileName: `${title}.mp4`,
        }, { quoted: msg });
      } catch (err) {
        await reply(`❌ Download failed: ${err.message}`);
      }
    },
  },
  {
    name: 'ytmp4',
    aliases: ['ytv', 'ytvideo'],
    category: 'Downloader',
    description: 'Download YouTube video (mp4)',
    async execute({ args, reply, sock, from, msg }) {
      if (!args[0]) return reply('Usage: .ytmp4 <YouTube URL>');
      const url = args[0];
      if (!ytdl.validateURL(url)) return reply('❌ Invalid YouTube URL.');
      await reply('⏳ Downloading video... (this may take a moment)');
      try {
        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title;
        const duration = parseInt(info.videoDetails.lengthSeconds);
        if (duration > 300) return reply('❌ Video is too long (max 5 minutes for video).');
        const stream = ytdl(url, { filter: 'videoandaudio', quality: 'highest' });
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);
        await sock.sendMessage(from, {
          video: buffer,
          caption: `🎬 *${title}*`,
          fileName: `${title}.mp4`,
        }, { quoted: msg });
      } catch (err) {
        await reply(`❌ Download failed: ${err.message}`);
      }
    },
  },
  {
    name: 'ytsearch',
    aliases: ['yts'],
    category: 'Downloader',
    description: 'Search YouTube',
    async execute({ args, reply }) {
      if (!args.length) return reply('Usage: .ytsearch <query>');
      const query = args.join(' ');
      try {
        const res = await axios.get(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=5&key=`,
          { timeout: 10000 }
        );
        // Fallback: use alternative search
        const searchRes = await axios.get(
          `https://api.fabdl.com/youtube/search?q=${encodeURIComponent(query)}`,
          { timeout: 10000 }
        ).catch(() => null);
        if (!searchRes) return reply('❌ Search unavailable. Provide a direct YouTube URL instead.');
        const items = searchRes.data?.result?.slice(0, 5) || [];
        if (!items.length) return reply('❌ No results found.');
        let text = `🔍 *YouTube Search: ${query}*\n\n`;
        items.forEach((item, i) => {
          text += `${i + 1}. *${item.title}*\nhttps://youtube.com/watch?v=${item.id}\n\n`;
        });
        await reply(text.trim());
      } catch {
        await reply('❌ Search failed. Try providing a direct YouTube URL.');
      }
    },
  },
  {
    name: 'tiktok',
    aliases: ['tt'],
    category: 'Downloader',
    description: 'Download TikTok video (no watermark)',
    async execute({ args, reply, sock, from, msg }) {
      if (!args[0]) return reply('Usage: .tiktok <TikTok URL>');
      const url = args[0];
      await reply('⏳ Downloading TikTok...');
      try {
        const apiRes = await axios.post(
          'https://api.tikmate.app/api/lookup',
          `url=${encodeURIComponent(url)}`,
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
        );
        const { author, author_nickname, title } = apiRes.data;
        const downloadUrl = `https://api.tikmate.app/download?id=${apiRes.data.id}&token=${apiRes.data.token}`;
        const buffer = await downloadWithAxios(downloadUrl);
        await sock.sendMessage(from, {
          video: buffer,
          caption: `🎵 *${title || 'TikTok Video'}*\n👤 ${author_nickname || author}`,
        }, { quoted: msg });
      } catch (err) {
        await reply(`❌ TikTok download failed: ${err.message}`);
      }
    },
  },
  {
    name: 'instagram',
    aliases: ['ig', 'insta'],
    category: 'Downloader',
    description: 'Download Instagram post/reel',
    async execute({ args, reply, sock, from, msg }) {
      if (!args[0]) return reply('Usage: .instagram <Instagram URL>');
      const url = args[0];
      await reply('⏳ Downloading Instagram media...');
      try {
        const res = await axios.post(
          'https://social-media-video-downloader.p.rapidapi.com/smvd/get/all',
          { url },
          {
            headers: {
              'content-type': 'application/json',
              'X-RapidAPI-Host': 'social-media-video-downloader.p.rapidapi.com',
              'X-RapidAPI-Key': 'RAPIDAPI_KEY',
            },
            timeout: 20000,
          }
        );
        const links = res.data?.links;
        if (!links?.length) return reply('❌ Could not fetch Instagram media. Note: RapidAPI key required.');
        const videoLink = links.find(l => l.quality === 'hd') || links[0];
        const buffer = await downloadWithAxios(videoLink.link);
        await sock.sendMessage(from, { video: buffer, caption: '📸 *Instagram Media*' }, { quoted: msg });
      } catch {
        await reply('❌ Instagram download requires RapidAPI key configuration.');
      }
    },
  },
  {
    name: 'spotify',
    aliases: ['sp'],
    category: 'Downloader',
    description: 'Download/preview Spotify track info',
    async execute({ args, reply }) {
      if (!args[0]) return reply('Usage: .spotify <Spotify track URL or song name>');
      await reply('⏳ Searching Spotify...');
      try {
        const query = args.join(' ').replace('https://open.spotify.com/track/', '');
        const res = await axios.get(
          `https://api.spotifydown.com/search?q=${encodeURIComponent(query)}`,
          { headers: { origin: 'https://spotifydown.com' }, timeout: 10000 }
        );
        const track = res.data?.trackList?.[0];
        if (!track) return reply('❌ Track not found.');
        await reply(`🎵 *Spotify Track*\n\n*Title:* ${track.title}\n*Artist:* ${track.artist}\n*Album:* ${track.album}\n\n_Note: Full download requires a Spotify API integration._`);
      } catch {
        await reply('❌ Spotify search failed.');
      }
    },
  },
  {
    name: 'pinterest',
    aliases: ['pin'],
    category: 'Downloader',
    description: 'Download Pinterest image',
    async execute({ args, reply, sendImage }) {
      if (!args[0]) return reply('Usage: .pinterest <Pinterest URL>');
      await reply('⏳ Downloading Pinterest image...');
      try {
        const res = await axios.get(
          `https://api.pinterestdownloader.com/?url=${encodeURIComponent(args[0])}`,
          { timeout: 10000 }
        );
        const imgUrl = res.data?.url || res.data?.image;
        if (!imgUrl) return reply('❌ Could not extract image from this Pinterest URL.');
        const imgRes = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 20000 });
        await sendImage(Buffer.from(imgRes.data), '📌 Pinterest Image');
      } catch {
        await reply('❌ Pinterest download failed.');
      }
    },
  },
  {
    name: 'facebook',
    aliases: ['fb'],
    category: 'Downloader',
    description: 'Download Facebook video',
    async execute({ args, reply, sock, from, msg }) {
      if (!args[0]) return reply('Usage: .facebook <Facebook video URL>');
      await reply('⏳ Fetching Facebook video...');
      try {
        const res = await axios.get(
          `https://social-media-video-downloader.p.rapidapi.com/smvd/get/facebook?url=${encodeURIComponent(args[0])}`,
          {
            headers: {
              'X-RapidAPI-Host': 'social-media-video-downloader.p.rapidapi.com',
              'X-RapidAPI-Key': 'RAPIDAPI_KEY',
            },
            timeout: 20000,
          }
        );
        const link = res.data?.links?.[0]?.link;
        if (!link) return reply('❌ Could not fetch Facebook video. RapidAPI key required.');
        const buffer = await downloadWithAxios(link);
        await sock.sendMessage(from, { video: buffer, caption: '📹 Facebook Video' }, { quoted: msg });
      } catch {
        await reply('❌ Facebook download requires RapidAPI key configuration.');
      }
    },
  },
];
