module.exports = {
  config: {
    name: "adminonly",
    aliases: ["wl", "whitelist", "adminmode", "onlyadmin"],
    version: "4.0 MONGODB FIXED",
    author: "MOHAMMAD BADOL",
    role: 2,
    description: "Admin Only Mode Toggle - MongoDB Permanent",
    category: "owner",
    cooldown: 3,
    usePrefix: true
  },

  BADOL: async function({ api, chatId, args }) {

    async function getSettings() {
      try {
        if (!global.db?.getSettings) return false;
        const st = await global.db.getSettings();
        return st?.adminOnlyMode === true || st?.onlyAdmin === true;
      } catch { return false; }
    }

    async function saveState(enabled) {
      try {
        if (!global.db?.getSettings || !global.db?.updateSettings) return false;
        const current = await global.db.getSettings() || {};
        current.adminOnlyMode = enabled;
        current.onlyAdmin = enabled;
        
        await global.db.updateSettings(current);
        
        if (!global.config.settings) global.config.settings = {};
        global.config.settings.adminOnlyMode = enabled;
        global.config.settings.onlyAdmin = enabled;
        
        console.log(`[ADMINONLY] ${enabled ? "ON" : "OFF"} - Saved to MongoDB`);
        return true;
      } catch (e) {
        console.log("adminonly save error", e.message);
        return false;
      }
    }

    const sub = (args[0] || "").toLowerCase();
    const current = await getSettings();
    const botName = global.config?.botInfo?.name || "𝐄𝐒𝐁-𝐁𝐎𝐓";
    const prefix = global.config?.botInfo?.prefix || "/";

    if (!sub ||!["on", "off", "status", "toggle"].includes(sub)) {
      return await api.sendMessage(chatId,
        `╭─❖─〔 ${botName} 〕─❖─╮\n` +
        `│ Current: ${current? "ON - Admin Only" : "OFF - Public"}\n` +
        `├──────────────────┤\n` +
        `│ Usage:\n` +
        `│ ${prefix}adminonly on\n` +
        `│ ${prefix}adminonly off\n` +
        `│ ${prefix}adminonly status\n` +
        `╰──────────────────╯`
      );
    }

    if (sub === "status") {
      return await api.sendMessage(chatId,
        `╭─❖─〔 ${botName} 〕─❖─╮\n` +
        `│ Admin Only Mode\n` +
        `│ Status: ${current? "ON - Only admins" : "OFF - Everyone"}\n` +
        `│ Storage: MongoDB - 100% Permanent\n` +
        `╰──────────────────╯`
      );
    }

    if (sub === "on" || sub === "toggle") {
      if (current && sub === "on") {
        return await api.sendMessage(chatId, `Already ON! Admin only mode is ON.`);
      }
      const newState = sub === "toggle"?!current : true;
      await saveState(newState);
      return await api.sendMessage(chatId,
        newState
       ? `✅ Admin only ON! Only admins can use bot. Saved to MongoDB - Restart Safe!`
        : `✅ Admin only OFF! Everyone can use bot. Saved to MongoDB - Restart Safe!`
      );
    }

    if (sub === "off") {
      if (!current) return await api.sendMessage(chatId, `Already OFF!`);
      await saveState(false);
      return await api.sendMessage(chatId, `✅ Admin only OFF! Everyone can use bot now. MongoDB Saved!`);
    }
  }
};