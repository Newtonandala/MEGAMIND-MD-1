const { getGroup, updateGroup } = require('../lib/database');
const { phoneFromJid, mentionUsers } = require('../lib/utils');

async function getGroupAdmins(sock, from) {
  const meta = await sock.groupMetadata(from).catch(() => null);
  if (!meta) return { meta: null, admins: [], isBotAdmin: false };
  const admins = meta.participants.filter(p => p.admin).map(p => p.id);
  const botId = sock.user?.id?.replace(/:\d+/, '') + '@s.whatsapp.net';
  const isBotAdmin = admins.some(a => a.includes(botId.split('@')[0]));
  return { meta, admins, isBotAdmin };
}

module.exports = [
  {
    name: 'kick',
    aliases: ['remove'],
    category: 'Group',
    groupOnly: true,
    adminOnly: true,
    description: 'Kick a member from the group',
    async execute({ sock, msg, from, args, reply }) {
      const { isBotAdmin } = await getGroupAdmins(sock, from);
      if (!isBotAdmin) return reply('❌ I need admin rights to kick members.');
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      if (!mentioned.length) return reply('Usage: .kick @user');
      await sock.groupParticipantsUpdate(from, mentioned, 'remove');
      await reply(`✅ Kicked ${mentionUsers(mentioned)}`);
    },
  },
  {
    name: 'add',
    category: 'Group',
    groupOnly: true,
    adminOnly: true,
    description: 'Add a member to the group',
    async execute({ sock, from, args, reply }) {
      const { isBotAdmin } = await getGroupAdmins(sock, from);
      if (!isBotAdmin) return reply('❌ I need admin rights to add members.');
      if (!args[0]) return reply('Usage: .add <number>');
      const jid = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
      await sock.groupParticipantsUpdate(from, [jid], 'add');
      await reply(`✅ Added ${args[0]} to the group.`);
    },
  },
  {
    name: 'promote',
    category: 'Group',
    groupOnly: true,
    adminOnly: true,
    description: 'Promote a member to admin',
    async execute({ sock, msg, from, args, reply }) {
      const { isBotAdmin } = await getGroupAdmins(sock, from);
      if (!isBotAdmin) return reply('❌ I need admin rights to promote members.');
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      if (!mentioned.length) return reply('Usage: .promote @user');
      await sock.groupParticipantsUpdate(from, mentioned, 'promote');
      await reply(`✅ Promoted ${mentionUsers(mentioned)} to admin.`);
    },
  },
  {
    name: 'demote',
    category: 'Group',
    groupOnly: true,
    adminOnly: true,
    description: 'Demote an admin to member',
    async execute({ sock, msg, from, args, reply }) {
      const { isBotAdmin } = await getGroupAdmins(sock, from);
      if (!isBotAdmin) return reply('❌ I need admin rights to demote admins.');
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      if (!mentioned.length) return reply('Usage: .demote @user');
      await sock.groupParticipantsUpdate(from, mentioned, 'demote');
      await reply(`✅ Demoted ${mentionUsers(mentioned)}.`);
    },
  },
  {
    name: 'mute',
    category: 'Group',
    groupOnly: true,
    adminOnly: true,
    description: 'Mute the group (only admins can send)',
    async execute({ sock, from, reply }) {
      const { isBotAdmin } = await getGroupAdmins(sock, from);
      if (!isBotAdmin) return reply('❌ I need admin rights to mute the group.');
      await sock.groupSettingUpdate(from, 'announcement');
      updateGroup(from, { muted: true });
      await reply('🔇 Group muted. Only admins can send messages.');
    },
  },
  {
    name: 'unmute',
    category: 'Group',
    groupOnly: true,
    adminOnly: true,
    description: 'Unmute the group',
    async execute({ sock, from, reply }) {
      const { isBotAdmin } = await getGroupAdmins(sock, from);
      if (!isBotAdmin) return reply('❌ I need admin rights to unmute the group.');
      await sock.groupSettingUpdate(from, 'not_announcement');
      updateGroup(from, { muted: false });
      await reply('🔊 Group unmuted. Everyone can send messages.');
    },
  },
  {
    name: 'tagall',
    aliases: ['everyone', '@all'],
    category: 'Group',
    groupOnly: true,
    adminOnly: true,
    description: 'Tag all group members',
    async execute({ sock, from, args, reply, replyWithMention }) {
      const meta = await sock.groupMetadata(from).catch(() => null);
      if (!meta) return reply('❌ Could not fetch group info.');
      const members = meta.participants.map(p => p.id);
      const text = args.join(' ') || '📢 Attention everyone!';
      const mentions = members.map(m => `@${phoneFromJid(m)}`).join(' ');
      await sock.sendMessage(from, {
        text: `${text}\n\n${mentions}`,
        mentions: members,
      });
    },
  },
  {
    name: 'hidetag',
    category: 'Group',
    groupOnly: true,
    adminOnly: true,
    description: 'Tag all without visible mention text',
    async execute({ sock, from, args, msg }) {
      const meta = await sock.groupMetadata(from).catch(() => null);
      if (!meta) return;
      const members = meta.participants.map(p => p.id);
      const text = args.join(' ') || '👀';
      await sock.sendMessage(from, { text, mentions: members }, { quoted: msg });
    },
  },
  {
    name: 'welcome',
    category: 'Group',
    groupOnly: true,
    adminOnly: true,
    description: 'Toggle welcome messages',
    async execute({ from, args, reply }) {
      const on = args[0] === 'on';
      updateGroup(from, { welcome: on });
      await reply(`✅ Welcome messages are now ${on ? 'ON' : 'OFF'}`);
    },
  },
  {
    name: 'antilink',
    category: 'Group',
    groupOnly: true,
    adminOnly: true,
    description: 'Toggle anti-link in group',
    async execute({ from, args, reply }) {
      const on = args[0] === 'on';
      updateGroup(from, { antiLink: on });
      await reply(`✅ Anti-link is now ${on ? 'ON' : 'OFF'}`);
    },
  },
  {
    name: 'antibadword',
    category: 'Group',
    groupOnly: true,
    adminOnly: true,
    description: 'Toggle anti-bad-word filter',
    async execute({ from, args, reply }) {
      const on = args[0] === 'on';
      updateGroup(from, { antiBadWord: on });
      await reply(`✅ Anti-badword is now ${on ? 'ON' : 'OFF'}`);
    },
  },
  {
    name: 'antidelete',
    category: 'Group',
    groupOnly: true,
    adminOnly: true,
    description: 'Toggle anti-delete (re-sends deleted messages)',
    async execute({ from, args, reply }) {
      const on = args[0] === 'on';
      updateGroup(from, { antiDelete: on });
      await reply(`✅ Anti-delete is now ${on ? 'ON' : 'OFF'}`);
    },
  },
  {
    name: 'groupinfo',
    aliases: ['ginfo'],
    category: 'Group',
    groupOnly: true,
    description: 'Get group information',
    async execute({ sock, from, reply }) {
      const meta = await sock.groupMetadata(from).catch(() => null);
      if (!meta) return reply('❌ Could not fetch group info.');
      const admins = meta.participants.filter(p => p.admin).length;
      const text = `
*📋 Group Information*
━━━━━━━━━━━━━━━━━━━━
*Name:* ${meta.subject}
*ID:* ${meta.id}
*Description:* ${meta.desc || 'No description'}
*Members:* ${meta.participants.length}
*Admins:* ${admins}
*Created:* ${new Date(meta.creation * 1000).toLocaleDateString()}
━━━━━━━━━━━━━━━━━━━━
🧠 MEGAMIND-MD`.trim();
      await reply(text);
    },
  },
];
