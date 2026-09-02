module.exports = {
  config: {
    name: "join",
    aliases: ["joinlist", "groups"],
    author: "MOHAMMAD BADOL",
    version: "1.0-ACTIVE-FILTER",
    description: "Show only active groups with join button - kicked filtered",
    category: "admin",
    usePrefix: true,
    role: 2,
  },

  BADOL: async function({ ctx, chatId }) {
    try {
      let allThreads = [];
      try { allThreads = await global.db.getAllThreads(); } catch { allThreads = []; }
      let groups = allThreads.filter(t => String(t.id || t.threadID || "").startsWith("-"));

      if (groups.length === 0) return ctx.reply("No groups in DB!");

      const loading = await ctx.reply(`🔍 Found ${groups.length} groups in DB...\n⏳ Checking active groups... Please wait...`).catch(()=>null);

      let activeGroups = [];
      let kickedCount = 0;

      // ✅ Active Check - Kick/Leave Filter
      for (const g of groups) {
        const gid = String(g.id || g.threadID || "");
        try {
          const botId = ctx.botInfo?.id || (await ctx.telegram.getMe()).id;
          const member = await ctx.telegram.getChatMember(gid, botId);
          if (['left','kicked','banned'].includes(member.status)) {
            kickedCount++;
            continue;
          }
          activeGroups.push(g);
        } catch (err) {
          const msg = (err.message || "").toLowerCase();
          if (
            msg.includes("not found") ||
            msg.includes("kicked") ||
            msg.includes("not a member") ||
            msg.includes("not member") ||
            msg.includes("left") ||
            msg.includes("deactivated") ||
            msg.includes("upgraded") ||
            msg.includes("chat not found") ||
            msg.includes("forbidden") ||
            msg.includes("have no rights")
          ) {
            if (!msg.includes("too many") &&!msg.includes("retry") &&!msg.includes("timeout")) {
              kickedCount++;
              continue;
            }
          }
          activeGroups.push(g);
        }
      }

      if (activeGroups.length === 0) {
        if (loading) {
          await ctx.telegram.editMessageText(chatId, loading.message_id, null,
            `❌ No active groups!\n\n• DB Total: ${groups.length}\n• Kicked/Left: ${kickedCount}\n• Active: 0`
          ).catch(()=>{});
        }
        return;
      }

      if (!global.joinCache) global.joinCache = {};
      global.joinCache[chatId] = activeGroups;
      if (!global.joinInfo) global.joinInfo = {};
      global.joinInfo[chatId] = { total: groups.length, kicked: kickedCount };

      // Loading message edit করে List দেখাবে
      await sendJoinPage(ctx, chatId, 0, loading? loading.message_id : null, true);

    } catch (e) {
      await ctx.reply(`Error: ${e.message}`);
    }
  },

  onCallback: async function({ event, ctx }) {
    const data = event.data;
    const chatId = event.message.chat.id;
    try { await ctx.answerCbQuery().catch(()=>{}); } catch {}

    if (data.startsWith("join_page_")) {
      const page = parseInt(data.replace("join_page_", "")) || 0;
      await sendJoinPage(ctx, chatId, page);
      return;
    }

    if (data === "join_refresh") {
      // Refresh - আবার Check করবে
      await ctx.answerCbQuery("Refreshing...").catch(()=>{});
      let allThreads = [];
      try { allThreads = await global.db.getAllThreads(); } catch { allThreads = []; }
      let groups = allThreads.filter(t => String(t.id || t.threadID || "").startsWith("-"));
      let activeGroups = [];
      let kickedCount = 0;

      for (const g of groups) {
        const gid = String(g.id || g.threadID || "");
        try {
          const botId = ctx.botInfo?.id || (await ctx.telegram.getMe()).id;
          const member = await ctx.telegram.getChatMember(gid, botId);
          if (['left','kicked','banned'].includes(member.status)) {
            kickedCount++;
            continue;
          }
          activeGroups.push(g);
        } catch (err) {
          const msg = (err.message || "").toLowerCase();
          if (
            msg.includes("not found") || msg.includes("kicked") || msg.includes("not a member") ||
            msg.includes("left") || msg.includes("deactivated") || msg.includes("forbidden")
          ) {
            if (!msg.includes("too many") &&!msg.includes("retry")) {
              kickedCount++;
              continue;
            }
          }
          activeGroups.push(g);
        }
      }

      global.joinCache[chatId] = activeGroups;
      global.joinInfo[chatId] = { total: groups.length, kicked: kickedCount };
      await sendJoinPage(ctx, chatId, 0);
      return;
    }
  }
};

