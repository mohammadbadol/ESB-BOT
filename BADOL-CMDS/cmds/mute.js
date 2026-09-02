// ✅ MUTE.JS V7 MONGODB FIXED - NO JSON FILE
const axios = require('axios');
const fs = require('fs');
const path = require('path');

function parseTime(args) {
  if (!args || args.length === 0) return null;
  const text = args.join(" ").toLowerCase();
  let match = text.match(/(?:m\s*(\d+)|(\d+)\s*m)/);
  if (match) {
    const min = parseInt(match[1] || match[2]);
    return { type: 'm', value: min, seconds: min * 60, text: `${min} মিনিট` };
  }
  match = text.match(/(?:h\s*(\d+)|(\d+)\s*h)/);
  if (match) {
    const hr = parseInt(match[1] || match[2]);
    return { type: 'h', value: hr, seconds: hr * 3600, text: `${hr} ঘন্টা` };
  }
  return null;
}

async function loadMuted(chatId) {
  try {
    const thread = await global.db.Thread.findOne({ id: String(chatId) }).lean();
    return thread?.mutedUsers || [];
  } catch { return []; }
}

async function saveMuted(chatId, list) {
  try {
    await global.db.Thread.findOneAndUpdate(
      { id: String(chatId) },
      { $set: { mutedUsers: list, lastActivity: Date.now() } },
      { upsert: true }
    );
    console.log(`[MUTE] ${chatId} -> ${list.length} users`);
    return true;
  } catch (e) {
    console.log("saveMuted err", e.message);
    return false;
  }
}

async function getTargetUser({ event, api, args, chatId }) {
  if (event.reply_to_message?.from) {
    return {
      id: event.reply_to_message.from.id,
      name: event.reply_to_message.from.first_name + (event.reply_to_message.from.last_name? ' ' + event.reply_to_message.from.last_name : ''),
      username: event.reply_to_message.from.username
    };
  }
  let raw = args[0];
  if (!raw) return null;
  if (raw.startsWith('@')) raw = raw.slice(1);
  if (raw.toLowerCase() === 'm' || raw.toLowerCase() === 'h') return null;

  if (event.entities) {
    const mention = event.entities.find(e => e.type === 'text_mention' && e.user);
    if (mention) {
      return { id: mention.user.id, name: mention.user.first_name, username: mention.user.username };
    }
  }
  if (/^\d+$/.test(raw)) {
    try {
      const member = await api.getChatMember(chatId, Number(raw));
      const u = member.user;
      return { id: u.id, name: u.first_name, username: u.username };
    } catch {
      return { id: Number(raw), name: `User ${raw}`, username: null };
    }
  }
  try {
    const member = await api.getChatMember(chatId, raw);
    const u = member.user;
    return { id: u.id, name: u.first_name, username: u.username };
  } catch {
    try {
      const member2 = await api.getChatMember(chatId, '@' + raw);
      const u = member2.user;
      return { id: u.id, name: u.first_name, username: u.username };
    } catch {}
  }
  return null;
}

