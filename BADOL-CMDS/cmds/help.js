const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "help",
    aliases: ["menu"],
    author: "MOHAMMAD BADOL",
    version: "3.2 FULL FIXED",
    cooldown: 2,
    role: 0,
    description: "help menu",
    category: "system",
    usePrefix: true
  },

  BADOL: async function ({ event, api, args, message, chatId }) {
    let prefix = global.config.prefix;
    try {
      const thread = await global.db.getThread(String(chatId));
      if (thread?.customPrefix) prefix = thread.customPrefix;
    } catch {}

    const HELP_IMG = "https://drive.google.com/uc?export=download&id=1MPfxgexHSUUaGWwIi5AiuovT10QC0PjG";
    const botName = global.config.botName || "EREN-AI";

    const allCmdsMap = global.badol.commands || new Map();
    const uniqueCommands = [...new Map([...allCmdsMap.values()].map(c => [c.config.name, c])).values()].sort((a,b)=>a.config.name.localeCompare(b.config.name));
    const totalCommands = uniqueCommands.length;

    if (args[0]?.toLowerCase() === "all") {
      let fullMsg = `📚 ${botName} - All Commands (${totalCommands})\n━━━━━━━━━━━━━━━━\n\n`;
      uniqueCommands.forEach((c,i) => fullMsg += `${i+1}. ${prefix}${c.config.name}\n`);
      fullMsg += `\n━━━━━━━━━━━━━━━━━━━━━━━━\nUse: ${prefix}help <name>`;
      try {
        if (fullMsg.length > 3500) {
          await api.sendPhoto(event.chat.id, HELP_IMG, { caption: `📋 Total ${totalCommands} Commands - List sent as text` });
          await api.sendMessage(event.chat.id, fullMsg);
        } else {
          await api.sendPhoto(event.chat.id, HELP_IMG, { caption: fullMsg });
        }
      } catch { await message.reply(fullMsg); }
      return;
    }

    if (args[0] && isNaN(args[0])) {
      const input = args[0].toLowerCase();
      const cmd = allCmdsMap.get(input) || uniqueCommands.find(c => c.config.aliases?.includes(input));
      if (!cmd) return message.reply(`❌ "${args[0]}" পাওয়া যায়নি!`);

      const cfg = cmd.config;
      let perm = "Everyone 👥";
      if (cfg.role === 1) perm = "Group Admins 👮";
      if (cfg.role >= 2) perm = "Bot Owner 👑";

      let detail = `╭──────❍ 𝐂𝐨𝐦𝐦𝐚𝐧𝐝-𝐈𝐧𝐟𝐨 ❍──────╮\n`;
      detail += `├‣ 📘 Name: ${prefix}${cfg.name}\n`;
      detail += `├‣ 🔁 Aliases: ${cfg.aliases?.length? cfg.aliases.join(", ") : "None"}\n`;
      detail += `├‣ 👤 Author: ${cfg.author || "Unknown"}\n`;
      detail += `├‣ 📦 Version: ${cfg.version || "1.0"}\n`;
      detail += `├‣ 🔑 Role: ${cfg.role} (${perm})\n`;
      detail += `├‣ 📂 Category: ${cfg.category || "N/A"}\n`;
      detail += `├‣ ⏱️ Cooldown: ${cfg.cooldown || 3}s\n`;
      detail += `├‣ 🔧 Prefix: ${cfg.usePrefix? "Yes" : "No"}\n`;
      detail += `├‣ 📄 Description: ${cfg.description || "No description"}\n`;
      if (cfg.guide?.en) detail += `├‣ 📖 Guide: ${cfg.guide.en.replaceAll("{p}", prefix)}\n`;
      detail += `╰───────────────────────⟡`;

      const btn = { reply_markup: { inline_keyboard: [[{ text: "📋 All", callback_data: "help_all" }, { text: "❌ Close", callback_data: "help_close" }]] } };
      try { await api.sendPhoto(event.chat.id, HELP_IMG, { caption: detail,...btn }); }
      catch { await message.reply(detail, btn); }
      return;
    }

    const perPage = 15;
    let page = parseInt(args[0]) || 1;
    const totalPages = Math.max(1, Math.ceil(totalCommands / perPage));
    if (page < 1) page = 1; if (page > totalPages) page = totalPages;

    const makeCaption = (p) => {
      const s = (p-1)*perPage;
      const slice = uniqueCommands.slice(s, s+perPage);
      const list = slice.map((c,i) => `├‣ ${s+i+1} ✿ ${prefix}${c.config.name}`).join("\n");
      return `╭──────❍ Help-Menu ❍──────╮\n┏━━━━━━━━━━━━━━━━━━━━━❥\n${list}\n┗━━━━━━━━━━━━━━━━━━━━━❥\n\n🌿 ★ ${botName} ★\nPage: ${p}/${totalPages} | Total Cmd: [ ${totalCommands} ]`;
    };

    const caption = makeCaption(page);
    const buttons = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "◀️ Prev", callback_data: `help_page_${page-1}` }, { text: `${page}/${totalPages}`, callback_data: "help_noop" }, { text: "Next ▶️", callback_data: `help_page_${page+1}` }],
          [{ text: "📋 All Commands", callback_data: "help_all" }, { text: "❌ Close", callback_data: "help_close" }]
        ]
      }
    };

    let sent;
    try {
      const localImg = path.join(__dirname, "help.jpg");
      if (fs.existsSync(localImg)) sent = await api.sendPhoto(event.chat.id, { source: localImg }, { caption,...buttons });
      else sent = await api.sendPhoto(event.chat.id, HELP_IMG, { caption,...buttons });
    } catch {
      sent = await api.sendMessage(event.chat.id, caption, buttons);
    }

    if (sent?.message_id) {
      global.badol.onCallback.set(sent.message_id, {
        commandName: "help",
        page,
        totalPages,
        totalCommands,
        botName,
        prefix,
        HELP_IMG
      });
    }
  },

  onCallback: async function ({ event, api, ctx }) {
    try {
      const data = event.data;
      const chatId = event.message.chat.id;
      const msgId = event.message.message_id;
      let stored = global.badol.onCallback.get(msgId);
      if (!stored) stored = { page: 1, totalPages: 1, prefix: global.config.prefix, botName: global.config.botName || "EREN-AI-BOT", HELP_IMG: "https://drive.google.com/uc?export=download&id=1MPfxgexHSUUaGWwIi5AiuovT10QC0PjG" };

      if (data === "help_close") {
        try { await api.deleteMessage(chatId, msgId); } catch { await ctx.editMessageCaption("❌ Closed").catch(()=>{}); }
        return await ctx.answerCbQuery("Closed").catch(()=>{});
      }
      if (data === "help_noop") return await ctx.answerCbQuery(`Page ${stored.page}/${stored.totalPages}`).catch(()=>{});
      if (data === "help_all") {
        const allCmdsMap = global.badol.commands || new Map();
        const unique = [...new Map([...allCmdsMap.values()].map(c => [c.config.name, c])).values()].sort((a,b)=>a.config.name.localeCompare(b.config.name));
        let fullMsg = `📚 ${stored.botName} - All Commands (${unique.length})\n━━━━━━━━━━━━━━━\n`;
        fullMsg += unique.map((c,i) => `${i+1}. ${stored.prefix}${c.config.name}`).join("\n");
        try { await api.sendMessage(chatId, fullMsg.substring(0,4000)); await ctx.answerCbQuery("Full list sent!"); }
        catch { await ctx.answerCbQuery("Error!"); }
        return;
      }

      if (data.startsWith("help_page_")) {
        let page = parseInt(data.split("_")[2]);
        if (isNaN(page)) return;
        if (page < 1) page = stored.totalPages;
        if (page > stored.totalPages) page = 1;

        const allCmdsMap = global.badol.commands || new Map();
        const unique = [...new Map([...allCmdsMap.values()].map(c => [c.config.name, c])).values()].sort((a,b)=>a.config.name.localeCompare(b.config.name));
        const perPage = 15;
        const s = (page-1)*perPage;
        const slice = unique.slice(s, s+perPage);
        const list = slice.map((c,i) => `├‣ ${s+i+1} ✿ ${stored.prefix}${c.config.name}`).join("\n");
        const newCaption = `╭──────❍ Help-Menu ❍──────╮\n┏━━━━━━━━━━━━━━━━━━━━━❥\n${list}\n┗━━━━━━━━━━━━━━━━━━━━━❥\n\n🌿 ★ ${stored.botName} ★\nPage: ${page}/${stored.totalPages} | Total Cmd: [ ${stored.totalCommands || unique.length} ]`;

        const buttons = {
          reply_markup: {
            inline_keyboard: [
              [{ text: "◀️ Prev", callback_data: `help_page_${page-1}` }, { text: `${page}/${stored.totalPages}`, callback_data: "help_noop" }, { text: "Next ▶️", callback_data: `help_page_${page+1}` }],
              [{ text: "📋 All Commands", callback_data: "help_all" }, { text: "❌ Close", callback_data: "help_close" }]
            ]
          }
        };

        try { await ctx.editMessageCaption(newCaption, buttons).catch(async () => await api.editMessageCaption(newCaption, { chat_id: chatId, message_id: msgId,...buttons })); }
        catch { try { await api.editMessageText(chatId, msgId, null, newCaption, buttons); } catch {} }

        stored.page = page;
        global.badol.onCallback.set(msgId, stored);
        return await ctx.answerCbQuery(`Page ${page}/${stored.totalPages}`).catch(()=>{});
      }
    } catch (e) { console.log("help cb error:", e.message); }
  }
};