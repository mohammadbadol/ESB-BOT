// ✅ USERLOCK V4 MONGODB FIXED - NO JSON FILE
const mongoose = require('mongoose');

let NameModel;
try {
  NameModel = mongoose.models.NameTracker || mongoose.model('NameTracker', new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    current: Object,
    history: Array
  }));
} catch { NameModel = mongoose.models.NameTracker; }

let SettingModel;
try {
  SettingModel = mongoose.models.Settings;
} catch {}

async function getDB() {
  try {
    const all = await NameModel.find({}).lean();
    let obj = {};
    all.forEach(d=> obj[d.userId] = { current: d.current, history: d.history });
    return obj;
  } catch { return {}; }
}
async function getOneUser(userId) {
  try { return await NameModel.findOne({ userId: String(userId) }).lean(); } catch { return null; }
}
async function saveOneUser(userId, current, history) {
  try { await NameModel.findOneAndUpdate({ userId: String(userId) }, { $set: { current, history } }, { upsert: true }); } catch(e){ console.log(e.message); }
}

async function getSettingDB() {
  try {
    const s = await global.db.getSettings();
    return { globalEnabled: s?.userLockEnabled !== false };
  } catch { return { globalEnabled: true }; }
}
async function saveSettingDB(enabled) {
  try {
    const current = await global.db.getSettings() || {};
    current.userLockEnabled = enabled;
    await global.db.updateSettings(current);
    console.log(`[USERLOCK] ${enabled ? "ON" : "OFF"} - MongoDB`);
  } catch(e){ console.log(e.message); }
}
async function isEnabled() {
  try {
    const s = await global.db.getSettings();
    return s?.userLockEnabled !== false;
  } catch { return true; }
}

module.exports = {
  config: {
    name: "userlock",
    aliases: ["namewatch", "ulock"],
    author: "MOHAMMAD BADOL",
    version: "4.0-MONGODB-FIXED",
    description: "UserLock - MongoDB Permanent",
    category: "security",
    usePrefix: true,
    role: 1,
    cooldown: 2
  },

  BADOL: async function({ api, chatId }) {
    return sendPanel(api, chatId, null, null);
  },

  onCallback: async function({ event, api, ctx }) {
    const data = event.data || event.callback_query?.data;
    const chatId = event.message.chat.id;
    const msgId = event.message.message_id;
    try { await ctx.answerCbQuery(); } catch {}

    if (data === "ulock_on") {
      await saveSettingDB(true);
      try { await api.sendMessage(chatId, `✅ UserLock Global ON! - MongoDB Saved!`); } catch {}
      try { await api.deleteMessage(chatId, msgId).catch(()=>{}); } catch {}
      return;
    }
    if (data === "ulock_off") {
      await saveSettingDB(false);
      try { await api.sendMessage(chatId, `❌ UserLock Global OFF! - MongoDB Saved!`); } catch {}
      try { await api.deleteMessage(chatId, msgId).catch(()=>{}); } catch {}
      return;
    }
    if (data === "ulock_cancel") {
      try { await api.deleteMessage(chatId, msgId).catch(()=>{}); } catch {}
      return;
    }
  },

  onChat: async function({ api, msg, chatId }) {
    try {
      if (!msg ||!chatId) return;
      if (!String(chatId).startsWith("-")) return;
      if (!await isEnabled()) return;
      if (!msg.from) return;
      const from = msg.from;
      const userId = String(from.id);
      const current = {
        first_name: (from.first_name || "").trim(),
        last_name: (from.last_name || "").trim(),
        username: (from.username || "").trim(),
        date: new Date().toLocaleString("en-BD", { timeZone: "Asia/Dhaka" })
      };

      const old = await getOneUser(userId);
      if (!old) { await saveOneUser(userId, current, []); return; }
      const oldFirst = (old.current.first_name||"").trim();
      const oldLast = (old.current.last_name||"").trim();
      const oldUser = (old.current.username||"").trim();
      if (oldFirst===current.first_name && oldLast===current.last_name && oldUser===current.username) return;

      let history = old.history || [];
      history.push({...old.current});
      if (history.length > 20) history.shift();

      let notice = `🚨 <b>USERLOCK DETECTED!</b>\n━━━━━━━━━━━━━━━━━━\n`;
      notice += `👤 নাম: <b>${current.first_name} ${current.last_name||""}</b>\n`;
      notice += `🆔 আইডি: <code>${userId}</code>\n`;
      notice += `🔗 মেনশন: <a href="tg://user?id=${userId}">${current.first_name}</a>\n`;
      notice += `━━━━━━━━━━━━━━━━━━\n\n📝 <b>পরিবর্তন বিবরণ:</b>\n`;
      if (oldFirst!==current.first_name) notice += `• First: <b>${oldFirst||"নাই"}</b> → <b>${current.first_name||"নাই"}</b>\n`;
      if (oldLast!==current.last_name) notice += `• Last: <b>${oldLast||"নাই"}</b> → <b>${current.last_name||"নাই"}</b>\n`;
      if (oldUser!==current.username) notice += `• Username: @${oldUser||"নাই"} → @${current.username||"নাই"}\n`;
      notice += `\n━━━━━━━━━━━━━━━━━━\n⏰ ${current.date}\n💾 MongoDB Tracked`;
      await api.sendMessage(chatId, notice, { parse_mode: "HTML" }).catch(()=>{});
      await saveOneUser(userId, current, history);
    } catch(e){ console.log(e.message); }
  }
};

async function sendPanel(api, chatId, ctx, extra="") {
  const enabled = await isEnabled();
  const db = await getDB();
  const total = Object.keys(db).length;

  const text = `${extra||""}╭─❖─〔 UserLock Panel 〕─❖─╮\n│ Status: ${enabled? "🟢 ON" : "🔴 OFF"} (All Groups)\n│ 📊 Tracked Users: ${total} জন\n│ 💾 MongoDB Permanent\n│\n│ • নাম Change করলে Notice দিবে\n╰─❖─〔 𝐄𝐒𝐁-𝐓𝐄𝐀𝐌 〕─❖─╯`;

  const kb = {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🟢 ON", callback_data: "ulock_on" }, { text: "🔴 OFF", callback_data: "ulock_off" }],
        [{ text: "❌ Cancel", callback_data: "ulock_cancel" }]
      ]
    }
  };
  if (ctx) { try { await ctx.editMessageText(text, kb); } catch {} }
  else { await api.sendMessage(chatId, text, kb).catch(()=>{}); }
}