async function sendJoinPage(ctx, chatId, page, editMsgId = null, isFirst = false) {
  const groups = global.joinCache?.[String(chatId)] || [];
  const info = global.joinInfo?.[String(chatId)] || {};
  const PER_PAGE = 5;
  const totalPages = Math.ceil(groups.length / PER_PAGE);

  if (page<0) page = 0;
  if (page >= totalPages) page = totalPages-1;

  const pageGroups = groups.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  let text = `╭─❖─〔 JOIN GROUPS 〕─❖─╮\n`;
  text += `│ ✅ Active: ${groups.length}\n`;
  if (info.kicked) text += `│ ❌ Removed: ${info.kicked}\n│ 📂 DB Total: ${info.total}\n`;
  text += `│ 📄 Page: ${page+1}/${totalPages}\n`;
  text += `╰─❖─〔 𝐄𝐒𝐁-𝐓𝐄𝐀𝐌 〕─❖─╯\n\n`;

  let keyboard = [];

  for (let i = 0; i < pageGroups.length; i++) {
    const g = pageGroups[i];
    const gid = String(g.id || g.threadID || "");
    const idx = page * PER_PAGE + i + 1;

    let title = g.name || "Unknown Group";
    let username = null;
    let inviteLink = null;

    try {
      const chat = await ctx.telegram.getChat(gid);
      title = (chat.title || g.name || "Unknown").slice(0, 35);
      if (chat.username) {
        username = `@${chat.username}`;
        inviteLink = `https://t.me/${chat.username}`;
      } else {
        try { inviteLink = await ctx.telegram.exportChatInviteLink(gid); } catch { inviteLink = null; }
      }
    } catch {
      title = g.name || "Unknown";
    }

    // Clean title
    title = title.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();

    text += `${idx}. ${title}\n`;
    text += ` 🆔 ${gid}\n`;
    if (username) text += ` 🔗 ${username}\n`;
    text += `\n`;

    // Button
    if (inviteLink) {
      keyboard.push([{ text: `🚀 Join ${title.slice(0,20)}`, url: inviteLink }]);
    } else {
      keyboard.push([{ text: `❌ ${title.slice(0,20)} - No Link`, callback_data: "noop" }]);
    }
  }

  // Navigation
  let nav = [];
  if (page > 0) nav.push({ text: "⬅️ Prev", callback_data: `join_page_${page-1}` });
  if (page < totalPages - 1) nav.push({ text: "Next ➡️", callback_data: `join_page_${page+1}` });
  if (nav.length) keyboard.push(nav);

  keyboard.push([{ text: "🔄 Refresh List", callback_data: "join_refresh" }]);

  const opts = { reply_markup: { inline_keyboard: keyboard } };
  text = Buffer.from(text, 'utf-8').toString('utf-8');

  try {
    if (isFirst && editMsgId) {
      await ctx.telegram.editMessageText(chatId, editMsgId, null, text, opts);
    } else {
      await ctx.editMessageText(text, opts);
    }
  } catch (e) {
    try {
      if (isFirst && editMsgId) {
        await ctx.telegram.editMessageText(chatId, editMsgId, null, text, opts).catch(async()=>{
          await ctx.telegram.sendMessage(chatId, text, opts);
        });
      } else {
        await ctx.telegram.sendMessage(chatId, text, opts);
      }
    } catch {
      await ctx.telegram.sendMessage(chatId, text, opts).catch(()=>{});
    }
  }
}