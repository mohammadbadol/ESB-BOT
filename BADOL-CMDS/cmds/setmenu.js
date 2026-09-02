// ╔════════════════════════════════════════════════════╗
// ║ BADOL-CMDS/cmds/setmenu.js - V8.6 HANDLER MATCH ║
// ║ FIXED: BOT_COMMAND_INVALID + DESCRIPTION EMPTY ║
// ╚════════════════════════════════════════════════════╝

const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "setmenu",
    aliases: ["setslash", "setbaton"],
    author: "MOHAMMAD BADOL",
    version: "8.6 FINAL",
    description: "Slash menu on off control",
    category: "admin",
    usePrefix: true,
    role: 2,
    cooldown: 3
  },

  BADOL: async function ({ api, chatId, event, args }) {
    const botName = global.config.botInfo?.name || global.config.botName || "𝐄𝐒𝐁-𝐁𝐎𝐓";

    function box(text) {
      return `╭─❖─〔 ${botName} 〕─❖─╮\n${text}\n╰─❖─〔 𝐄𝐒𝐁-𝐓𝐄𝐀𝐌 〕─❖─╯`;
    }

    const input = (args[0] || "").toLowerCase();

    if (!input || (input!== "on" && input!== "off")) {
      const msg = `│ ⚙️ SETMENU CONTROL\n│\n│ • /setmenu on - ON\n│ • /setmenu off - OFF`;
      return await api.sendMessage(chatId, box(msg), { reply_to_message_id: event.message_id });
    }

    try {
      if (input === "on") {
        const allCmds = [...global.badol.commands.values()];
        const uniqueCmds = [...new Map(allCmds.map(c => [c.config.name, c])).values()];

        // ✅ V8.6 STYLE VALIDATION - 100% Telegram Rule
        const commands = [];
        for (const cmd of uniqueCmds) {
          try {
            let name = String(cmd.config.name || "").toLowerCase().trim();
            name = name.replace(/[^a-z0-9_]/g, "");
            if (!name) continue;
            if (!/^[a-z]/.test(name)) continue;
            if (name.length < 2 || name.length > 32) continue;
            if (!/^[a-z][a-z0-9_]{1,31}$/.test(name)) continue;

            // ✅ DESCRIPTION - 100% NON-EMPTY GUARANTEE (Main File Logic)
            let desc = "";
            if (cmd.config.description && typeof cmd.config.description === "string") {
              desc = cmd.config.description.trim();
            }
            // Emoji / Special Char Clean but Keep Text
            desc = desc.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
            // যদি খালি হয় বা শুধু Emoji হয়
            if (!desc || desc.length < 3) {
              desc = `${name} command`;
            }
            // Telegram Limit 3-256
            if (desc.length < 3) desc = `${name} cmd by Badol`;
            if (desc.length > 250) desc = desc.slice(0, 250);

            commands.push({ command: name, description: desc });
          } catch {}
        }

        const finalCmds = commands.slice(0, 90);

        if (finalCmds.length === 0) {
          return await api.sendMessage(chatId, box(`│ ❌ No valid commands found!`), { reply_to_message_id: event.message_id });
        }

        // ✅ Handler এর মতো Root থেকে Set
        await api.setMyCommands(finalCmds, { scope: { type: "default" } });
        await api.setMyCommands(finalCmds, { scope: { type: "all_private_chats" } }).catch(()=>{});
        await api.setMyCommands(finalCmds, { scope: { type: "all_group_chats" } }).catch(()=>{});
        await api.setMyCommands(finalCmds).catch(()=>{});

        const msg = `│ ✅ SLASH MENU ON\n│ 🟢 ${finalCmds.length} Commands Set\n│ এখন / লিখলেই Show করবে`;
        return await api.sendMessage(chatId, box(msg), { reply_to_message_id: event.message_id });
      }

      if (input === "off") {
        await api.deleteMyCommands({ scope: { type: "default" } }).catch(()=>{});
        await api.deleteMyCommands({ scope: { type: "all_private_chats" } }).catch(()=>{});
        await api.deleteMyCommands({ scope: { type: "all_group_chats" } }).catch(()=>{});
        await api.deleteMyCommands().catch(()=>{});

        const msg = `│ 🔴 SLASH MENU OFF\n│ এখন / লিখলে Show করবে না`;
        return await api.sendMessage(chatId, box(msg), { reply_to_message_id: event.message_id });
      }

    } catch (e) {
      console.error("[SETMENU ERROR]", e.message);
      // কোন Command এ Error তা বের করার জন্য
      const msg = `│ ❌ Error: ${e.message}\n│ Fix Done - আবার /setmenu on দাও`;
      return await api.sendMessage(chatId, box(msg), { reply_to_message_id: event.message_id });
    }
  }
};