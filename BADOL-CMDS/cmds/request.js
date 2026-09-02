// request.js - V6.1 FINAL FIXED
// Path: EREN-AI/request.js

const fs = require("fs");
const path = require("path");

const APPROVAL_FILE = path.join(process.cwd(), 'data/approvals.json');

function getApprovals() {
  try {
    if (!fs.existsSync(APPROVAL_FILE)) return {};
    return JSON.parse(fs.readFileSync(APPROVAL_FILE, 'utf8'));
  } catch { return {}; }
}

function saveApprovals(data) {
  try {
    if (!fs.existsSync(path.dirname(APPROVAL_FILE))) fs.mkdirSync(path.dirname(APPROVAL_FILE), { recursive: true });
    fs.writeFileSync(APPROVAL_FILE, JSON.stringify(data, null, 2));
  } catch {}
}

(function patchNotify() {
  if (!global.db || global.db._badolPatched) return;
  const getOld = global.db.getApproval?.bind(global.db);
  const removeOld = global.db.removeApproval?.bind(global.db);
  const unbanOld = global.db.unbanUser?.bind(global.db);
  let lastApproved = null;

  global.db.getApproval = async (id) => {
    try { if (getOld) { const r = await getOld(id); if (r) return r; } } catch {}
    try {
      const all = getApprovals();
      return all[id] || null;
    } catch { return null; }
  };

  global.db.unbanUser = async (userId) => {
    let data = null, reqId = null;
    try {
      const all = getApprovals();
      for (const k in all) if (String(all[k].userId) === String(userId)) { data = all[k]; reqId = k; break; }
    } catch {}
    lastApproved = reqId;
    if (unbanOld) await unbanOld(userId);
    try {
      if (global.bot && data?.chatId) {
        await global.bot.sendMessage(data.chatId,
`┏━━━━━━━━━━━━━━━━━━━┓
┃ ✅ APPROVED ✅ ┃
┣━━━━━━━━━━━━━━━━━━━┫
┃ 👤 ${data.name}
┃ 🎉 আনব্যান করা হয়েছে
┃ এখন বট ইউজ করতে পারবে
┣━━━━━━━━━━━━━━━━━━━┫
┃ 🤖 𝐄𝐒𝐁-𝐁𝐎𝐓
┗━━━━━━━━━━━━━━━━━━━┛`);
      }
    } catch {}
  };

  global.db.removeApproval = async (id) => {
    let data = null;
    try { data = getApprovals()[id] || null; } catch {}
    try { if (removeOld) await removeOld(id); } catch {}
    try {
      let all = getApprovals();
      if (all[id]) { delete all[id]; saveApprovals(all); }
    } catch {}
    if (data && id!== lastApproved) {
      try {
        const stillBanned = await global.db.isUserBanned(String(data.userId));
        if (stillBanned && global.bot && data.chatId) {
          await global.bot.sendMessage(data.chatId,
`┏━━━━━━━━━━━━━━━━━━━┓
┃ ❌ REJECTED ❌ ┃
┣━━━━━━━━━━━━━━━━━━━┫
┃ 👤 ${data.name}
┃ 📝 রিকোয়েস্ট Reject করা হয়েছে
┣━━━━━━━━━━━━━━━━━━━┫
┃ 🤖 𝐄𝐒𝐁-𝐁𝐎𝐓
┗━━━━━━━━━━━━━━━━━━━┛`);
        }
      } catch {}
    }
    lastApproved = null;
  };
  global.db._badolPatched = true;
})();

module.exports = {
  config: {
    name: "request",
    aliases: ["req", "appeal"],
    author: "MOHAMMAD BADOL",
    version: "6.1",
    role: 0,
    cooldown: 5,
    description: "Unban request with bypass",
    usePrefix: false
  },

  async BADOL({ event, api, args }) {
    const chatId = event.chat.id;
    const userId = String(event.from.id);
    const userName = event.from.first_name || "User";

    const isBanned = await global.db.isUserBanned(userId).catch(() => false);
    if (!isBanned) return api.sendMessage(chatId, "✅ তুমি ব্যান নও, বট ইউজ করতে পারো!");

    if (!args[0]) {
      return api.sendMessage(chatId,
`📝 UNBAN REQUEST
━━━━━━━━━━━━
/request কারণ লিখো
Ex: /request ভাই মাফ করে দেন
Ex: /request help me
━━━━━━━━━━━━`);
    }

    if (args.length === 1 && args[0].toLowerCase() === "help") {
      return api.sendMessage(chatId,
`📝 UNBAN REQUEST
━━━━━━━━━━━━
/request কারণ লিখো
Ex: /request ভাই মাফ করে দেন
Ex: /request help me
━━━━━━━━━━━━`);
    }

    const reason = args.join(" ").trim();
    if (reason.length < 5) return api.sendMessage(chatId, "❌ কারণ বড় করে লিখো (৫ অক্ষরের বেশি)");

    const requestId = `unban_${userId}_${Date.now()}`;
    const data = { userId, name: userName, reason, chatId, date: Date.now() };

    let all = getApprovals();
    all[requestId] = data;
    saveApprovals(all);

    try { if (global.db.createApproval) await global.db.createApproval(requestId, data); } catch {}

    const adminMsg =
`🚨 NEW UNBAN REQUEST
━━━━━━━━━━━━
👤 Name: ${userName}
🆔 ID: ${userId}
📝 Reason: ${reason}
📍 Chat: ${chatId}
🕐 ${new Date().toLocaleString()}
━━━━━━━━━━━━`;

    const buttons = {
      inline_keyboard: [[
        { text: "✅ Approve", callback_data: `request_approve_${requestId}` },
        { text: "❌ Reject", callback_data: `request_reject_${requestId}` }
      ]]
    };

    const adminList = global.config.adminUID || global.config.ownerInfo?.botAdmins || [];
    for (const aid of adminList) {
      try { await api.sendMessage(aid, adminMsg, { reply_markup: buttons }); } catch {}
    }

    return api.sendMessage(chatId, "✅ রিকোয়েস্ট পাঠানো হয়েছে, এডমিন দেখবে! ⏳");
  },

  async onCallback({ event, api }) {
    const data = event.data || event.callbackQuery?.data || "";
    if (!data.startsWith("request_")) return;

    const chatId = event.message?.chat?.id;
    const msgId = event.message?.message_id;
    const parts = data.split("_");
    const action = parts[1];
    const requestId = parts.slice(2).join("_");

    try { await api.answerCallbackQuery(event.id, { text: action === "approve"? "✅ Approving..." : "❌ Rejecting..." }).catch(()=>{}); } catch {}

    let all = getApprovals();
    let reqData = all[requestId] || await global.db.getApproval?.(requestId).catch(()=>null);

    if (!reqData) {
      return api.editMessageText("❌ Request not found / Already handled!", {
        chat_id: chatId,
        message_id: msgId
      }).catch(()=>{});
    }

    if (action === "approve") {
      await global.db.unbanUser(String(reqData.userId)).catch(()=>{});
    } else {
      await global.db.removeApproval(requestId).catch(()=>{});
      delete all[requestId];
      saveApprovals(all);
    }

    const txt = action === "approve"
    ? `✅ APPROVED!\n━━━━━━━━━━━━\n👤 ${reqData.name}\n🆔 ${reqData.userId}\n📝 ${reqData.reason}`
      : `❌ REJECTED!\n━━━━━━━━━━━━\n👤 ${reqData.name}\n🆔 ${reqData.userId}\n📝 ${reqData.reason}`;

    return api.editMessageText(txt, {
      chat_id: chatId,
      message_id: msgId
    }).catch(()=>{});
  }
};