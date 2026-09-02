module.exports = {
  config: {
    name: "groupAddNotify",
    author: "MOHAMMAD BADOL",
    version: "4.0-PREMIUM-BOX",
    description: "বট নতুন গ্রুপে যোগ হলে ফুল ইনফো - Premium Box",
    eventType: "new_member"
  },
  BADOL: async function ({ event, api }) {
    try {
      const newMembers = event.new_chat_members || [];
      if (!newMembers.length) return;
      const botInfo = await api.getMe();
      if (!newMembers.some(m => m.id === botInfo.id)) return;

      const moment = require('moment-timezone');
      const now = moment().tz(global.config.timezone || global.config.botInfo?.timezone || 'Asia/Dhaka').format('DD MMM YYYY | hh:mm:ss A');

      const chatId = event.chat.id;
      let title = event.chat.title || 'অজানা গ্রুপ';
      let username = 'নেই (প্রাইভেট)';
      let count = '?';
      let inviteLink = null;

      try { count = await api.getChatMemberCount(chatId); } catch {}
      try {
        const c = await api.getChat(chatId);
        title = c.title || title;
        if (c.username) { username = '@' + c.username; inviteLink = 'https://t.me/' + c.username; }
      } catch {}
      try {
        if (!inviteLink) {
          const l = await api.createChatInviteLink(chatId);
          inviteLink = l.invite_link || l;
        }
      } catch {}

      const from = event.from;
      const fromName = from.first_name + (from.last_name ? ' ' + from.last_name : '');
      const fromUname = from.username ? '@' + from.username : 'নেই';
      
      const botName = global.config.botInfo?.name || global.config.botName || '𝐄𝐒𝐁-𝐁𝐎𝐓';
      const safeTitle = String(title).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
      const displayTitle = safeTitle.length>18? safeTitle.slice(0,18)+"…" : safeTitle;
      const safeFromName = String(fromName).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0,16);

      const msg = 
`╭─❖─〔 ${botName} 〕─❖─╮
│ 🎉 𝐍𝐄𝐖 𝐆𝐑𝐎𝐔𝐏 𝐀𝐃𝐄𝐃!
├──────────────────────┤
│ 📂 𝐆𝐫𝐨𝐮𝐩: ${displayTitle}
│ 🆔 𝐈𝐃: ${chatId}
│ 👥 𝐌𝐞𝐦𝐛𝐞𝐫: ${count} জন
│ 💬 𝐔𝐬𝐞𝐫: ${username}
├──────────────────────┤
│ 👤 𝐀𝐝𝐝𝐞𝐝 𝐁𝐲: ${safeFromName}
│ 📝 ${fromUname}
│ 🆔 ${from.id}
│ ⏰ ${now}
╰─❖─〔 𝐄𝐒𝐁-𝐁𝐎𝐓 〕─❖─╯`;

      let buttons = [];
      if (inviteLink) buttons.push([{ text: '💬 গ্রুপে যাও', url: inviteLink }]);
      buttons.push([{text:"👑 Contact Owner", url:"https://t.me/B4D9L_007"}]);
      buttons.push([{text:"📢 Support Group", url:"https://t.me/BADOLBOTGC"}]);

      for (const adminId of (global.config.adminUID || global.config.ownerInfo?.botAdmins || [])) {
        try {
          await api.sendMessage(adminId, msg, {
            reply_markup: { inline_keyboard: buttons }
          });
        } catch {}
      }
    } catch (e) { console.log("groupAddNotify error:", e.message); }
  }
};