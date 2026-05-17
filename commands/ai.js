const axios = require('axios');
const settings = require('../settings');

async function askOpenAI(prompt, systemPrompt = 'You are MEGAMIND-MD, a helpful WhatsApp bot assistant.') {
  const apiKey = settings.apiKeys.openai;
  if (!apiKey) throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY in .env');
  const res = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    },
    {
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      timeout: 30000,
    }
  );
  return res.data.choices[0].message.content.trim();
}

async function askGemini(prompt) {
  const apiKey = settings.apiKeys.gemini;
  if (!apiKey) throw new Error('Gemini API key not configured. Set GEMINI_API_KEY in .env');
  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
    { contents: [{ parts: [{ text: prompt }] }] },
    { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
  );
  return res.data.candidates[0].content.parts[0].text.trim();
}

module.exports = [
  {
    name: 'ai',
    aliases: ['gpt', 'chat', 'ask'],
    category: 'AI',
    description: 'Chat with AI (GPT or Gemini)',
    async execute({ args, reply }) {
      if (!args.length) return reply('Usage: .ai <your question>');
      const prompt = args.join(' ');
      await reply('🧠 Thinking...');
      try {
        let response;
        if (settings.apiKeys.openai) {
          response = await askOpenAI(prompt);
        } else if (settings.apiKeys.gemini) {
          response = await askGemini(prompt);
        } else {
          // Free fallback: use a public API
          const res = await axios.get(
            `https://api.simsimi.net/v2/?text=${encodeURIComponent(prompt)}&lc=en`,
            { timeout: 10000 }
          ).catch(() => null);
          response = res?.data?.success || 'No AI API keys configured. Add OPENAI_API_KEY or GEMINI_API_KEY to .env';
        }
        await reply(`🧠 *MEGAMIND-MD AI*\n\n${response}`);
      } catch (err) {
        await reply(`❌ AI error: ${err.message}`);
      }
    },
  },
  {
    name: 'aicode',
    aliases: ['code', 'codehelper'],
    category: 'AI',
    description: 'Get AI help with code',
    async execute({ args, reply }) {
      if (!args.length) return reply('Usage: .aicode <your coding question>');
      const prompt = `You are an expert programmer. Answer this coding question concisely with code examples where appropriate: ${args.join(' ')}`;
      await reply('💻 Generating code...');
      try {
        const response = await askOpenAI(prompt, 'You are an expert software engineer. Be concise and practical.');
        await reply(`💻 *Code Helper*\n\n${response}`);
      } catch (err) {
        await reply(`❌ ${err.message}`);
      }
    },
  },
  {
    name: 'imagine',
    aliases: ['aiimage', 'generateimage'],
    category: 'AI',
    description: 'Generate an AI image from a prompt',
    async execute({ args, reply, sendImage }) {
      if (!args.length) return reply('Usage: .imagine <description>');
      const apiKey = settings.apiKeys.openai;
      if (!apiKey) return reply('❌ OpenAI API key required for image generation. Set OPENAI_API_KEY in .env');
      const prompt = args.join(' ');
      await reply('🎨 Generating image...');
      try {
        const res = await axios.post(
          'https://api.openai.com/v1/images/generations',
          { model: 'dall-e-3', prompt, n: 1, size: '1024x1024' },
          { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 60000 }
        );
        const imageUrl = res.data.data[0].url;
        const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 30000 });
        await sendImage(Buffer.from(imgRes.data), `🎨 *Generated:* ${prompt}`);
      } catch (err) {
        await reply(`❌ Image generation failed: ${err.message}`);
      }
    },
  },
  {
    name: 'aitext',
    aliases: ['rewrite', 'paraphrase'],
    category: 'AI',
    description: 'Rewrite/improve text with AI',
    async execute({ args, reply }) {
      if (!args.length) return reply('Usage: .aitext <text to improve>');
      const prompt = `Rewrite the following text to be clearer, more professional, and engaging. Keep the same meaning:\n\n${args.join(' ')}`;
      await reply('✍️ Rewriting...');
      try {
        const response = await askOpenAI(prompt, 'You are a professional writing assistant.');
        await reply(`✍️ *Rewritten Text*\n\n${response}`);
      } catch (err) {
        await reply(`❌ ${err.message}`);
      }
    },
  },
  {
    name: 'summarize',
    aliases: ['tldr', 'summary'],
    category: 'AI',
    description: 'Summarize text with AI',
    async execute({ args, reply }) {
      if (!args.length) return reply('Usage: .summarize <text>');
      const prompt = `Summarize the following text in 3-5 bullet points:\n\n${args.join(' ')}`;
      await reply('📝 Summarizing...');
      try {
        const response = await askOpenAI(prompt, 'You are a concise summarization assistant.');
        await reply(`📝 *Summary*\n\n${response}`);
      } catch (err) {
        await reply(`❌ ${err.message}`);
      }
    },
  },
  {
    name: 'translate',
    aliases: ['tr'],
    category: 'AI',
    description: 'Translate text using AI',
    async execute({ args, reply }) {
      if (args.length < 2) return reply('Usage: .translate <language> <text>');
      const lang = args[0];
      const text = args.slice(1).join(' ');
      const prompt = `Translate the following text to ${lang}. Only return the translation, nothing else:\n\n${text}`;
      await reply('🌐 Translating...');
      try {
        const response = await askOpenAI(prompt, 'You are a translation assistant.');
        await reply(`🌐 *Translation (${lang})*\n\n${response}`);
      } catch (err) {
        await reply(`❌ ${err.message}`);
      }
    },
  },
];
