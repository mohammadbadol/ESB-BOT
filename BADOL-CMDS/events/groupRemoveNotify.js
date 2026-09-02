module.exports = {
  config: {
    name: "groupRemoveNotify",
    author: "MOHAMMAD BADOL",
    version: "2.0-PREMIUM-BOX",
    description: "কিক হলে নোটিশ - Premium Box",
    eventType: "left_member"
  },
  BADOL: async function ({ event, api }) {
    try {
      const left = event.left_chat_member;
      if (!left) return;
      const botInfo = await api.getMe();
      if (left.id !== botInfo.id) return;

      const moment = require('moment-timezone');
      const now = moment().tz(global.config.timezone || global.config.botInfo?.timezone || 'Asia/Dhaka').format('DD MMM YYYY | hh:mm:ss A');
      
      const botName = global.config.botInfo?.name || global.config.botName || 'EREN-AI-BOT';
      const chatTitle = event.chat.title || 'Unknown Group';
      const chatId = event.chat.id;
      const removedBy = event.from?.first_name || 'Unknown';
      const removedById = event.from?.id || 'Unknown';
      const safeTitle = String(chatTitle).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
      const displayTitle = safeTitle.length>20? safeTitle.slice(0,20)+"…" : safeTitle;

      const msg = 
`╭─❖─〔 ${botName} 〕─❖─╮
│ 🚨 𝐑𝐄𝐌𝐎𝐕𝐄𝐃 𝐅𝐑𝐎𝐌 𝐆𝐑𝐎𝐔𝐏!
├──────────────────────┤
│ 📂 𝐆𝐫𝐨𝐮𝐩: ${displayTitle}
│ 🆔 𝐈𝐃: ${chatId}
│ 👤 𝐁𝐲: ${removedBy}
│ 🆔 𝐔𝐈𝐃: ${removedById}
│ ⏰ 𝐓𝐢𝐦𝐞: ${now}
├──────────────────────┤
│ ⚠️ বটকে গ্রুপ থেকে
│ রিমুভ করা হয়েছে!
╰─❖─〔 𝐄𝐒𝐁-𝐁𝐎𝐓 〕─❖─╯`;

      for (const adminId of (global.config.adminUID || global.config.ownerInfo?.botAdmins || [])) {
        try { 
          await api.sendMessage(adminId, msg); 
        } catch {}
      }
    } catch (e) { console.log("groupRemoveNotify error:", e.message); }
  }
};