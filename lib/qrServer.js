const express = require('express');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs-extra');
const settings = require('../settings');

let currentQR = null;
let isConnected = false;
let botNumber = '';
let pairingCode = null;

function setQR(qr) { currentQR = qr; isConnected = false; }
function setConnected(number) { isConnected = true; botNumber = number; currentQR = null; pairingCode = null; }
function setPairingCode(code) { pairingCode = code; }
function setDisconnected() { isConnected = false; }

function setupQRRoutes(app) {
  // ── Main pairing page ──────────────────────────────────────────────────────
  app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${settings.botName} — Pairing</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #050d1a;
      --card: #0a1628;
      --border: #00ff88;
      --text: #e0f7ff;
      --muted: #5a8a7a;
      --green: #00ff88;
      --cyan: #00d4ff;
    }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Segoe UI', system-ui, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: 24px 16px;
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
    }
    .logo {
      width: 110px;
      height: 110px;
      border-radius: 50%;
      border: 3px solid var(--green);
      object-fit: cover;
      box-shadow: 0 0 30px rgba(0,255,136,0.3);
      margin-bottom: 16px;
    }
    h1 {
      font-size: 2rem;
      background: linear-gradient(90deg, var(--green), var(--cyan));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: 2px;
    }
    .subtitle { color: var(--muted); margin-top: 6px; font-size: 0.95rem; }
    .card {
      background: var(--card);
      border: 1px solid rgba(0,255,136,0.2);
      border-radius: 16px;
      padding: 32px;
      width: 100%;
      max-width: 420px;
      text-align: center;
      box-shadow: 0 0 40px rgba(0,255,136,0.05);
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      border-radius: 999px;
      font-size: 0.85rem;
      font-weight: 600;
      margin-bottom: 24px;
    }
    .status-badge.connected { background: rgba(0,255,136,0.1); color: var(--green); border: 1px solid var(--green); }
    .status-badge.waiting { background: rgba(0,212,255,0.1); color: var(--cyan); border: 1px solid var(--cyan); }
    .status-badge.offline { background: rgba(255,80,80,0.1); color: #ff5050; border: 1px solid #ff5050; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
    .qr-wrap {
      background: #fff;
      border-radius: 12px;
      padding: 16px;
      display: inline-block;
      margin: 16px 0;
    }
    .qr-wrap img { display: block; border-radius: 8px; }
    .pairing-code {
      font-size: 2.2rem;
      font-weight: 900;
      letter-spacing: 8px;
      color: var(--green);
      background: rgba(0,255,136,0.05);
      border: 2px dashed rgba(0,255,136,0.4);
      border-radius: 12px;
      padding: 20px 24px;
      margin: 20px 0;
      font-family: 'Courier New', monospace;
    }
    .instructions {
      text-align: left;
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid rgba(255,255,255,0.06);
    }
    .instructions h3 { color: var(--cyan); font-size: 0.9rem; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px; }
    .step {
      display: flex;
      gap: 12px;
      margin-bottom: 10px;
      font-size: 0.88rem;
      color: var(--muted);
      align-items: flex-start;
    }
    .step-num {
      flex-shrink: 0;
      width: 22px;
      height: 22px;
      background: rgba(0,255,136,0.1);
      border: 1px solid var(--green);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      color: var(--green);
      font-weight: 700;
    }
    .refresh-btn {
      display: inline-block;
      margin-top: 20px;
      padding: 10px 28px;
      background: linear-gradient(90deg, var(--green), var(--cyan));
      color: #050d1a;
      font-weight: 700;
      font-size: 0.9rem;
      border: none;
      border-radius: 999px;
      cursor: pointer;
      text-decoration: none;
    }
    .connected-info { margin-top: 12px; color: var(--muted); font-size: 0.9rem; }
    .connected-info strong { color: var(--green); }
    .tab-group { display: flex; gap: 8px; margin-bottom: 20px; justify-content: center; }
    .tab {
      padding: 7px 18px;
      border-radius: 999px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid rgba(0,255,136,0.3);
      color: var(--muted);
      background: transparent;
      transition: all 0.2s;
    }
    .tab.active { background: var(--green); color: #050d1a; border-color: var(--green); }
    footer { margin-top: 32px; color: var(--muted); font-size: 0.8rem; text-align: center; }
    footer a { color: var(--cyan); text-decoration: none; }
  </style>
  <script>
    let activeTab = 'qr';
    function setTab(t) {
      activeTab = t;
      document.getElementById('tab-qr').className = 'tab' + (t==='qr'?' active':'');
      document.getElementById('tab-pair').className = 'tab' + (t==='pair'?' active':'');
      document.getElementById('qr-section').style.display = t==='qr' ? 'block' : 'none';
      document.getElementById('pair-section').style.display = t==='pair' ? 'block' : 'none';
    }
    // Auto refresh every 15s to pick up new QR
    setTimeout(() => location.reload(), 15000);
  </script>
</head>
<body>
  <div class="header">
    <img class="logo" src="/bot-image" alt="Bot Logo" onerror="this.style.display='none'"/>
    <h1>${settings.botName}</h1>
    <p class="subtitle">WhatsApp Multi-Device Bot</p>
  </div>

  <div class="card">
    ${isConnected ? `
      <div class="status-badge connected"><span class="dot"></span> Connected</div>
      <div style="font-size:3rem;margin:16px 0">✅</div>
      <div class="connected-info">Bot is <strong>online</strong> and ready!<br/>
        ${botNumber ? `<small>Connected as: ${botNumber.split(':')[0]}</small>` : ''}
      </div>
      <br/>
      <a class="refresh-btn" href="/health">View Health Status</a>
    ` : `
      <div class="status-badge ${currentQR || pairingCode ? 'waiting' : 'offline'}">
        <span class="dot"></span>
        ${currentQR || pairingCode ? 'Waiting for scan...' : 'Bot starting...'}
      </div>

      ${currentQR || pairingCode ? `
      <div class="tab-group">
        <button id="tab-qr" class="tab active" onclick="setTab('qr')">📷 QR Code</button>
        <button id="tab-pair" class="tab" onclick="setTab('pair')">📱 Pairing Code</button>
      </div>

      <div id="qr-section">
        ${currentQR ? `
          <div class="qr-wrap">
            <img src="/qr-image" width="260" height="260" alt="QR Code"/>
          </div>
          <p style="color:var(--muted);font-size:0.82rem">Auto-refreshes every 15 seconds</p>
        ` : '<p style="color:var(--muted)">Generating QR code...</p>'}

        <div class="instructions">
          <h3>How to scan</h3>
          <div class="step"><span class="step-num">1</span><span>Open WhatsApp on your phone</span></div>
          <div class="step"><span class="step-num">2</span><span>Tap ⋮ (3 dots) → <strong>Linked Devices</strong></span></div>
          <div class="step"><span class="step-num">3</span><span>Tap <strong>Link a Device</strong></span></div>
          <div class="step"><span class="step-num">4</span><span>Point camera at the QR code above</span></div>
        </div>
      </div>

      <div id="pair-section" style="display:none">
        ${pairingCode ? `
          <div class="pairing-code">${pairingCode}</div>
          <p style="color:var(--muted);font-size:0.82rem;margin-top:4px">Enter this code in WhatsApp</p>
        ` : `
          <p style="color:var(--muted);margin:20px 0">
            Set <strong>OWNER_NUMBER</strong> in your environment variables,<br/>
            then restart with <code style="color:var(--green)">node index.js --pair</code>
          </p>
        `}

        <div class="instructions">
          <h3>How to use pairing code</h3>
          <div class="step"><span class="step-num">1</span><span>Open WhatsApp on your phone</span></div>
          <div class="step"><span class="step-num">2</span><span>Tap ⋮ → <strong>Linked Devices → Link a Device</strong></span></div>
          <div class="step"><span class="step-num">3</span><span>Tap <strong>Link with phone number</strong></span></div>
          <div class="step"><span class="step-num">4</span><span>Enter the code shown above</span></div>
        </div>
      </div>
      ` : `
        <div style="font-size:3rem;margin:24px 0">⏳</div>
        <p style="color:var(--muted)">Bot is starting up...<br/>This page will auto-refresh.</p>
      `}
    `}
  </div>

  <footer>
    🧠 ${settings.botName} v${settings.botVersion} &nbsp;|&nbsp;
    <a href="/health">Health</a> &nbsp;|&nbsp;
    Powered by <a href="https://github.com/WhiskeySockets/Baileys">Baileys</a>
  </footer>
</body>
</html>`);
  });

  // ── QR image endpoint ──────────────────────────────────────────────────────
  app.get('/qr-image', async (req, res) => {
    if (!currentQR) return res.status(404).send('No QR available');
    try {
      const img = await qrcode.toBuffer(currentQR, {
        errorCorrectionLevel: 'M',
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
      });
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'no-cache, no-store');
      res.send(img);
    } catch {
      res.status(500).send('QR generation failed');
    }
  });

  // ── Bot image endpoint ─────────────────────────────────────────────────────
  app.get('/bot-image', async (req, res) => {
    const imgPath = path.resolve(__dirname, '../media/bot-image.png');
    if (await fs.pathExists(imgPath)) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.sendFile(imgPath);
    } else {
      res.status(404).send('No image');
    }
  });

  // ── Status API ─────────────────────────────────────────────────────────────
  app.get('/status', (req, res) => {
    res.json({
      connected: isConnected,
      hasQR: !!currentQR,
      hasPairingCode: !!pairingCode,
      botNumber: botNumber || null,
    });
  });
}

module.exports = { setupQRRoutes, setQR, setConnected, setPairingCode, setDisconnected };
