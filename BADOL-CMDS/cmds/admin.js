const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "admin",
    aliases: ["botadmin", "admins"],
    author: "MOHAMMAD BADOL",
    version: "4.0 MONGODB FIXED",
    description: "Bot Admin Management - Permanent MongoDB Save",
    category: "owner",
    usePrefix: true,
    cooldown: 3,
    role: 2,
    guide: "{pn}admin [add/remove/list] [@mention / reply / UID]"
  },

  async loadAdmins() {
    try {
      if (!global.db?.getSettings) return null;
      const settings = await global.db.getSettings();
      if (settings?.botAdmins && Array.isArray(settings.botAdmins)) {
        return settings.botAdmins.map(String);
      }
      return null;
    } catch { return null; }
  },

  async saveAdmins(adminList) {
    try {
      if (!global.db?.getSettings ||!global.db?.updateSettings) return false;
      const current = await global.db.getSettings() || {};
      current.botAdmins = adminList.map(String);
      await global.db.updateSettings(current);
      // Memory তেও আপডেট
      if (!global.config.ownerInfo) global.config.ownerInfo = {};
      global.config.ownerInfo.botAdmins = adminList.map(String);
      global.config.adminUID = adminList.map(String);
      console.log("[ADMIN] Saved to MongoDB:", adminList.length);
      return true;
    } catch (e) {
      console.log("saveAdmins error", e.message);
      return false;
    }
  },

  BADOL: async function ({ event, api, message, args }) {
    function safeName(str, len = 28) {
      try {
        if (!str) return "Unknown User";
        str = String(str).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
        if (!str) return "Unknown User";
        const arr = Array.from(str);
        if (arr.length > len) return arr.slice(0, len).join("") + "…";
        return arr.join("");
      } catch { return "Unknown User"; }
    }

    // ✅ MongoDB থেকে Load
    let mongoAdmins = await this.loadAdmins();
    if (mongoAdmins) {
      if (!global.config.ownerInfo) global.config.ownerInfo = {};
      global.config.ownerInfo.botAdmins = mongoAdmins;
      global.config.adminUID = mongoAdmins;
    }

    const action = (args[0] || "").toLowerCase();
    const botName = safeName(global.config?.botInfo?.name || "𝐄𝐒𝐁-𝐁𝐎𝐓", 18);
    const prefix = global.config?.botInfo?.prefix || global.config?.prefix || '/';

    // 1. LIST
    if (action === "list") {
      const botAdmins = global.config?.ownerInfo?.botAdmins || global.config?.adminUID || [];
      if (botAdmins.length === 0) {
        return await message.reply(`╭─❖─〔 ${botName} 〕─❖─╮\n│ No bot admins found!\n╰──────────────────╯`);
      }
      let listText = `╭─❖─〔 ${botName} 〕─❖─╮\n│ Admin List (${botAdmins.length}) - MONGODB\n├──────────────────┤`;
      for (let i = 0; i < botAdmins.length; i++) {
        const admId = String(botAdmins[i]);
        let admName = "Admin User";
        let admUsername = "None";
        try {
          const chat = await api.getChat(admId);
          admName = safeName(chat.first_name || chat.title || "Admin", 16);
          admUsername = chat.username? `@${chat.username}` : "None";
        } catch {
          try {
            const dbUser = await global.db.getUser(admId);
            if (dbUser?.firstName) admName = safeName(dbUser.firstName, 16);
          } catch {}
        }
        listText += `\n│\n│ #${i + 1}\n│ Name: ${admName}\n│ Username: ${admUsername}\n│ ID: ${admId}`;
      }
      listText += `\n├──────────────────┤\n│ Total: ${botAdmins.length} Admins\n╰──────────────────╯`;
      return await message.reply(listText);
    }

    // Target ID detection
    let targetId = null;
    if (event.reply_to_message) {
      targetId = event.reply_to_message.from.id;
    } else if (args[1]) {
      const query = args[1].replace("@", "").trim();
      if (!isNaN(query)) {
        targetId = query;
      } else {
        try {
          const chatMember = await api.getChat(`@${query}`);
          if (chatMember?.id) targetId = String(chatMember.id);
        } catch {}
      }
    } else if (event.entities) {
      for (const entity of event.entities) {
        if (entity.type === 'text_mention') {
          targetId = String(entity.user.id);
          break;
        }
      }
    }

    if (!targetId && (action === "add" || action === "remove")) {
      return await message.reply(`╭─❖─〔 ${botName} 〕─❖─╮\n│ Usage:\n│ ${prefix}admin add @mention/reply/uid\n│ ${prefix}admin remove @mention/reply/uid\n│ ${prefix}admin list\n╰──────────────────╯`);
    }

    if (!global.config.ownerInfo) global.config.ownerInfo = {};
    if (!global.config.ownerInfo.botAdmins) global.config.ownerInfo.botAdmins = global.config.adminUID || [];
    global.config.ownerInfo.botAdmins = global.config.ownerInfo.botAdmins.map(id => String(id));

    // 2. ADD
    if (action === "add") {
      targetId = String(targetId);
      if (global.config.ownerInfo.botAdmins.includes(targetId)) {
        return await message.reply(`╭─❖─〔 ${botName} 〕─❖─╮\n│ Already an admin!\n│ ID: ${targetId}\n╰──────────────────╯`);
      }
      global.config.ownerInfo.botAdmins.push(targetId);
      const saved = await this.saveAdmins(global.config.ownerInfo.botAdmins);
      if (saved) {
        return await message.reply(`╭─❖─〔 ${botName} 〕─❖─╮\n│ ✅ Admin added!\n│ ID: ${targetId}\n│ 💾 Saved to MongoDB!\n│ Restart দিলেও থাকবে!\n╰──────────────────╯`);
      } else {
        return await message.reply(`╭─❖─〔 ${botName} 〕─❖─╮\n│ Added to memory but MongoDB save failed!\n╰──────────────────╯`);
      }
    }

    // 3. REMOVE
    if (action === "remove") {
      targetId = String(targetId);
      const mainOwnerId = String(global.config?.ownerInfo?.mainOwner?.id || global.config?.ownerInfo?.mainOwner?.[0]?.id || "6954597258");

      if (targetId === mainOwnerId) {
        return await message.reply(`╭─❖─〔 ${botName} 〕─❖─╮\n│ ❌ Cannot remove main owner!\n│ ID: ${targetId}\n╰──────────────────╯`);
      }

      const index = global.config.ownerInfo.botAdmins.indexOf(targetId);
      if (index === -1) {
        return await message.reply(`╭─❖─〔 ${botName} 〕─❖─╮\n│ Not found in admin list!\n│ ID: ${targetId}\n╰──────────────────╯`);
      }
      global.config.ownerInfo.botAdmins.splice(index, 1);
      const saved = await this.saveAdmins(global.config.ownerInfo.botAdmins);
      if (saved) {
        return await message.reply(`╭─❖─〔 ${botName} 〕─❖─╮\n│ ✅ Admin removed!\n│ ID: ${targetId}\n│ 💾 Saved to MongoDB!\n╰──────────────────╯`);
      } else {
        return await message.reply(`╭─❖─〔 ${botName} 〕─❖─╮\n│ Removed from memory but save failed!\n╰──────────────────╯`);
      }
    }

    return await message.reply(`╭─❖─〔 ${botName} 〕─❖─╮\n│ Usage: admin [add/remove/list]\n╰──────────────────╯`);
  }
};