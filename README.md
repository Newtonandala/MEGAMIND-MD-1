# 🧠 MEGAMIND-MD — WhatsApp Multi-Device Bot

<p align="center">
  <img src="./media/bot-image.png" width="200" alt="MEGAMIND-MD Logo"/>
</p>

<p align="center">
  <b>Production-ready WhatsApp bot powered by <a href="https://github.com/WhiskeySockets/Baileys">@whiskeysockets/baileys</a></b>
</p>

---

## ✨ Features

| Category | Commands |
|---|---|
| 👑 Owner | restart, shutdown, broadcast, block/unblock, setppbot, setbio, autoread, anticall, ban/unban |
| 👥 Group | kick, add, promote, demote, mute/unmute, tagall, hidetag, welcome, antilink, antibadword, antidelete, groupinfo |
| ⬇️ Downloader | ytmp3, ytmp4, ytsearch, tiktok, instagram, spotify, pinterest, facebook |
| 🧠 AI | ai/gpt, aicode, imagine, aitext, summarize, translate |
| 🎮 Fun | joke, quote, truth, dare, tod, meme, hug, pat, slap, 8ball, flip, roll |
| 🛠️ Utility | sticker, tts, qr, weather, shorturl, ping, toimg |
| 📌 General | menu, info, runtime, owner |

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone <your-repo>
cd megamind-md
npm install
```

### 2. Configure
```bash
cp .env.example .env
nano .env  # Fill in your details
```

### 3. Run (QR Code mode)
```bash
npm start
```

### 4. Run (Pairing Code mode)
```bash
node index.js --pair
```
Enter the displayed code in **WhatsApp → Linked Devices → Link with phone number**

---

## ⚙️ Environment Variables

| Variable | Description | Required |
|---|---|---|
| `OWNER_NUMBER` | Your WhatsApp number (international format, no +) | ✅ |
| `OWNER_NAME` | Your name | ✅ |
| `BOT_NAME` | Bot display name | ✅ |
| `BOT_MODE` | `public` or `private` | ✅ |
| `PREFIX` | Command prefix (default: `.`) | ✅ |
| `OPENAI_API_KEY` | For GPT + image generation | Optional |
| `GEMINI_API_KEY` | For Google Gemini AI | Optional |
| `WEATHER_API_KEY` | OpenWeatherMap key | Optional |
| `PORT` | Express server port | Optional |
| `UPTIME_URL` | Self-ping URL for uptime monitoring | Optional |

---

## 🌐 Deployment Guides

### Render.com
1. Create new **Web Service**
2. Connect your GitHub repo
3. Set **Build Command:** `npm install`
4. Set **Start Command:** `node index.js`
5. Add environment variables in Render dashboard
6. Set a **Disk** at `/app/session` (1GB) to persist session

### Railway.app
1. Create new project → Deploy from GitHub
2. Add environment variables
3. Set start command: `node index.js`
4. Add a volume at `/app/session`

### Heroku
```bash
heroku create megamind-md
heroku config:set OWNER_NUMBER=1234567890 BOT_NAME=MEGAMIND-MD
git push heroku main
```

### Koyeb
1. Create service → GitHub
2. Set run command: `node index.js`
3. Set port: `3000`
4. Add environment variables

### VPS / Server
```bash
npm install -g pm2
pm2 start index.js --name megamind-md
pm2 save
pm2 startup
```

### Replit
1. Fork/import this project
2. Set environment variables in Secrets
3. Click Run
4. Set `UPTIME_URL` to your Replit app URL for persistent uptime

---

## 🔌 Plugin System

Add new commands by creating `.js` files in the `plugins/` folder:

```js
// plugins/hello.js
module.exports = {
  name: 'hello',
  aliases: ['hi'],
  category: 'General',
  description: 'Say hello',
  async execute({ reply, senderPhone }) {
    await reply(`👋 Hello, ${senderPhone}!`);
  },
};
```

The bot will auto-load all plugins on startup. No main file changes needed!

---

## 🛡️ Security Features

- **Anti-crash** — All errors caught, bot keeps running
- **Rate limiting** — Spam protection per user
- **Input validation** — All commands validate arguments
- **Safe execution** — Each command wrapped in try/catch
- **Mode control** — Public/private mode support
- **Owner verification** — Owner-only commands secured

---

## 📁 Project Structure

```
megamind-md/
├── index.js              # Main entry point
├── settings.js           # All configuration
├── package.json
├── .env.example
├── Dockerfile
├── render.yaml
├── Procfile
├── commands/             # Built-in commands
│   ├── owner.js         # Owner commands
│   ├── group.js         # Group management
│   ├── downloader.js    # Media downloaders
│   ├── ai.js            # AI features
│   ├── fun.js           # Fun commands
│   ├── utility.js       # Utility tools
│   └── menu.js          # Help menu
├── plugins/             # Your custom commands (auto-loaded)
├── lib/
│   ├── connection.js    # WhatsApp connection + reconnect
│   ├── handler.js       # Message routing + spam protection
│   ├── pluginLoader.js  # Dynamic plugin loading
│   ├── database.js      # JSON database (lowdb)
│   ├── logger.js        # Structured logging (pino)
│   └── utils.js         # Helpers
├── config/
│   └── index.js         # Merged config
├── session/             # WhatsApp session files (auto-created)
├── database/            # JSON database files (auto-created)
├── media/               # Bot image and media
└── temp/                # Temporary files (auto-cleaned)
```

---

## ❓ Troubleshooting

| Problem | Solution |
|---|---|
| QR code not showing | Run `node index.js --qr` |
| Session expired | Delete `session/` folder, restart bot |
| Command not working | Check `PREFIX` in `.env`, ensure bot has admin in groups |
| Bot keeps disconnecting | Check internet, set `UPTIME_URL` for auto-ping |
| AI commands failing | Add `OPENAI_API_KEY` or `GEMINI_API_KEY` to `.env` |
| Sticker not working | Ensure `ffmpeg` is installed on your system |

---

## 📜 License

MIT — Free to use, modify, and distribute.

---

<p align="center">Made with ❤️ by MEGAMIND-MD | Powered by Baileys</p>
