const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "user",
    aliases: ["users"],
    author: "MOHAMMAD BADOL",
    version: "6.0",
    role: 1,
    cooldown: 1,
    description: "user Ban unban ban list unban all",
    usePrefix: true
  },

  async getBanData() {
    let banned = [];
    try { const a = await global.db.getAllBanned?.(); if (a?.length) banned = a; } catch {}
    if (!banned.length) {
      try { const all = await global.db.getAllUsers(); banned = all.filter(u => u.isBanned || u.banned); } catch {}
    }
    let map = {};
    try {
      const all = await global.db.getAllUsers();
      all.forEach(u => { map[String(u.userId || u.id)] = u.name || u.firstName || "User"; });
    } catch {}
    return { banned, map };
  },

  buildText(banned, map, page) {
    const perPage = 50;
    const totalPage = Math.ceil(banned.length / perPage);
    const start = page * perPage;
    const slice = banned.slice(start, start + perPage);

    let txt = `┏━━━━━━━━━━━━━━━━━━━┓\n┃ 📋 BAN LIST - ${banned.length} জন ┃\n┣━━━━━━━━━━━━━━━━━━━┫\n┃ 📄 Page ${page + 1}/${totalPage} ┃\n┣━━━━━━━━━━━━━━━━━━━┫\n\n`;

    slice.forEach((u, i) => {
      const idx = start + i + 1;
      const id = String(u.userId || u.id || u.userID);
      const name = String(u.name || map[id] || "User").slice(0,18);
      const reason = (u.reason || u.banReason || "No reason").slice(0,15);
      txt += `${idx}. 👤 ${name}\n 🆔 ${id}\n 📝 ${reason}\n\n`;
    });

    txt += `━━━━━━━━━━━━━━━━━━━━\n🤖 Eren-AI`;
    return { txt, totalPage, start, perPage };
  },

  async BADOL({ event, api, args }) {
    const chatId = event.chat.id;
    const sub = args[0]?.toLowerCase();

    if ((sub === "ban" && args[1] === "list") || sub === "list") {
      const { banned, map } = await this.getBanData();
      if (!banned.length) {
        return api.sendMessage(chatId, `┏━━━━━━━━━━━━━━━━━━━┓\n┃ ✅ CLEAN LIST ✅ ┃\n┣━━━━━━━━━━━━━━━━━━━┫\n┃ কোনো ব্যান ইউজার নাই ┃\n┣━━━━━━━━━━━━━━━━━━━┫\n┃ 🤖 𝐄𝐒𝐁-𝐁𝐎𝐓 ┃\n┗━━━━━━━━━━━━━━━━━━━┛`, { reply_to_message_id: event.message_id });
      }

      const { txt, totalPage, start, perPage } = this.buildText(banned, map, 0);
      let buttons = [];
      if (totalPage > 1) buttons.push({ text: `Next ➡️ (${banned.length - perPage} left)`, callback_data: `user_1` });

      return api.sendMessage(chatId, txt, {
        reply_to_message_id: event.message_id,
        reply_markup: buttons.length? { inline_keyboard: [buttons] } : undefined
      });
    }

    if (sub === "ban") {
      let target = null;
      if (event.reply_to_message?.from) target = String(event.reply_to_message.from.id);
      else if (args[1] && /^\d+$/.test(args[1])) target = args[1];
      if (!target) {
        return api.sendMessage(chatId, `┏━━━━━━━━━━━━━━━━━━━┓\n┃ ❌ ERROR ❌ ┃\n┣━━━━━━━━━━━━━━━━━━━┫\n┃ Reply দিয়ে বা UID দাও ┃\n┃ Ex:.user ban 123456 ┃\n┣━━━━━━━━━━━━━━━━━━━┫\n┃ 🤖 𝐄𝐒𝐁-𝐁𝐎𝐓 ┃\n┗━━━━━━━━━━━━━━━━━━━┛`, { reply_to_message_id: event.message_id });
      }
      const reason = args.slice(2).join(" ") || "No reason";
      await global.db.banUser(target, reason, String(event.from.id));
      return api.sendMessage(chatId, `┏━━━━━━━━━━━━━━━━━━━┓\n┃ 🚫 BANNED 🚫 ┃\n┣━━━━━━━━━━━━━━━━━━━┫\n┃ 🆔 ${target}\n┃ 📝 ${reason.slice(0,20)}\n┃ 👑 By: ${event.from.first_name}\n┣━━━━━━━━━━━━━━━━━━━┫\n┃ 🤖 𝐄𝐒𝐁-𝐁𝐎𝐓\n┗━━━━━━━━━━━━━━━━━━━┛`, { reply_to_message_id: event.message_id });
    }

    if (sub === "unban" || sub === "ub") {
      if (args[1] === "all") {
        const { banned } = await this.getBanData();
        let c = 0;
        for (const u of banned) { try { await global.db.unbanUser(String(u.userId || u.id)); c++; } catch {} }
        return api.sendMessage(chatId, `┏━━━━━━━━━━━━━━━━━━━┓\n┃ ✅ UNBAN ALL ✅ ┃\n┣━━━━━━━━━━━━━━━━━━━┫\n┃ 🔓 ${c} জন আনব্যান হয়েছে ┃\n┣━━━━━━━━━━━━━━━━━━━┫\n┃ 🤖 𝐄𝐒𝐁-𝐁𝐎𝐓 ┃\n┗━━━━━━━━━━━━━━━━━━━┛`, { reply_to_message_id: event.message_id });
      }
      let target = null;
      if (event.reply_to_message?.from) target = String(event.reply_to_message.from.id);
      else if (args[1] && /^\d+$/.test(args[1])) target = args[1];
      if (!target) {
        return api.sendMessage(chatId, `┏━━━━━━━━━━━━━━━━━━━┓\n┃ ❌ ERROR ❌ ┃\n┣━━━━━━━━━━━━━━━━━━━┫\n┃ UID / Reply / all দাও ┃\n┃ Ex:.user unban 123 ┃\n┣━━━━━━━━━━━━━━━━━━━┫\n┃ 🤖 𝐄𝐒𝐁-𝐁𝐎𝐓 ┃\n┗━━━━━━━━━━━━━━━━━━━┛`, { reply_to_message_id: event.message_id });
      }
      await global.db.unbanUser(target);
      return api.sendMessage(chatId, `┏━━━━━━━━━━━━━━━━━━━┓\n┃ ✅ UNBANNED ✅ ┃\n┣━━━━━━━━━━━━━━━━━━━┫\n┃ 🆔 ${target}\n┃ 🔓 আনব্যান করা হয়েছে\n┣━━━━━━━━━━━━━━━━━━━┫\n┃ 🤖 𝐄𝐒𝐁-𝐁𝐎𝐓\n┗━━━━━━━━━━━━━━━━━━━┛`, { reply_to_message_id: event.message_id });
    }

    return api.sendMessage(chatId,
`┏━━━━━━━━━━━━━━━━━━━┓
┃ 👑 USER MANAGER 👑 ┃
┣━━━━━━━━━━━━━━━━━━━┫
┃.user ban list - লিস্ট
┃.user ban [reply/uid] - ব্যান
┃.user unban [reply/uid] - আনব্যান
┃.user unban all - সব আনব্যান
┣━━━━━━━━━━━━━━━━━━━┫
┃ 🤖 𝐄𝐒𝐁-𝐁𝐎𝐓
┗━━━━━━━━━━━━━━━━━━━┛`, { reply_to_message_id: event.message_id });
  },

  async onCallback({ event, api }) {
    const data = event.data || event.callbackQuery?.data;
    if (!data ||!data.startsWith("user_")) return;

    const page = parseInt(data.split("_")[1]) || 0;
    const chatId = event.message.chat.id;

    try { await api.answerCallbackQuery(event.id, { text: `📄 Page ${page + 1} লোড হচ্ছে...` }); } catch {}

    const { banned, map } = await this.getBanData();
    if (!banned.length) return;

    const { txt, totalPage, start, perPage } = this.buildText(banned, map, page);

    let buttons = [];
    if (page > 0) buttons.push({ text: "⬅️ Prev", callback_data: `user_${page - 1}` });
    if (page < totalPage - 1) buttons.push({ text: `Next ➡️ (${banned.length - (start + perPage)} left)`, callback_data: `user_${page + 1}` });

    try {
      await api.editMessageText(txt, {
        chat_id: chatId,
        message_id: event.message.message_id,
        reply_markup: buttons.length? { inline_keyboard: [buttons] } : undefined
      });
    } catch (e) { console.log("edit error:", e.message); }
  }
};