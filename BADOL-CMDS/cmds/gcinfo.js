const fs = require("fs");
const path = require("path");
const axios = require("axios");

module.exports = {
  config: {
    name: "gcinfo",
    aliases: ["groupinfo", "ginfo"],
    author: "MOHAMMAD BADOL",
    version: "8.2-BUTTON-FIXED-TG",
    cooldown: 5,
    role: 0,
    description: "Group info pfp + button 100%",
    category: "utility",
    usePrefix: true
  },

  BADOL: async function ({ event, api, args, message, chatId, userId, ctx }) {
    if (!message.isGroup) return message.reply('❌ This command can only be used in groups.');
    try {
      try { await api.sendChatAction(chatId, 'typing'); } catch {}

      const chat = await api.getChat(chatId);
      const adminList = await api.getChatAdministrators(chatId);
      const membersCount = await api.getChatMembersCount(chatId);
      const thread = await message.db.getThread(chatId);

      const admins = adminList.filter(a => !a.user.is_bot);
      const botAdmins = adminList.filter(a => a.user.is_bot);
      const owners = adminList.filter(a => a.status === 'creator');
      const botIsAdmin = !!adminList.find(a => a.user.id === ctx.botInfo?.id);

      let infoText = `📊 Group Information\n\n`;
      infoText += `📂 Name: ${chat.title}\n`;
      infoText += `🆔 Chat ID: ${chatId}\n`;
      infoText += `📝 Type: ${chat.type}\n`;
      infoText += `👥 Total Members: ${membersCount}\n`;
      infoText += `👨‍💼 Admins: ${admins.length}\n`;
      infoText += `🤖 Bot Admins: ${botAdmins.length}\n`;
      if (chat.username) infoText += `🔗 Username: @${chat.username}\n`;
      if (chat.description) infoText += `\n📄 Description:\n${chat.description.substring(0, 180)}${chat.description.length>180?'...':''}\n`;
      infoText += `\n⚙️ Bot Settings:\n`;
      infoText += `🔐 Approval: ${thread.approvalMode?'✅':'❌'}\n`;
      infoText += `🤖 Auto-Approve: ${thread.autoApprove?'✅':'❌'}\n`;
      infoText += `🚪 Anti-Out: ${thread.antiOut?'✅':'❌'}\n`;
      infoText += `📍 Prefix: ${thread.customPrefix||global.config.prefix}\n`;
      infoText += `📨 Msgs: ${thread.totalMessages||0}\n`;
      infoText += `🤖 Bot Admin: ${botIsAdmin?'✅':'❌'}\n`;
      if (owners.length>0) { infoText+=`\n👑 Owner:\n`; owners.forEach(o=>{ infoText+=` • ${o.user.first_name}${o.user.username?` (@${o.user.username})`:''}\n`; }); }

      const keyboard = message.Markup.inlineKeyboard([
        [message.Markup.button.callback('👥 Show Admins', `show_admins_${chatId}`), message.Markup.button.callback('📊 Stats', `show_stats_${chatId}`)],
        [message.Markup.button.callback('🔄 Refresh', `gcinfo_refresh_${chatId}`)]
      ]);

      let sentMsg = null;
      if (chat.photo?.big_file_id) {
        try {
          const file = await api.getFile(chat.photo.big_file_id);
          const url = `https://api.telegram.org/file/bot${api.token}/${file.file_path}`;
          const res = await axios.get(url, { responseType: "arraybuffer" });
          const dir = path.join(process.cwd(), "cache");
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          const p = path.join(dir, `gcinfo_${chatId}.jpg`);
          fs.writeFileSync(p, Buffer.from(res.data));
          sentMsg = await api.sendPhoto(chatId, { source: fs.createReadStream(p) }, {
            caption: infoText,
            reply_markup: keyboard.reply_markup
          });
          try { fs.unlinkSync(p); } catch {}
        } catch (e) { console.log("pfp send fail:", e.message); }
      }

      if (!sentMsg) {
        sentMsg = await api.sendMessage(chatId, infoText, {
          reply_markup: keyboard.reply_markup
        });
      }

      try {
        const msgId = sentMsg?.message_id || sentMsg?.messageId || sentMsg?.message?.message_id;
        if (msgId) global.badol.onCallback.set(msgId, { commandName: 'gcinfo', chatId });
        global.badol.onCallback.set(`show_admins_${chatId}`, { commandName: 'gcinfo', chatId });
        global.badol.onCallback.set(`show_stats_${chatId}`, { commandName: 'gcinfo', chatId });
        global.badol.onCallback.set(`gcinfo_refresh_${chatId}`, { commandName: 'gcinfo', chatId });
        setTimeout(() => {
          try {
            global.badol.onCallback.delete(`show_admins_${chatId}`);
            global.badol.onCallback.delete(`show_stats_${chatId}`);
            global.badol.onCallback.delete(`gcinfo_refresh_${chatId}`);
            if (msgId) global.badol.onCallback.delete(msgId);
          } catch {}
        }, 300000);
      } catch {}

      return;
    } catch (err) { return message.reply(`❌ Error: ${err.message}`); }
  },

  onCallback: async function ({ event, api, message, ctx }) {
    // ✅ এখানে সবার আগে কুয়েরি অ্যানসার করে নেওয়া হলো যাতে 'query is too old' এরর না আসে
    await ctx.answerCbQuery().catch(() => {});

    const data = event.data;
    const m = data.match(/_(-?\d+)$/);
    if (!m) return;
    const chatId = m[1];
    const msg = ctx.callbackQuery.message;
    const chatIdNum = msg.chat.id;
    const msgId = msg.message_id;

    async function edit(newText, kb) {
      try {
        if (msg.photo || msg.caption!== undefined) {
          await ctx.telegram.editMessageCaption(chatIdNum, msgId, undefined, newText, {
            reply_markup: kb.reply_markup
          });
        } else {
          await ctx.telegram.editMessageText(chatIdNum, msgId, undefined, newText, {
            reply_markup: kb.reply_markup
          });
        }
      } catch (e) {
        console.log("edit error:", e.message);
        try {
          await ctx.editMessageCaption(newText, kb).catch(async () => {
            await ctx.editMessageText(newText, kb);
          });
        } catch (e2) { console.log("edit fallback fail:", e2.message); }
      }
    }

    if (data.startsWith('show_admins_')) {
      try {
        const list = await api.getChatAdministrators(chatId);
        const admins = list.filter(a => !a.user.is_bot);
        let t = `👥 Admins (${admins.length}):\n\n`;
        admins.forEach((a, i) => { t += `${i+1}. ${a.status==='creator'?'👑':'👨‍💼'} ${a.user.first_name}${a.user.username?` @${a.user.username}`:''}\n`; });
        const kb = message.Markup.inlineKeyboard([[message.Markup.button.callback('« Back', `gcinfo_refresh_${chatId}`)]]);
        await edit(t, kb);
      } catch (e) {
        console.log("show_admins error:", e.message);
      }
    }

    if (data.startsWith('show_stats_')) {
      try {
        const thread = await message.db.getThread(chatId);
        const msgs = thread.userMessages || {};
        const sorted = Object.entries(msgs).sort(([,a],[,b])=>b-a).slice(0,10);
        let t = `📊 Stats\n\n📨 Total: ${thread.totalMessages||0}\n👥 Active: ${Object.keys(msgs).length}\n\n🏆 Top 10:\n`;
        for (let i=0; i<sorted.length; i++) {
          const [uid, c] = sorted[i];
          try { const u = await message.db.getUser(uid); t += `${i+1}. ${u.firstName||'Unknown'}: ${c} msgs\n`; }
          catch { t += `${i+1}. ${uid}: ${c} msgs\n`; }
        }
        const kb = message.Markup.inlineKeyboard([[message.Markup.button.callback('« Back', `gcinfo_refresh_${chatId}`)]]);
        await edit(t, kb);
      } catch (e) {
        console.log("show_stats error:", e.message);
      }
    }

    if (data.startsWith('gcinfo_refresh_')) {
      try {
        const chat = await api.getChat(chatId);
        const adminList = await api.getChatAdministrators(chatId);
        const membersCount = await api.getChatMembersCount(chatId);
        const thread = await message.db.getThread(chatId);
        const admins = adminList.filter(a => !a.user.is_bot);
        const botAdmins = adminList.filter(a => a.user.is_bot);
        const owners = adminList.filter(a => a.status === 'creator');
        const botIsAdmin = !!adminList.find(a => a.user.id === ctx.botInfo?.id);
        
        let infoText = `📊 Group Information\n\n📂 Name: ${chat.title}\n🆔 Chat ID: ${chatId}\n📝 Type: ${chat.type}\n👥 Total Members: ${membersCount}\n👨‍💼 Admins: ${admins.length}\n🤖 Bot Admins: ${botAdmins.length}\n`;
        if (chat.username) infoText += `🔗 Username: @${chat.username}\n`;
        if (chat.description) infoText += `\n📄 Description:\n${chat.description.substring(0,180)}${chat.description.length>180?'...':''}\n`;
        infoText += `\n⚙️ Bot Settings:\n🔐 Approval: ${thread.approvalMode?'✅':'❌'}\n🤖 Auto-Approve: ${thread.autoApprove?'✅':'❌'}\n🚪 Anti-Out: ${thread.antiOut?'✅':'❌'}\n📍 Prefix: ${thread.customPrefix||global.config.prefix}\n📨 Msgs: ${thread.totalMessages||0}\n🤖 Bot Admin: ${botIsAdmin?'✅':'❌'}\n`;
        if (owners.length>0) { infoText += `\n👑 Owner:\n`; owners.forEach(o => { infoText += ` • ${o.user.first_name}${o.user.username?` (@${o.user.username})`:''}\n`; }); }
        
        const kb = message.Markup.inlineKeyboard([
          [message.Markup.button.callback('👥 Show Admins', `show_admins_${chatId}`), message.Markup.button.callback('📊 Stats', `show_stats_${chatId}`)],
          [message.Markup.button.callback('🔄 Refresh', `gcinfo_refresh_${chatId}`)]
        ]);
        await edit(infoText, kb);
      } catch (e) {
        console.log("refresh error:", e.message);
      }
    }
  }
};
