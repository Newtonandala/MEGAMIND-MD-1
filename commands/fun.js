const axios = require('axios');

const jokes = [
  "Why don't scientists trust atoms? Because they make up everything! 😄",
  "I told my wife she was drawing her eyebrows too high. She looked surprised. 😂",
  "Why don't skeletons fight each other? They don't have the guts. 💀",
  "I'm reading a book about anti-gravity. It's impossible to put down! 📚",
  "Did you hear about the mathematician who's afraid of negative numbers? He'll stop at nothing to avoid them! 🔢",
  "Why did the scarecrow win an award? Because he was outstanding in his field! 🌾",
  "I only know 25 letters of the alphabet. I don't know y. 🤷",
  "What do you call fake spaghetti? An impasta! 🍝",
  "How do you organize a space party? You planet! 🪐",
  "Why did the bicycle fall over? Because it was two-tired! 🚲",
];

const quotes = [
  '"The only way to do great work is to love what you do." — Steve Jobs',
  '"In the middle of every difficulty lies opportunity." — Albert Einstein',
  '"Life is what happens when you\'re busy making other plans." — John Lennon',
  '"The future belongs to those who believe in the beauty of their dreams." — Eleanor Roosevelt',
  '"Success is not final, failure is not fatal: it is the courage to continue that counts." — Winston Churchill',
  '"The only impossible journey is the one you never begin." — Tony Robbins',
  '"Do not go where the path may lead, go instead where there is no path and leave a trail." — Ralph Waldo Emerson',
  '"Believe you can and you\'re halfway there." — Theodore Roosevelt',
  '"If you want to achieve greatness stop asking for permission." — Anonymous',
  '"Innovation distinguishes between a leader and a follower." — Steve Jobs',
];

const truthQuestions = [
  'What is the most embarrassing thing you\'ve ever done?',
  'What is your biggest fear?',
  'What is something you\'ve never told your best friend?',
  'Have you ever cheated on a test?',
  'What\'s the most childish thing you still do?',
  'What\'s the weirdest dream you\'ve ever had?',
  'Have you ever had a crush on a teacher?',
  'What\'s the most trouble you\'ve ever been in?',
  'What\'s a secret you\'ve kept from your parents?',
  'Have you ever talked about a friend behind their back?',
];

const dareActions = [
  'Do your best celebrity impression.',
  'Dance for 30 seconds without music.',
  'Send a voice note of you singing the first song that comes to mind.',
  'Tell a joke — if no one laughs, do it again.',
  'Say the alphabet backwards.',
  'Do 10 push-ups right now.',
  'Send a message to the 5th person in your contacts.',
  'Describe yourself in only 3 words.',
  'Do your best robot impression.',
  'Say "I am a banana" five times fast.',
];

const animeReactions = [
  'https://nekos.life/api/v2/img/hug',
  'https://nekos.life/api/v2/img/pat',
  'https://nekos.life/api/v2/img/kiss',
  'https://nekos.life/api/v2/img/slap',
  'https://nekos.life/api/v2/img/tickle',
];

