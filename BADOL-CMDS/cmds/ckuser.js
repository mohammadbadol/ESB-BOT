const fs = require("fs");

module.exports = {
  config: {
    name: "ckuser",
    aliases: ["userck", "alluser"],
    author: "MOHAMMAD BADOL",
    version: "3.0-REAL-DB-FINAL",
    cooldown: 5,
    role: 1,
    category: "admin",
    usePrefix: true,
    description: "Real-time User & Group Count - 100% REAL DB"
  },

  BADOL: async function ({ api, chatId, event, args }) {
    try {
      if (!global.db ||!global.db.getStats) {
        return await api.sendMessage(chatId, "❌ Database not loaded! Check index.js -> global.db", { reply_to_message_id: event.message_id });
      }

      // ✅ REAL DB DATA
      const stats = await global.db.getStats();
      const allUsers = stats.users || [];
      const allThreads = stats.threads || [];

      const groups = allThreads.filter(t => t.isGroup || String(t.id).startsWith("-"));
      const privates = allThreads.filter(t =>!t.isGroup &&!String(t.id).startsWith("-"));

      const approvedGroups = groups.filter(g => g.approved!== false);
      let pendingGroups = [];
      try { pendingGroups = await global.db.getAllApprovals('group'); } catch { pendingGroups = []; }

      let banned = [];
      try { banned = await global.db.getAllBans(); } catch { banned = []; }

      let totalMsg = 0;
      for (let t of allThreads) totalMsg += (t.totalMessages || 0);

      const now = Date.now();
      const activeUsers = allUsers.filter(u => (now - (u.lastSeen || 0)) < 24*60*60*1000).length;

      let sub = args[0]?.toLowerCase();

      if (sub === "list") {
        if (!allUsers.length) return await api.sendMessage(chatId, "❌ কোনো ইউজার নাই - DB খালি\n📁 database/data/users.json empty", { reply_to_message_id: event.message_id });
        let txt = `👥 ALL USERS (${allUsers.length})\n━━━━━━━━━━━━━━━━━━━━\n`;
        allUsers.slice(0, 80).forEach((u, i) => {
          let name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || "Unknown";
          let active = (now - (u.lastSeen || 0)) < 24*60*60*1000? "🟢" : "⚪";
          let msgs = Object.values(u.messageCount || {}).reduce((a,b)=>a+b,0);
          txt += `${i+1}. ${active} ${name}\nID: ${u.id} | 💬 ${msgs}\n`;
        });
        if (allUsers.length > 80) txt += `\n...আরো ${allUsers.length - 80} জন আছে\n`;
        txt += `\n🟢 = 24h Active (${activeUsers})`;
        return await api.sendMessage(chatId, txt, { reply_to_message_id: event.message_id });
      }

      if (sub === "gclist" || sub === "gc" || sub === "groups") {
        if (!groups.length) return await api.sendMessage(chatId, "❌ কোনো গ্রুপ নাই - DB খালি\n📁 database/data/threads.json empty", { reply_to_message_id: event.message_id });
        let txt = `💬 ALL GROUPS (${groups.length})\n━━━━━━━━━━━━━━━━━━━━\n`;
        groups.slice(0, 80).forEach((g, i) => {
          txt += `${i+1}. ${g.name || 'Unknown'}\nID: ${g.id}\n👥 ${g.totalUsers || 0} | 💬 ${g.totalMessages || 0} | ${g.approved!== false? "✅" : "⏳"}\n\n`;
        });
        if (groups.length > 80) txt += `\n...আরো ${groups.length - 80} টা আছে\n`;
        return await api.sendMessage(chatId, txt, { reply_to_message_id: event.message_id });
      }

      if (sub === "active") {
        const activeList = allUsers.filter(u => (now - (u.lastSeen || 0)) < 24*60*60*1000);
        if (!activeList.length) return await api.sendMessage(chatId, "❌ 24h তে কোনো Active User নাই", { reply_to_message_id: event.message_id });
        let txt = `🟢 ACTIVE USERS (24h) - ${activeList.length}/${allUsers.length}\n━━━━━━━━━━━━━━━━━━━━\n`;
        activeList.slice(0, 50).forEach((u,i)=>{
          let name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || u.id;
          txt += `${i+1}. ${name} | ${u.id}\n`;
        });
        return await api.sendMessage(chatId, txt, { reply_to_message_id: event.message_id });
      }

      const msg = `⚜️ 𝐄𝐒𝐁-𝐁𝐎𝐓 • REALTIME STATS
━━━━━━━━━━━━━━━━━━━━
👥 Total Users: ${allUsers.length}
🟢 Active (24h): ${activeUsers}
💬 Private Chats: ${privates.length}

💬 Total Groups: ${groups.length}
✅ Approved Groups: ${approvedGroups.length}
⏳ Pending Groups: ${pendingGroups.length}

🚫 Banned: ${banned.length}
💌 Total Messages: ${totalMsg}

━━━━━━━━━━━━━━━━━━━━
📁 DB PATH (100% REAL):
• database/data/users.json → ${allUsers.length} users
• database/data/threads.json → ${allThreads.length} threads
• CMD PATH: BADOL-CMDS/cmds/ckuser.js

🔍 Real Count: ${stats.totalGroups || groups.length}G + ${stats.totalPrivate || privates.length}P

📝 Use:
• /ckuser list - User লিস্ট
• /ckuser gclist - Group লিস্ট
• /ckuser active - Active লিস্ট

⏰ ${new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })}`;

      return await api.sendMessage(chatId, msg, { reply_to_message_id: event.message_id });

    } catch (e) {
      console.error("ckuser error:", e);
      return await api.sendMessage(chatId, `❌ Error: ${e.message}`, { reply_to_message_id: event.message_id });
    }
  }
};