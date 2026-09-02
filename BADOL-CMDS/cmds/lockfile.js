// ✅ BADOL V12 - MONGODB FIXED - NO FILE
if (!global.badol) global.badol = {};
if (!global.badol.onCallback) global.badol.onCallback = new Map();

const HELP_IMG = "https://drive.google.com/uc?export=download&id=1MPfxgexHSUUaGWwIi5AiuovT10QC0PjG";
const PER_PAGE = 20;

async function getLocked(){
  try {
    if(!global.db?.getSettings) return [];
    const s = await global.db.getSettings();
    if(s?.lockedCommands && Array.isArray(s.lockedCommands)) return s.lockedCommands.map(c=>String(c).toLowerCase());
    return [];
  } catch { return []; }
}

async function saveLocked(arr){
  try {
    if(!global.db?.getSettings ||!global.db?.updateSettings) return;
    const current = await global.db.getSettings() || {};
    current.lockedCommands = [...new Set(arr.map(c=>String(c).toLowerCase()))];
    await global.db.updateSettings(current);
    console.log("[LOCKFILE] Saved to MongoDB:", current.lockedCommands.length);
    // Cache clear
    if(global._lockedCache) global._lockedCache.time = 0;
  } catch(e){ console.log("saveLocked err", e.message); }
}

function getAllCommands(){
  try {
    const map = global.badol.commands || new Map();
    const unique = [...new Map([...map.values()].map(c => [c.config.name, c])).values()];
    return unique.sort((a,b)=>a.config.name.localeCompare(b.config.name));
  } catch { return []; }
}

function getBoxCaption(all, locked, page, totalPages){
  return `╭━❮ Lock-File ❯━╮
├═━═━═━═━═━═━═━═━═━═
├‣ 📦 Total Cmd: ${all.length}
├‣ 🔒 Locked: ${locked.length}
├‣ ✅ Unlocked: ${all.length - locked.length}
├‣ 📄 Page: ${page+1}/${totalPages}
├‣ 🔒 = Locked | ✅ = Unlocked
├═━═━═━═━═━═━═━═
├‣ 🤖 𝐄𝐒𝐁-𝐁𝐎𝐓 - 𝐄𝐒𝐁-𝐓𝐄𝐀𝐌
╰━═━═━═━═━═━═━═━╯`;
}