module.exports = [
  {
    name: 'joke',
    aliases: ['jokes'],
    category: 'Fun',
    description: 'Get a random joke',
    async execute({ reply }) {
      const joke = jokes[Math.floor(Math.random() * jokes.length)];
      await reply(`😂 *Joke Time!*\n\n${joke}`);
    },
  },
  {
    name: 'quote',
    aliases: ['quotes'],
    category: 'Fun',
    description: 'Get an inspirational quote',
    async execute({ reply }) {
      const quote = quotes[Math.floor(Math.random() * quotes.length)];
      await reply(`💬 *Quote of the Moment*\n\n${quote}`);
    },
  },
  {
    name: 'truth',
    category: 'Fun',
    description: 'Get a truth question for truth or dare',
    async execute({ reply }) {
      const q = truthQuestions[Math.floor(Math.random() * truthQuestions.length)];
      await reply(`🔍 *TRUTH*\n\n${q}`);
    },
  },
  {
    name: 'dare',
    category: 'Fun',
    description: 'Get a dare for truth or dare',
    async execute({ reply }) {
      const d = dareActions[Math.floor(Math.random() * dareActions.length)];
      await reply(`🎯 *DARE*\n\n${d}`);
    },
  },
  {
    name: 'tod',
    aliases: ['truthordare'],
    category: 'Fun',
    description: 'Random truth or dare',
    async execute({ reply }) {
      const isTruth = Math.random() < 0.5;
      if (isTruth) {
        const q = truthQuestions[Math.floor(Math.random() * truthQuestions.length)];
        await reply(`🔍 *TRUTH*\n\n${q}`);
      } else {
        const d = dareActions[Math.floor(Math.random() * dareActions.length)];
        await reply(`🎯 *DARE*\n\n${d}`);
      }
    },
  },
  {
    name: 'meme',
    aliases: ['memes'],
    category: 'Fun',
    description: 'Get a random meme',
    async execute({ sock, from, msg, reply, sendImage }) {
      try {
        const res = await axios.get('https://meme-api.com/gimme', { timeout: 10000 });
        const meme = res.data;
        const imgRes = await axios.get(meme.url, { responseType: 'arraybuffer', timeout: 15000 });
        const buffer = Buffer.from(imgRes.data);
        await sendImage(buffer, `😂 *${meme.title}*\n\n📌 r/${meme.subreddit}`);
      } catch {
        await reply('❌ Could not fetch meme. Try again!');
      }
    },
  },
  {
    name: 'hug',
    category: 'Fun',
    description: 'Send an anime hug reaction',
    async execute({ sock, from, msg, sendImage, reply }) {
      try {
        const res = await axios.get('https://nekos.life/api/v2/img/hug', { timeout: 10000 });
        const imgRes = await axios.get(res.data.url, { responseType: 'arraybuffer', timeout: 15000 });
        await sendImage(Buffer.from(imgRes.data), '🤗 *Sending a hug!*');
      } catch {
        await reply('❌ Could not fetch anime reaction.');
      }
    },
  },
  {
    name: 'pat',
    category: 'Fun',
    description: 'Send an anime pat reaction',
    async execute({ sock, from, msg, sendImage, reply }) {
      try {
        const res = await axios.get('https://nekos.life/api/v2/img/pat', { timeout: 10000 });
        const imgRes = await axios.get(res.data.url, { responseType: 'arraybuffer', timeout: 15000 });
        await sendImage(Buffer.from(imgRes.data), '👋 *Pat pat!*');
      } catch {
        await reply('❌ Could not fetch anime reaction.');
      }
    },
  },
  {
    name: 'slap',
    category: 'Fun',
    description: 'Send an anime slap reaction',
    async execute({ sendImage, reply }) {
      try {
        const res = await axios.get('https://nekos.life/api/v2/img/slap', { timeout: 10000 });
        const imgRes = await axios.get(res.data.url, { responseType: 'arraybuffer', timeout: 15000 });
        await sendImage(Buffer.from(imgRes.data), '👋 *Slap!*');
      } catch {
        await reply('❌ Could not fetch reaction.');
      }
    },
  },
  {
    name: '8ball',
    aliases: ['magic8ball'],
    category: 'Fun',
    description: 'Ask the magic 8 ball',
    async execute({ args, reply }) {
      if (!args.length) return reply('Usage: .8ball <your question>');
      const answers = [
        '🟢 Yes, definitely!', '🟢 Without a doubt!', '🟢 It is certain!',
        '🟡 Ask again later.', '🟡 Cannot predict now.', '🟡 Reply hazy, try again.',
        '🔴 My sources say no.', '🔴 Outlook not so good.', '🔴 Don\'t count on it.',
      ];
      const answer = answers[Math.floor(Math.random() * answers.length)];
      await reply(`🎱 *Magic 8-Ball*\n\n❓ ${args.join(' ')}\n\n${answer}`);
    },
  },
  {
    name: 'flip',
    aliases: ['coinflip'],
    category: 'Fun',
    description: 'Flip a coin',
    async execute({ reply }) {
      const result = Math.random() < 0.5 ? '🪙 Heads!' : '🪙 Tails!';
      await reply(`Flipping a coin...\n\n${result}`);
    },
  },
  {
    name: 'roll',
    aliases: ['dice'],
    category: 'Fun',
    description: 'Roll a dice',
    async execute({ args, reply }) {
      const sides = parseInt(args[0]) || 6;
      const result = Math.floor(Math.random() * sides) + 1;
      await reply(`🎲 Rolled a ${sides}-sided dice: *${result}*`);
    },
  },
];
