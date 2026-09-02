module.exports = {
  config: {
    name: "left",
    aliases: ["leave"],
    author: "MOHAMMAD BADOL",
    version: "6.2-REMOVED-FILTER-100%",
    category: "admin",
    usePrefix: true,
    role: 2,
  },

  BADOL: async function({ ctx }) {
    try {
      let allThreads = [];
      try { allThreads = await global.db.getAllThreads(); } catch { allThreads = []; }
      let groups = allThreads.filter(t => String(t.id || t.threadID || "").startsWith("-"));

      if (groups.length === 0) return ctx.reply("No groups found!");

      const chatId = String(ctx.chat.id);
      const loadingMsg = await ctx.reply(`Found ${groups.length} groups...\nChecking active...`).catch(()=>null);

      let realGroups = [];
      let kickedCount = 0;

      for (const g of groups) {
        const gid = String(g.id || g.threadID || "");

        // ✅ তুমি যে Group এর কথা বলছো ওটা Force Skip
        if (gid === "-1004456885942") {
          kickedCount++;
          continue;
        }

        try {
          const botId = ctx.botInfo?.id || (await ctx.telegram.getMe()).id;
          const member = await ctx.telegram.getChatMember(gid, botId);
          if (['left','kicked','banned'].includes(member.status)) {
            kickedCount++;
            continue;
          }
          realGroups.push(g);
        } catch (err) {
          const msg = (err.message || "").toLowerCase();
          console.log(`[LEFT] Check ${gid}: ${msg}`);

          // ✅ FIXED: সব ধরনের Remove Error Filter
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
            msg.includes("group chat was deactivated") ||
            msg.includes("have no rights")
          ) {
            // Rate Limit না হলে Filter
            if (!msg.includes("too many") &&!msg.includes("retry") &&!msg.includes("timeout")) {
              kickedCount++;
              continue;
            }
          }
          // Rate Limit / Network Error হলে Keep
          realGroups.push(g);
        }
      }

      if (realGroups.length === 0) {
        if (loadingMsg) {
          await ctx.telegram.editMessageText(chatId, loadingMsg.message_id, null, `No active groups!\nDB Total: ${groups.length}\nKicked/Removed Filtered: ${kickedCount}`).catch(()=>{});
        }
        return;
      }

      if (!global.leftCache) global.leftCache = {};
      if (!global.leftSelected) global.leftSelected = {};
      if (!global.leftInfo) global.leftInfo = {};

      global.leftCache[chatId] = realGroups;
      global.leftSelected[chatId] = new Set();
      global.leftInfo[chatId] = { total: groups.length, kicked: kickedCount };

      await sendPageEdit(ctx, chatId, 0, loadingMsg.message_id);

    } catch (e) {
      console.log(e);
      await ctx.reply(`Error: ${e.message}`);
    }
  },

  onCallback: async function({ event, ctx }) {
    const data = event.data;
    const chatId = String(event.message.chat.id);
    try { await ctx.answerCbQuery().catch(()=>{}); } catch {}
    if (!global.leftCache ||!global.leftCache[chatId]) return;

    const selected = global.leftSelected[chatId] || new Set();

    if (data.startsWith("left_page_")) {
      const page = parseInt(data.replace("left_page_", "")) || 0;
      await sendPage(ctx, chatId, page);
      return;
    }

    if (data.startsWith("left_toggle_")) {
      const idx = parseInt(data.replace("left_toggle_", ""));
      if (selected.has(idx)) selected.delete(idx);
      else selected.add(idx);
      global.leftSelected[chatId] = selected;
      await sendPage(ctx, chatId, Math.floor(idx/5));
      return;
    }

    if (data.startsWith("left_leave_") && data!== "left_leave_selected") {
      const idx = parseInt(data.replace("left_leave_", ""));
      const group = global.leftCache[chatId][idx];
      if (!group) return;
      const gid = String(group.id || group.threadID || "");
      try {
        await ctx.telegram.leaveChat(gid).catch(()=>{});
        global.leftCache[chatId].splice(idx, 1);
        const newSet = new Set();
        for (let s of selected) {
          if (s === idx) continue;
          if (s > idx) newSet.add(s-1);
          else newSet.add(s);
        }
        global.leftSelected[chatId] = newSet;
        if (global.leftCache[chatId].length === 0) {
          await ctx.editMessageText("All groups left!").catch(()=>{});
          return;
        }
        await sendPage(ctx, chatId, Math.floor(idx/5));
      } catch (e) {}
      return;
    }

    if (data === "left_leave_selected") {
      if (selected.size === 0) {
        await ctx.answerCbQuery("Select groups first!").catch(()=>{});
        return;
      }
      const toLeave = [...selected].sort((a,b)=>b-a);
      for (const idx of toLeave) {
        const g = global.leftCache[chatId][idx];
        if (!g) continue;
        const gid = String(g.id || g.threadID || "");
        try {
          await ctx.telegram.leaveChat(gid).catch(()=>{});
          global.leftCache[chatId].splice(idx, 1);
        } catch {}
      }
      global.leftSelected[chatId] = new Set();
      if (global.leftCache[chatId].length === 0) {
        await ctx.editMessageText("All groups left!").catch(()=>{});
        return;
      }
      await sendPage(ctx, chatId, 0);
      return;
    }

    if (data === "left_cancel") {
      delete global.leftCache[chatId];
      delete global.leftSelected[chatId];
      delete global.leftInfo[chatId];
      await ctx.editMessageText("Cancelled!").catch(()=>{});
      return;
    }
  }
};