module.exports = {
  config: {
    name: "lockfile",
    aliases: ["lockcmd", "cmdlock"],
    author: "MOHAMMAD BADOL",
    version: "20-MONGODB-FIXED",
    role: 1,
    category: "admin",
    prefix: true,
    cooldown: 2
  },

  BADOL: async function ({ api, chatId, event, args }) {
    const userId = event.from?.id;
    const allCmds = getAllCommands();
    const locked = await getLocked();

    if(args[0]?.toLowerCase() === "list"){
      if(locked.length === 0) return await api.sendMessage(chatId, "✅ কোনো Command Lock নাই! (MongoDB)");
      const lockedCmds = allCmds.filter(c=>locked.includes(c.config.name.toLowerCase()));
      let txt = `╭━❮ Locked-List ❯━╮\n├═━═━═━═━═━═━═━═━═━═\n`;
      lockedCmds.forEach((c,i)=>{ txt += `├‣ ${i+1}. 🔒 ${c.config.name}\n`; });
      txt += `├═━═━═━═━═━═━═━═━═━═\n├‣ Total Locked: ${locked.length}\n├‣ Storage: MongoDB Permanent\n╰━═━═━═━═━═━═━═━╯`;
      const buttons = lockedCmds.slice(0,20).map(c=>[{ text: `🔒 ${c.config.name}`, callback_data: `lockfile_view_${c.config.name.toLowerCase()}_0` }]);
      buttons.push([{ text: "📋 All Commands", callback_data: "lockfile_page_0" }, { text: "❌ Close", callback_data: "lockfile_close" }]);
      try { return await api.sendPhoto(chatId, HELP_IMG, { caption: txt, reply_markup: { inline_keyboard: buttons } }); }
      catch { return await api.sendMessage(chatId, txt, { reply_markup: { inline_keyboard: buttons } }); }
    }

    const totalPages = Math.max(1, Math.ceil(allCmds.length / PER_PAGE));
    const page = 0;
    const pageCmds = allCmds.slice(0, PER_PAGE);
    const caption = getBoxCaption(allCmds, locked, page, totalPages);

    const buttons = [];
    for(let i=0; i<pageCmds.length; i+=2){
      const c1 = pageCmds[i]; const c2 = pageCmds[i+1];
      const row = [];
      if(c1) row.push({ text: `${locked.includes(c1.config.name.toLowerCase())?"🔒":"✅"} ${c1.config.name}`, callback_data: `lockfile_view_${c1.config.name.toLowerCase()}_${page}` });
      if(c2) row.push({ text: `${locked.includes(c2.config.name.toLowerCase())?"🔒":"✅"} ${c2.config.name}`, callback_data: `lockfile_view_${c2.config.name.toLowerCase()}_${page}` });
      buttons.push(row);
    }
    buttons.push([{ text: "◀️ Prev", callback_data: `lockfile_page_${page-1}` }, { text: `${page+1}/${totalPages}`, callback_data: "lockfile_noop" }, { text: "Next ▶️", callback_data: `lockfile_page_${page+1}` }]);
    buttons.push([{ text: "🔒 Locked List", callback_data: `lockfile_list` }, { text: "🔓 UnlockAll", callback_data: `lockfile_unlockall_${page}` }]);
    buttons.push([{ text: "❌ Close", callback_data: "lockfile_close" }]);

    let sent;
    try { sent = await api.sendPhoto(chatId, HELP_IMG, { caption, reply_markup: { inline_keyboard: buttons } }); }
    catch { sent = await api.sendMessage(chatId, caption, { reply_markup: { inline_keyboard: buttons } }); }
    if(sent?.message_id){
      global.badol.onCallback.set(sent.message_id, { commandName: "lockfile", page: 0, totalPages, author: userId, HELP_IMG });
    }
  },

  onCallback: async function ({ event, api, ctx }) {
    try {
      const data = event.data;
      const chatId = event.message.chat.id;
      const msgId = event.message.message_id;
      let stored = global.badol.onCallback.get(msgId);
      if(!stored) stored = { page: 0, totalPages: 1, HELP_IMG, author: event.from.id };
      if(stored.author && String(stored.author)!== String(event.from.id)){
        return await ctx.answerCbQuery("⛔ তোমার Menu না!", { show_alert: true }).catch(()=>{});
      }

      const allCmds = getAllCommands();
      let lockedNow = await getLocked();
      const totalPages = Math.max(1, Math.ceil(allCmds.length / PER_PAGE));

      if(data === "lockfile_close"){ try { await api.deleteMessage(chatId, msgId); } catch {} return; }
      if(data === "lockfile_noop") return await ctx.answerCbQuery(`Page ${stored.page+1}/${stored.totalPages}`).catch(()=>{});
      if(data === "lockfile_list"){
        if(lockedNow.length === 0) return await ctx.answerCbQuery("✅ কোনো Lock নাই!", {show_alert:true}).catch(()=>{});
        const lockedCmds = allCmds.filter(c=>lockedNow.includes(c.config.name.toLowerCase()));
        let txt = `╭━❮ Locked-List ❯━╮\n├═━═━═━═━═━═━═━═━═━═\n`;
        lockedCmds.forEach((c,i)=>{ txt += `├‣ ${i+1}. 🔒 ${c.config.name}\n`; });
        txt += `├═━═━═━═━═━═━═━═━═━═\n├‣ Total Locked: ${lockedNow.length}\n╰━═━═━═━═━═━═━═━╯`;
        const buttons = lockedCmds.slice(0,20).map(c=>[{ text: `🔒 ${c.config.name}`, callback_data: `lockfile_view_${c.config.name.toLowerCase()}_0` }]);
        buttons.push([{ text: "📋 All", callback_data: "lockfile_page_0" }, { text: "❌ Close", callback_data: "lockfile_close" }]);
        try { await ctx.editMessageCaption(txt, { reply_markup: { inline_keyboard: buttons } }); } catch {}
        return;
      }

      if(data.startsWith("lockfile_page_")){
        let page = parseInt(data.split("_")[2]); if(isNaN(page)) page = 0;
        if(page < 0) page = totalPages-1; if(page >= totalPages) page = 0;
        const pageCmds = allCmds.slice(page*PER_PAGE, page*PER_PAGE+PER_PAGE);
        lockedNow = await getLocked();
        const caption = getBoxCaption(allCmds, lockedNow, page, totalPages);
        const buttons = [];
        for(let i=0; i<pageCmds.length; i+=2){
          const c1 = pageCmds[i]; const c2 = pageCmds[i+1];
          const row = [];
          if(c1) row.push({ text: `${lockedNow.includes(c1.config.name.toLowerCase())?"🔒":"✅"} ${c1.config.name}`, callback_data: `lockfile_view_${c1.config.name.toLowerCase()}_${page}` });
          if(c2) row.push({ text: `${lockedNow.includes(c2.config.name.toLowerCase())?"🔒":"✅"} ${c2.config.name}`, callback_data: `lockfile_view_${c2.config.name.toLowerCase()}_${page}` });
          buttons.push(row);
        }
        buttons.push([{ text: "◀️ Prev", callback_data: `lockfile_page_${page-1}` }, { text: `${page+1}/${totalPages}`, callback_data: "lockfile_noop" }, { text: "Next ▶️", callback_data: `lockfile_page_${page+1}` }]);
        buttons.push([{ text: "🔒 Locked List", callback_data: `lockfile_list` }, { text: "🔓 UnlockAll", callback_data: `lockfile_unlockall_${page}` }]);
        buttons.push([{ text: "❌ Close", callback_data: "lockfile_close" }]);
        try { await ctx.editMessageCaption(caption, { reply_markup: { inline_keyboard: buttons } }); } catch {}
        stored.page = page; global.badol.onCallback.set(msgId, stored);
        return;
      }

      if(data.startsWith("lockfile_unlockall_")){
        await saveLocked([]); lockedNow = [];
        const page = stored.page;
        const caption = `╭━❮ Lock-File ❯━╮\n├═━═━═━═━═━═━═━═━═━═\n├‣ 📦 Total: ${allCmds.length}\n├‣ 🔒 Locked: 0\n├‣ ✅ Unlocked: ${allCmds.length}\n├═━═━═━═━═━═━═━═━═━═\n├‣ ✅ All Unlocked - MongoDB!\n╰━═━═━═━═━═━═━═━═━═━╯`;
        const pageCmds = allCmds.slice(page*PER_PAGE, page*PER_PAGE+PER_PAGE);
        const buttons = [];
        for(let i=0; i<pageCmds.length; i+=2){
          const c1 = pageCmds[i]; const c2 = pageCmds[i+1];
          const row = [];
          if(c1) row.push({ text: `✅ ${c1.config.name}`, callback_data: `lockfile_view_${c1.config.name.toLowerCase()}_${page}` });
          if(c2) row.push({ text: `✅ ${c2.config.name}`, callback_data: `lockfile_view_${c2.config.name.toLowerCase()}_${page}` });
          buttons.push(row);
        }
        buttons.push([{ text: "◀️ Prev", callback_data: `lockfile_page_${page-1}` }, { text: `${page+1}/${totalPages}`, callback_data: "lockfile_noop" }, { text: "Next ▶️", callback_data: `lockfile_page_${page+1}` }]);
        buttons.push([{ text: "❌ Close", callback_data: "lockfile_close" }]);
        try { await ctx.editMessageCaption(caption, { reply_markup: { inline_keyboard: buttons } }); } catch {}
        return await ctx.answerCbQuery("✅ All Unlocked - MongoDB!").catch(()=>{});
      }

      if(data.startsWith("lockfile_view_")){
        const cmdName = data.split("_")[2];
        const page = parseInt(data.split("_")[3]) || stored.page;
        const cmdObj = allCmds.find(c=>c.config.name.toLowerCase()===cmdName);
        const isLock = lockedNow.includes(cmdName);
        const aliasTxt = cmdObj?.config.aliases?.length? `├‣ 🔁 Aliases: ${cmdObj.config.aliases.join(", ")}\n` : "";
        const detail = `╭━❮ Cmd-Detail ❯━╮\n├═━═━═━═━═━═━═━═━═━═\n├‣ 📘 Name: ${cmdName}\n${aliasTxt}├‣ ${isLock? "🔴 Status: 🔒 LOCKED" : "🟢 Status: ✅ UNLOCKED"}\n├═━═━═━═━═━═━═━═━═━═\n├‣ ${isLock? "⛔ Main + Alias Lock!" : "✅ Unlock আছে!"}\n├‣ 💾 MongoDB Permanent\n├‣ 🤖 𝐄𝐒𝐁-𝐁𝐎𝐓\n╰━═━═━═━═━═━═━═━═━═━╯`;
        const btns = { reply_markup: { inline_keyboard: [[{ text: isLock? `✅ Unlock ${cmdName}` : `🔒 Lock ${cmdName}`, callback_data: `lockfile_toggle_${cmdName}_${page}` }], [{ text: "⬅️ Back", callback_data: `lockfile_page_${page}` }, { text: "❌ Close", callback_data: "lockfile_close" }]] } };
        try { await ctx.editMessageCaption(detail, btns); } catch {}
        return;
      }

      if(data.startsWith("lockfile_toggle_")){
        const cmdName = data.split("_")[2];
        const page = parseInt(data.split("_")[3]) || stored.page;
        let locked = await getLocked();
        if(locked.includes(cmdName)) locked = locked.filter(c=>c!==cmdName);
        else locked.push(cmdName);
        await saveLocked(locked);
        const isLock = locked.includes(cmdName);
        const cmdObj = allCmds.find(c=>c.config.name.toLowerCase()===cmdName);
        const aliasTxt = cmdObj?.config.aliases?.length? `├‣ 🔁 Aliases: ${cmdObj.config.aliases.join(", ")}\n` : "";
        const detail = `╭━❮ Cmd-Detail ❯━╮\n├═━═━═━═━═━═━═━═━═━═\n├‣ 📘 Name: ${cmdName}\n${aliasTxt}├‣ ${isLock? "🔴 Status: 🔒 LOCKED" : "🟢 Status: ✅ UNLOCKED"}\n├═━═━═━═━═━═━═━═━═━═\n├‣ ${isLock? "🔒 Lock! MongoDB!" : "✅ Unlock! MongoDB!"}\n╰━═━═━═━═━═━═━═━═━═━╯`;
        const btns = { reply_markup: { inline_keyboard: [[{ text: isLock? `✅ Unlock ${cmdName}` : `🔒 Lock ${cmdName}`, callback_data: `lockfile_toggle_${cmdName}_${page}` }], [{ text: "⬅️ Back", callback_data: `lockfile_page_${page}` }, { text: "❌ Close", callback_data: "lockfile_close" }]] } };
        try { await ctx.editMessageCaption(detail, btns); } catch {}
        return await ctx.answerCbQuery(isLock? `🔒 Locked + MongoDB` : `✅ Unlocked + MongoDB`).catch(()=>{});
      }
    } catch(e){ console.log(e.message); }
  }
};