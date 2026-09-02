// ✅ MONGODB FIXED - NO JSON FILE

function resolveName(input) {
  const low = String(input).toLowerCase();
  const specials = ["welcome","leave","antilink","spammute","spam","autoreact","alwaysemoji","adminonly","autodl","unsend"];
  if (specials.includes(low)) return low;

  if (global.badol && global.badol.commands) {
    const direct = global.badol.commands.get(low);
    if (direct) return direct.config.name.toLowerCase();
    for (const [_, c] of global.badol.commands) {
      if (c.config.aliases && c.config.aliases.map(a=>a.toLowerCase()).includes(low)) {
        return c.config.name.toLowerCase();
      }
    }
  }
  return low;
}

async function getGroupData(gid) {
  try {
    const thread = await global.db.Thread.findOne({ id: String(gid) }).lean();
    if (thread?.groupCommands) return thread.groupCommands;
    return null;
  } catch { return null; }
}

async function saveGroupData(gid, data) {
  try {
    await global.db.Thread.findOneAndUpdate(
      { id: String(gid) },
      { $set: { groupCommands: data, lastActivity: Date.now() } },
      { upsert: true }
    );
    if(global._gcmdCache) global._gcmdCache.time = 0;
    console.log(`[GCMD] ${gid} ->`, data);
    return true;
  } catch (e) {
    console.log("gcmd save error", e.message);
    return false;
  }
}

async function deleteGroupData(gid) {
  try {
    await global.db.Thread.findOneAndUpdate(
      { id: String(gid) },
      { $unset: { groupCommands: "" } }
    );
    if(global._gcmdCache) global._gcmdCache.time = 0;
    return true;
  } catch { return false; }
}

module.exports = {
  config: {
    name: "gcmd",
    aliases: ["grouplock","gclock"],
    author: "MOHAMMAD BADOL",
    version: "8.0 MONGODB FIXED",
    description: "Per-Group Command + Settings Whitelist - MongoDB Permanent",
    category: "admin",
    usePrefix: true,
    role: 1,
    cooldown: 2
  },

  BADOL: async function({ api, chatId, args, message, event }) {
    const gid = String(chatId);

    if (!String(chatId).startsWith("-")) {
      return message.reply("❌ এই কমান্ড শুধু গ্রুপে কাজ করবে!");
    }

    const sub = (args[0]||"").toLowerCase();
    let groupData = await getGroupData(gid);

    if (!sub || sub === "help") {
      return message.reply(
`⚙️ GCMD - GROUP COMMAND CONTROL V8 MONGODB

/gcmd on → Whitelist ON (সব OFF, শুধু allow করা গুলা চলবে)
/gcmd off → সব ON (setting.js অনুযায়ী)
/gcmd allow help ai admin welcome leave antilink spammute autoreact
/gcmd remove ai
/gcmd list → লিস্ট দেখো
/gcmd reset → ডিলিট

📌 Alias সাপোর্ট: /gcmd allow h = help
📌 Setting Keywords: welcome, leave, antilink, spammute, autoreact, alwaysemoji

Example:
/gcmd on
/gcmd allow help ai welcome leave antilink spammute

💾 MongoDB Saved - Restart Safe!`
      );
    }

    if (sub === "on") {
      if (!groupData) groupData = { mode: "whitelist", enabled: [] };
      groupData.mode = "whitelist";
      if (groupData.enabled.length === 0) {
        groupData.enabled = ["help","gcmd"];
      }
      if (!groupData.enabled.includes("gcmd")) groupData.enabled.push("gcmd");
      await saveGroupData(gid, groupData);
      return message.reply(`✅ Whitelist ON - MongoDB Saved\nএখন এই গ্রুপে শুধু: ${groupData.enabled.join(", ")}\n\n/gcmd allow <name> দিয়ে এড করো।\nRestart দিলেও থাকবে!`);
    }

    if (sub === "off") {
      await deleteGroupData(gid);
      return message.reply(`✅ Whitelist OFF - MongoDB Deleted\nএখন এই গ্রুপে সব কমান্ড + setting.js এর সেটিংস চলবে।`);
    }

    if (sub === "allow" || sub === "add" || sub === "enable") {
      const names = args.slice(1).map(n=>resolveName(n)).filter(Boolean);
      if (names.length === 0) return message.reply("❌ নাম দাও: /gcmd allow help ai");

      if (!groupData) groupData = { mode: "whitelist", enabled: ["help","gcmd"] };
      groupData.mode = "whitelist";

      for (const n of names) {
        if (!groupData.enabled.map(c=>c.toLowerCase()).includes(n.toLowerCase())) {
          groupData.enabled.push(n);
        }
      }
      if (!groupData.enabled.map(c=>c.toLowerCase()).includes("gcmd")) groupData.enabled.push("gcmd");
      await saveGroupData(gid, groupData);
      return message.reply(`✅ Allowed (MongoDB): ${names.join(", ")}\n\nNow Active: ${groupData.enabled.join(", ")}\nRestart Safe!`);
    }

    if (sub === "remove" || sub === "disallow" || sub === "del" || sub === "rm") {
      const names = args.slice(1).map(n=>resolveName(n)).filter(Boolean);
      if (names.length === 0) return message.reply("❌ নাম দাও: /gcmd remove ai");

      if (!groupData) return message.reply("❌ এই গ্রুপে কোনো whitelist নাই।");

      const lowNames = names.map(n=>n.toLowerCase());
      if (lowNames.includes("gcmd")) return message.reply("❌ gcmd রিমুভ করা যাবে না! নইলে আনলক করতে পারবি না।");

      groupData.enabled = groupData.enabled.filter(c=>!lowNames.includes(c.toLowerCase()));
      if (groupData.enabled.length === 0) groupData.enabled = ["help","gcmd"];
      await saveGroupData(gid, groupData);
      return message.reply(`✅ Removed (MongoDB): ${names.join(", ")}\n\nNow Active: ${groupData.enabled.join(", ")}`);
    }

    if (sub === "list" || sub === "show") {
      if (!groupData) return message.reply("ℹ️ এই গ্রুপে Whitelist OFF আছে - সব চলছে।\n\n/gcmd on দিলে সব OFF হবে।\nMongoDB Check: No Data");
      return message.reply(
`📋 GROUP: ${event.chat.title || chatId}
Mode: ${groupData.mode}
Enabled (${groupData.enabled.length}):
${groupData.enabled.join(", ")}

Storage: MongoDB - Permanent
→ /gcmd allow <name>
→ /gcmd remove <name>
→ /gcmd off`
      );
    }

    if (sub === "reset" || sub === "clear") {
      await deleteGroupData(gid);
      return message.reply("✅ Reset Done - Whitelist OFF - MongoDB Deleted");
    }

    return message.reply("❌ Use: /gcmd help");
  }
};