module.exports = {
  config: {
    name: "mute",
    aliases: ["unmute", "mutelist", "mlist", "mute_list"],
    author: "MOHAMMAD BADOL",
    version: "7.0-MONGODB-FIXED",
    cooldown: 3,
    role: 1,
    description: "Mute/Unmute m/h + Reply/Mention/UID + List - MongoDB Permanent",
    category: "moderation",
    usePrefix: true
  },

  BADOL: async function ({ event, api, args, message, chatId, userId, ctx }) {
    if (!message.isGroup) return message.reply('❌ গ্রুপে ইউজ করুন।');
    const text = (event.text || event.caption || '').toLowerCase();
    const isUnmute = text.includes('unmute');
    const isList = text.includes('list') || args[0]?.toLowerCase() === 'list';

    if (isList || event.text?.toLowerCase().endsWith('mutelist') || event.text?.toLowerCase().endsWith('mlist')) {
      const list = await loadMuted(chatId);
      if (list.length === 0) return message.reply('✅ এই গ্রুপে কেউ মিউট নেই। (MongoDB)');
      let response = `🔇 **MUTED USERS LIST - MongoDB**\n━━━━━━━━━━━━━━━━━━━━\n`;
      list.forEach((u, i) => {
        response += `👤 ${i + 1}. **নাম:** ${u.name}\n🆔 **ID:** \`${u.id}\`\n⏰ **সময়:** ${u.time}${u.expire? `\n⏳ **Expire:** ${u.expire}`:''}\n━━━━━━━━━━━━━━━━━━━━\n`;
      });
      response += `\n📊 মোট: ${list.length} জন`;
      try {
        const chat = await api.getChat(chatId);
        if (chat.photo?.big_file_id) {
          const file = await api.getFile(chat.photo.big_file_id);
          const url = `https://api.telegram.org/file/bot${api.token}/${file.file_path}`;
          const res = await axios.get(url, { responseType: "arraybuffer" });
          const dir = path.join(process.cwd(), "cache");
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          const p = path.join(dir, `mute_${chatId}.jpg`);
          fs.writeFileSync(p, Buffer.from(res.data));
          await api.sendPhoto(chatId, { source: fs.createReadStream(p) }, { caption: response, parse_mode: "Markdown" });
          try { fs.unlinkSync(p); } catch {}
          return;
        }
      } catch {}
      return api.sendMessage(chatId, response, { parse_mode: "Markdown" });
    }

    const timeData = parseTime(args);
    let targetArgs = args;
    if(timeData) {
      const filtered = [];
      for(let i=0;i<args.length;i++){
        const a = args[i].toLowerCase();
        if(a==='m' || a==='h' || a.endsWith('m') || a.endsWith('h')) {
          if(!isNaN(args[i+1])) { i++; continue; }
          continue;
        }
        if(!isNaN(a) && (args[i-1]?.toLowerCase()==='m' || args[i-1]?.toLowerCase()==='h')) continue;
        filtered.push(args[i]);
      }
      targetArgs = filtered.length? filtered : args;
    }

    let target = await getTargetUser({ event, api, args: targetArgs, chatId });
    if (!target && event.reply_to_message?.from) {
      target = await getTargetUser({ event, api, args: [], chatId });
    }
    if (!target) {
      return message.reply(
        `⚠️ ব্যবহার:\n` +
        `/mute (reply) - Lifetime\n` +
        `/mute m 50 (reply) - 50 Min\n` +
        `/mute h 24 (reply) - 24 Hour\n` +
        `/mute @username m 30\n` +
        `/mute 123456 h 5\n` +
        `/unmute (reply/@/uid)\n` +
        `/mutelist\n` +
        `💾 MongoDB Saved!`
      );
    }

    if (target.id === userId) return message.reply('❌ নিজেকে মিউট করা যাবে না!');
    if (target.id === ctx.botInfo?.id) return message.reply('❌ আমাকে মিউট করা যাবে না!');

    const currentTime = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' });

    if (isUnmute) {
      try {
        await api.restrictChatMember(chatId, target.id, {
          can_send_messages: true,
          can_send_media_messages: true,
          can_send_polls: true,
          can_send_other_messages: true,
          can_add_web_page_previews: true,
          can_invite_users: true
        });
        let list = await loadMuted(chatId);
        list = list.filter(u => String(u.id)!== String(target.id));
        await saveMuted(chatId, list);
        return message.reply(`✅ **${target.name}** আনমিউট করা হয়েছে! (MongoDB)\n🆔 \`${target.id}\``, { parse_mode: "Markdown" });
      } catch (e) {
        return message.reply(`❌ আনমিউট হয়নি: ${e.message}\nবটকে Admin + Restrict permission দিন।`);
      }
    }

    try {
      try {
        const admins = await api.getChatAdministrators(chatId);
        if (admins.some(a => String(a.user.id) === String(target.id))) {
          return message.reply('⚠️ এডমিনকে মিউট করা যাবে না!');
        }
      } catch {}

      let restrictObj = { can_send_messages: false };
      let expireText = "Lifetime";
      let expireTime = null;

      if(timeData) {
        const until_date = Math.floor(Date.now()/1000) + timeData.seconds;
        restrictObj.until_date = until_date;
        expireText = timeData.text;
        expireTime = new Date(Date.now() + timeData.seconds*1000).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' });
      }

      await api.restrictChatMember(chatId, target.id, restrictObj);

      let list = await loadMuted(chatId);
      list = list.filter(u => String(u.id)!== String(target.id));
      list.push({
        id: target.id,
        name: target.name,
        username: target.username || '',
        time: currentTime,
        expire: expireTime || "Never",
        duration: expireText
      });
      await saveMuted(chatId, list);

      if(timeData) {
        setTimeout(async () => {
          try {
            await api.restrictChatMember(chatId, target.id, {
              can_send_messages: true,
              can_send_media_messages: true,
              can_send_polls: true,
              can_send_other_messages: true,
              can_add_web_page_previews: true
            });
            let m = await loadMuted(chatId);
            m = m.filter(u => String(u.id)!== String(target.id));
            await saveMuted(chatId, m);
            await api.sendMessage(chatId, `✅ Auto Unmute: **${target.name}** এর ${expireText} মিউট শেষ!`, { parse_mode: "Markdown" }).catch(()=>{});
          } catch {}
        }, timeData.seconds * 1000);
      }

      return message.reply(`🔇 **${target.name}** কে মিউট করা হয়েছে। (MongoDB)\n🆔 \`${target.id}\`\n⏰ ${currentTime}\n⏳ **Duration:** ${expireText}${expireTime? `\n🔓 **Unmute:** ${expireTime}`:''}`, { parse_mode: "Markdown" });

    } catch (err) {
      if (err.message?.includes('admin') || err.message?.includes('ADMIN')) {
        return message.reply('⚠️ ইউজারটি এডমিন বা বট এডমিন না।');
      }
      return message.reply(`❌ মিউট হয়নি: ${err.message}\nবটকে 'Restrict Users' পারমিশন সহ এডমিন করুন।`);
    }
  }
};