const fs = require('fs');

module.exports = {
  config: {
    name: "noti",
    aliases: ["broadcast", "announce", "notice"],
    author: "MOHAMMAD BADOL",
    version: "12.0-PREMIUM-FINAL",
    cooldown: 3,
    role: 2,
    category: "admin",
    usePrefix: true
  },

  BADOL: async function ({ event, api, args, message, userId }) {
    try {
      if (!args[0] &&!event.reply_to_message) {
        return message.reply(
          "📢 **Noti V12 Premium Guide:**\n\n" +
          "• /noti all <msg> - সব গ্রুপ+ইউজারে\n" +
          "• /noti <msg> - ফটোতে reply দিয়ে (ফটো সহ)\n" +
          "• /noti list - গ্রুপ লিস্ট (রিয়েল)\n" +
          "• /noti dm - ইউজার লিস্ট (রিয়েল)\n" +
          "• /noti -100xxx <msg> - নির্দিষ্ট গ্রুপে\n" +
          "• /noti <uid> <msg> - নির্দিষ্ট ইউজারে\n" +
          "• Reply: 1,3,5 Hello - লিস্ট থেকে সিলেক্ট"
        );
      }

      const sub = (args[0] || "").toLowerCase();

      if (sub === 'list') {
        const allThreads = await global.db.getAllThreads();
        const groups = allThreads.filter(t => t.isGroup || String(t.id).startsWith("-"));
        if (!groups.length) return message.reply('❌ কোনো গ্রুপ নাই।');
        let txt = `📋 All Groups (${groups.length}):\n\n`;
        groups.forEach((g, i) => {
          txt += `${i+1}. ${g.name || 'Unknown'}\nID: ${g.id}\n👥 ${g.totalUsers || 0} | 💬 ${g.totalMessages || 0}\n\n`;
        });
        txt += `💡 Reply: 1,3,5 আপনার মেসেজ`;
        const sent = await message.reply(txt);
        global.badol.onReply.set(sent.message_id, { commandName: "noti", type: 'groupList', author: userId, groups });
        return;
      }

      if (sub === 'dm') {
        const users = await global.db.getAllUsers();
        if (!users.length) return message.reply('❌ কোনো DM ইউজার নাই।');
        let txt = `📋 DM Users (${users.length}):\n\n`;
        users.slice(0, 50).forEach((u, i) => {
          const name = (u.firstName || '') + (u.lastName? ' ' + u.lastName : '') || u.username || u.id;
          txt += `${i+1}. ${name}\nUID: ${u.id}\n\n`;
        });
        if (users.length > 50) txt += `...and ${users.length - 50} more\n`;
        txt += `💡 Reply: 1,3,5 আপনার মেসেজ`;
        const sent = await message.reply(txt);
        global.badol.onReply.set(sent.message_id, { commandName: "noti", type: 'dmList', author: userId, users });
        return;
      }

      let mode = 'all';
      let targets = [];
      let notiMessage = "";

      if (sub === 'all') {
        notiMessage = args.slice(1).join(" ").trim();
        if (!notiMessage && event.reply_to_message) notiMessage = event.reply_to_message.text || event.reply_to_message.caption || "📢 Update";
        mode = 'all';
      } else if (args[0] && (/^-?\d+$/.test(args[0]) || args[0].split(',').every(t => /^-?\d+$/.test(t.trim())))) {
        targets = args[0].split(',').map(t => t.trim());
        notiMessage = args.slice(1).join(" ").trim();
        if (!notiMessage && event.reply_to_message) notiMessage = event.reply_to_message.text || event.reply_to_message.caption || "📢 Update";
        mode = 'specific';
      } else {
        notiMessage = args.join(" ").trim();
        if (!notiMessage && event.reply_to_message) notiMessage = event.reply_to_message.text || event.reply_to_message.caption || "📢 Update";
        mode = 'all';
      }

      if (!notiMessage) return message.reply("❌ Message দাও!");
      await this.sendBroadcast(api, message, event, notiMessage, mode, targets);

    } catch (e) {
      console.log("Noti error:", e.message);
      message.reply("❌ Error: " + e.message);
    }
  },

  onReply: async function ({ event, api, Reply, message }) {
    try {
      if (String(event.from.id)!== String(Reply.author)) return;
      const input = (event.text || '').trim();
      if (!input.includes(' ')) return message.reply('❌ Format: 1,3,5 Hello');
      const parts = input.split(' ');
      const numbers = parts[0].split(',').map(n => parseInt(n.trim()));
      const notiMessage = parts.slice(1).join(' ').trim();
      if (!notiMessage) return message.reply('❌ মেসেজ দাও!');
      let targets = [];
      if (Reply.type === 'groupList') targets = numbers.filter(n =>!isNaN(n) && n >= 1 && n <= Reply.groups.length).map(n => Reply.groups[n - 1].id);
      else targets = numbers.filter(n =>!isNaN(n) && n >= 1 && n <= Reply.users.length).map(n => Reply.users[n - 1].id);
      if (!targets.length) return message.reply('❌ ভুল নাম্বার!');
      await this.sendBroadcast(api, message, event, notiMessage, 'specific', targets);
    } catch (e) { console.log("onReply error:", e.message); }
  },

  sendBroadcast: async function (api, message, event, notiMessage, mode = 'all', targets = []) {
    let statusMsg = null;
    try { statusMsg = await message.reply('⏳ Preparing broadcast...'); } catch {}

    // ✅ PREMIUM HEADER/FOOTER - MOST PREMIUM LOOK
    const header = "⚜𝐄𝐒𝐁-𝐓𝐄𝐀𝐌 Official Broadcast⚜️\n━━━━━━━━━━━━━━━━━━━━\n\n";
    const footer = "\n\n━━━━━━━━━━━━━━━━━━━━\n🤖 Powered by 𝐄𝐒𝐁-𝐁𝐎𝐓";
    const finalMessage = header + notiMessage + footer;

    let filePath = null;
    let fileType = null;
    const replyMsg = event.reply_to_message;

    if (replyMsg) {
      try {
        if (replyMsg.photo?.length > 0) {
          const photo = replyMsg.photo[replyMsg.photo.length - 1];
          filePath = await message.downloadAttachment({ type: 'photo', data: photo });
          fileType = 'photo';
        } else if (replyMsg.video) {
          filePath = await message.downloadAttachment({ type: 'video', data: replyMsg.video });
          fileType = 'video';
        } else if (replyMsg.document) {
          filePath = await message.downloadAttachment({ type: 'document', data: replyMsg.document });
          fileType = 'document';
        }
      } catch {}
    }

    let recipients = [];
    let totalGroups = 0;
    let totalUsers = 0;

    if (mode === 'all') {
      try {
        const stats = await global.db.getStats();
        const allGroupIds = stats.threads.filter(t => t.isGroup || String(t.id).startsWith("-")).map(t => t.id);
        const allUserIds = stats.users.map(u => u.id);
        totalGroups = allGroupIds.length;
        totalUsers = allUserIds.length;
        recipients = [...allGroupIds,...allUserIds];
      } catch {
        const threads = await global.db.getAllThreads();
        const users = await global.db.getAllUsers();
        const allGroupIds = threads.filter(t => t.isGroup || String(t.id).startsWith("-")).map(t => t.id);
        recipients = [...allGroupIds,...users.map(u => u.id)];
        totalGroups = allGroupIds.length;
        totalUsers = users.length;
      }
    } else {
      recipients = targets;
    }

    if (!recipients.length) return message.reply("❌ কোনো recipient নাই!");

    const button = {
      reply_markup: {
        inline_keyboard: [[{ text: "👤 Owner Contact", url: "https://t.me/B4D9L_007" }]]
      }
    };

    let success = 0, failed = 0, removed = 0;

    for (let i = 0; i < recipients.length; i++) {
      const chatId = recipients[i];
      try {
        if (filePath && fs.existsSync(filePath)) {
          if (finalMessage.length > 900) {
            if (fileType === 'photo') await api.sendPhoto(chatId, { source: filePath }, { caption: "📢 Notification from Admin",...button }).catch(()=>{});
            else if (fileType === 'video') await api.sendVideo(chatId, { source: filePath }, { caption: "📢 Notification",...button }).catch(()=>{});
            else await api.sendDocument(chatId, { source: filePath }, { caption: "📢 Notification",...button }).catch(()=>{});
            await new Promise(r=>setTimeout(r,150));
            await api.sendMessage(chatId, finalMessage, button).catch(()=>{ throw new Error("blocked"); });
          } else {
            if (fileType === 'photo') await api.sendPhoto(chatId, { source: filePath }, { caption: finalMessage,...button });
            else if (fileType === 'video') await api.sendVideo(chatId, { source: filePath }, { caption: finalMessage,...button });
            else await api.sendDocument(chatId, { source: filePath }, { caption: finalMessage,...button });
          }
        } else {
          await api.sendMessage(chatId, finalMessage, button);
        }
        success++;
      } catch (err) {
        failed++;
        const em = (err.message || "").toLowerCase();
        if (em.includes("not found") || em.includes("kicked") || em.includes("blocked") || em.includes("forbidden") || em.includes("deactivated") || em.includes("chat not found")) {
          try {
            if (String(chatId).startsWith("-")) {
              if (global.db.threads) global.db.threads.delete(String(chatId));
              if (global.db.deleteThread) await global.db.deleteThread(String(chatId));
              else global.db.save();
            } else {
              if (global.db.users) global.db.users.delete(String(chatId));
              if (global.db.deleteUser) await global.db.deleteUser(String(chatId));
              else global.db.save();
            }
            removed++;
          } catch {}
        }
      }
      if (i % 10 === 0 && statusMsg) {
        try {
          const percent = Math.floor((i/recipients.length)*100);
          await api.editMessageText(event.chat.id, statusMsg.message_id, null, `⏳ ${percent}% | ✓ ${success} | ✗ ${failed} | 🗑️ ${removed}\n📊 Total: ${recipients.length} (${totalGroups}G + ${totalUsers}U)`);
        } catch {}
      }
      await new Promise(r=>setTimeout(r, 80));
    }

    if (filePath) try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}

    if (statusMsg) {
      try {
        await api.editMessageText(event.chat.id, statusMsg.message_id, null,
`✅ Broadcast Done!

📸 Photo: ${filePath? "Yes" : "No"}
✓ Sent: ${success}
✗ Failed: ${failed}
🗑️ Cleaned: ${removed}
📊 Total: ${recipients.length}

👥 Real Stats:
Groups: ${totalGroups}
Users: ${totalUsers}

📝 Message:
${notiMessage.slice(0,100)}`
        );
      } catch {
        await message.reply(`✅ Done! ✓ ${success} | ✗ ${failed} | 🗑️ ${removed} | Total ${recipients.length}`).catch(()=>{});
      }
    }
  }
};