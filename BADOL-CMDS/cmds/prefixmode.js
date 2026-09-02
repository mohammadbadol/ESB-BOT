module.exports = {
  config: {
    name: "prefixmode",
    version: "2.0-MONGODB-FIXED",
    author: "MOHAMMAD BADOL",
    role: 2,
    category: "admin",
    description: "Toggle all commands to no-prefix mode - MongoDB Permanent",
    usePrefix: true,
    cooldown: 3
  },

  BADOL: async function({ event, api, args, message }) {

    async function getMode() {
      try {
        if(!global.db?.getSettings) return { enabled: false };
        const s = await global.db.getSettings();
        return { enabled: s?.prefixModeEnabled === true };
      } catch { return { enabled: false }; }
    }

    async function saveMode(enabled) {
      try {
        if(!global.db?.getSettings ||!global.db?.updateSettings) return false;
        const current = await global.db.getSettings() || {};
        current.prefixModeEnabled = enabled;
        await global.db.updateSettings(current);
        global.config.prefixModeEnabled = enabled;
        console.log(`[PREFIXMODE] ${enabled ? "ON" : "OFF"} - MongoDB Saved`);
        return true;
      } catch(e){ console.log("prefixmode save err", e.message); return false; }
    }

    let data = await getMode();
    const action = args[0]?.toLowerCase();

    if (!action ||!["on","off","status"].includes(action)) {
      return message.reply(
        `⚙️ PrefixMode System - MongoDB\n\n`+
        `📌 Current: ${data.enabled? "ON (All No-Prefix)" : "OFF (Normal)"}\n`+
        `💾 Storage: MongoDB Permanent\n\n`+
        `• ${global.config.prefix}prefixmode on - সব কমান্ড No Prefix\n`+
        `• ${global.config.prefix}prefixmode off - আগের মতো\n`+
        `• ${global.config.prefix}prefixmode status - স্ট্যাটাস`
      );
    }

    if (action === "status") {
      return message.reply(`📌 PrefixMode: ${data.enabled? "ON ✅" : "OFF ❌"}\n${data.enabled? "এখন সব কমান্ড Prefix ছাড়াই কাজ করবে।" : "এখন config অনুযায়ী কাজ করবে।"}\n💾 MongoDB - Restart Safe!`);
    }

    if (action === "on") {
      await saveMode(true);
      return message.reply(`✅ PrefixMode ON - MongoDB Saved!\nএখন থেকে সব কমান্ড Prefix ছাড়া কাজ করবে।\nRestart দিলেও ON থাকবে!\nOff করতে: ${global.config.prefix}prefixmode off`);
    }

    if (action === "off") {
      await saveMode(false);
      return message.reply(`❌ PrefixMode OFF - MongoDB Saved!\n\nএখন আগের মতো usePrefix true/false অনুযায়ী কাজ করবে।`);
    }
  }
};