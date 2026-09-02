// ✅ BADOL TG BOT - CALL REPORT - INBOX ONLY - OWNER: 6954597258 - FIXED EMPTY REPORT

const axios = require("axios");
const fs = require("fs");
const path = require("path");

const OWNER_ID = "6954597258";

if (!global.callBridge) global.callBridge = new Map();

async function dlTG(api, fileId, ext = "bin") {
  try {
    const dir = path.join(__dirname, "cache");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = await api.getFile(fileId);
    const url = `https://api.telegram.org/file/bot${api.token}/${file.file_path}`;
    const p = path.join(dir, `call_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`);
    const r = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
    fs.writeFileSync(p, Buffer.from(r.data));
    return { path: p, stream: fs.createReadStream(p) };
  } catch { return null; }
}

module.exports = {
    config: {
        name: "call",
        aliases: ["report", "contact", "support", "called"],
        version: "2.2-TG-EMPTY-FIXED",
        author: "MOHAMMAD BADOL",
        role: 0,
        description: "Report to Owner Inbox + Unlimited Reply + Empty Report",
        category: "system",
        prefix: true,
        cooldown: 10
    },

    BADOL: async function({ api, chatId, args, message, userId, ctx }) {
        let reason = args.join(" ") || "";
        const replied = ctx?.message?.reply_to_message;
        const hasAttachment = message?.photo || message?.video || message?.document || replied?.photo;

        // 🔥 FIXED: Empty Reason Support
        if (!reason &&!hasAttachment) {
            reason = "📞 User called support (No reason provided) - Please contact user!";
        }

        try {
            const senderName = message.from?.first_name || "Unknown";
            const chatTitle = message.chat?.title || "Private Chat";
            let files = [];

            if (replied) {
                let fid = replied.photo?.[replied.photo.length-1]?.file_id || replied.video?.file_id || replied.document?.file_id;
                if (fid) { const f = await dlTG(api, fid, "jpg"); if (f) files.push(f); }
            }
            if (message.photo || message.video || message.document) {
                let fid = message.photo?.[message.photo.length-1]?.file_id || message.video?.file_id || message.document?.file_id;
                if (fid) { const f = await dlTG(api, fid, "jpg"); if (f) files.push(f); }
            }

            const reportMsg = `╭─[ NEW REPORT ]─╮\n`+
                `│ 👤 User: ${senderName}\n`+
                `│ 🆔 UID: ${userId}\n`+
                `├─────────────────\n`+
                `│ 👥 Group: ${chatTitle}\n`+
                `│ 🆔 TID: ${chatId}\n`+
                `├─────────────────\n`+
                `│ 💬 Reason: ${reason}\n`+
                `╰─────────────────\n`+
                `│ ↩️ Reply to reply user\n`+
                `╰─────────────────\n🤖 Eren-AI`;

            let sent = null;
            if (files.length > 0) {
                sent = await api.sendPhoto(OWNER_ID, { source: files[0].stream }, { caption: reportMsg });
            } else {
                sent = await api.sendMessage(OWNER_ID, reportMsg);
            }

            if (sent) {
                global.callBridge.set(sent.message_id, { userThread: chatId, ownerId: OWNER_ID });
            }

            files.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });

            return await api.sendMessage(chatId,
                `╭─[ SUCCESS ✅ ]─╮\n`+
                `│ Report sent to Owner\n`+
                `├─────────────────\n`+
                `│ 📝 Reason: ${reason}\n`+
                `│ ♻️ Owner reply দিলে এখানে আসবে\n`+
                `╰─────────────────`,
                { reply_to_message_id: message.message_id }
            );

        } catch (e) {
            return await api.sendMessage(chatId, `❌ Failed: ${e.message}`);
        }
    },

    onChat: async function({ api, chatId, userId, msg }) {
        try {
            if (msg.from?.is_bot) return;
            const replyTo = msg.reply_to_message;
            if (!replyTo) return;
            if (!global.callBridge.has(replyTo.message_id)) return;

            const data = global.callBridge.get(replyTo.message_id);
            const userThread = data.userThread;
            let fileObj = null;

            if (msg.photo || msg.video || msg.document) {
                const fid = msg.photo?.[msg.photo.length-1]?.file_id || msg.video?.file_id || msg.document?.file_id;
                if (fid) fileObj = await dlTG(api, fid, "bin");
            }

            const body = msg.text || msg.caption || "";

            if (String(userId) === String(OWNER_ID)) {
                let fwd = `╭─[ OWNER REPLY ]─╮\n│ ${body || "📎 Media"}\n├─────────────────\n│ ↩️ Reply to reply owner\n╰─────────────────\n🤖 𝐄𝐒𝐁-𝐁𝐎𝐓`;
                let sent;
                if (fileObj) sent = await api.sendPhoto(userThread, { source: fileObj.stream }, { caption: fwd });
                else sent = await api.sendMessage(userThread, fwd);
                if (sent) global.callBridge.set(sent.message_id, data);
                if (fileObj) try { fs.unlinkSync(fileObj.path); } catch {}
                return;
            }

            if (String(chatId) === String(userThread)) {
                const senderName = msg.from?.first_name || "User";
                let fwd = `╭─[ USER REPLY ]─╮\n│ 👤 ${senderName}\n│ 🆔 ${userId}\n├─────────────────\n│ 💬 ${body || "📎 Media"}\n╰─────────────────\n↩️ Reply to continue`;
                let sent;
                if (fileObj) sent = await api.sendPhoto(OWNER_ID, { source: fileObj.stream }, { caption: fwd });
                else sent = await api.sendMessage(OWNER_ID, fwd);
                if (sent) global.callBridge.set(sent.message_id, data);
                if (fileObj) try { fs.unlinkSync(fileObj.path); } catch {}
                return;
            }

        } catch (e) { console.log("CALL ERROR:", e.message); }
    }
};