async function sendPageEdit(ctx, chatId, page, messageId) {
  const groups = global.leftCache?.[String(chatId)] || [];
  const selected = global.leftSelected?.[String(chatId)] || new Set();
  const info = global.leftInfo?.[String(chatId)] || {};
  const PER_PAGE = 5;
  const totalPages = Math.ceil(groups.length / PER_PAGE);
  const start = page * PER_PAGE;
  const pageGroups = groups.slice(start, start + PER_PAGE);

  let text = `BOT GROUPS: ${groups.length}\n`;
  if (info.kicked) text += `DB: ${info.total} | Active: ${groups.length} | Removed: ${info.kicked}\n`;
  text += `Page: ${page+1}/${totalPages} | Selected: ${selected.size}\n\n`;

  for (let i = 0; i < pageGroups.length; i++) {
    const g = pageGroups[i];
    const gid = String(g.id || g.threadID || "");
    const realIdx = start + i;
    const isSel = selected.has(realIdx);
    const title = (g.name || "Unknown").slice(0, 20);
    text += `${isSel? "[x]" : "[ ]"} ${realIdx+1}. ${title}\nID: ${gid}\n\n`;
  }

  let keyboard = [];
  for (let i = 0; i < pageGroups.length; i++) {
    const realIdx = start + i;
    const isSel = selected.has(realIdx);
    keyboard.push([
      { text: isSel? `Deselect ${realIdx+1}` : `Select ${realIdx+1}`, callback_data: `left_toggle_${realIdx}` },
      { text: `Leave ${realIdx+1}`, callback_data: `left_leave_${realIdx}` }
    ]);
  }

  let nav = [];
  if (page > 0) nav.push({ text: "Prev", callback_data: `left_page_${page-1}` });
  if (page < totalPages - 1) nav.push({ text: "Next", callback_data: `left_page_${page+1}` });
  if (nav.length) keyboard.push(nav);
  keyboard.push([{ text: `Leave Selected (${selected.size})`, callback_data: `left_leave_selected` }]);
  keyboard.push([{ text: "Cancel", callback_data: `left_cancel` }]);

  try {
    await ctx.telegram.editMessageText(chatId, messageId, null, text, {
      reply_markup: { inline_keyboard: keyboard }
    });
  } catch (e) {
    await ctx.telegram.sendMessage(chatId, text, {
      reply_markup: { inline_keyboard: keyboard }
    }).catch(()=>{});
  }
}

async function sendPage(ctx, chatId, page) {
  const groups = global.leftCache?.[String(chatId)] || [];
  const selected = global.leftSelected?.[String(chatId)] || new Set();
  const info = global.leftInfo?.[String(chatId)] || {};
  const PER_PAGE = 5;
  const totalPages = Math.ceil(groups.length / PER_PAGE);
  const start = page * PER_PAGE;
  const pageGroups = groups.slice(start, start + PER_PAGE);

  let text = `BOT GROUPS: ${groups.length}\n`;
  if (info.kicked) text += `DB: ${info.total} | Active: ${groups.length} | Removed: ${info.kicked}\n`;
  text += `Page: ${page+1}/${totalPages} | Selected: ${selected.size}\n\n`;

  for (let i = 0; i < pageGroups.length; i++) {
    const g = pageGroups[i];
    const gid = String(g.id || g.threadID || "");
    const realIdx = start + i;
    const isSel = selected.has(realIdx);
    const title = (g.name || "Unknown").slice(0, 20);
    text += `${isSel? "[x]" : "[ ]"} ${realIdx+1}. ${title}\nID: ${gid}\n\n`;
  }

  let keyboard = [];
  for (let i = 0; i < pageGroups.length; i++) {
    const realIdx = start + i;
    const isSel = selected.has(realIdx);
    keyboard.push([
      { text: isSel? `Deselect ${realIdx+1}` : `Select ${realIdx+1}`, callback_data: `left_toggle_${realIdx}` },
      { text: `Leave ${realIdx+1}`, callback_data: `left_leave_${realIdx}` }
    ]);
  }

  let nav = [];
  if (page > 0) nav.push({ text: "Prev", callback_data: `left_page_${page-1}` });
  if (page < totalPages - 1) nav.push({ text: "Next", callback_data: `left_page_${page+1}` });
  if (nav.length) keyboard.push(nav);
  keyboard.push([{ text: `Leave Selected (${selected.size})`, callback_data: `left_leave_selected` }]);
  keyboard.push([{ text: "Cancel", callback_data: `left_cancel` }]);

  await ctx.editMessageText(text, {
    reply_markup: { inline_keyboard: keyboard }
  }).catch(()=>{});
}