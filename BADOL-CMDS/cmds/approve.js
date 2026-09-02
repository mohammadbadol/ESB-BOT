// BADOL-CMDS/cmds/approve.js - V11.2 FINAL - 100% FIXED V4 - FULL COPY PASTE
function safeName(str, len=25){
  try{
    if(!str) return "Unknown";
    str=String(str).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
    if(!str) return "Unknown";
    const arr=Array.from(str);
    if(arr.length>len) return arr.slice(0,len).join("")+"…";
    return arr.join("");
  }catch{ return "Group"; }
}
if(!global.approveView) global.approveView={};

const BOX = {
  line: "━━━━━━━━━━━━━━━━━━━━━━",
  line2: "──────────────────────",
  top: "╭─❖─〔 𝐄𝐒𝐁-𝐁𝐎𝐓 〕─❖─╮",
  bottom: "╰─❖─〔 𝐄𝐒𝐁-𝐓𝐄𝐀𝐌 〕─❖─╯"
};

// ✅ FIXED getList - Direct DB query
async function getList(){
  try{
    if(!global.db?.Thread) return [];
    const all = await global.db.Thread.find({ approved: true }).lean();
    const list = [];
    for(const t of all){
      const id = String(t.id || t.threadID || t.threadId || "").trim();
      if(!id) continue;
      if(id === "-5558330798" || id === "5558330798") continue;
      if(!id.startsWith("-")) continue;
      list.push(id);
    }
    return [...new Set(list)];
  }catch(e){ console.log("getList error", e.message); return [] }
}

// ✅ FIXED saveList - leftAt clear + no overwrite
async function saveList(l){
  try{
    const uniq = [...new Set(l.map(s=>String(s).trim()).filter(id=> id && id!== "-5558330798" && id.startsWith("-")))];
    console.log("[SAVE LIST] Saving:", uniq);
    for(const id of uniq){
      try{
        const res = await global.db.Thread.findOneAndUpdate(
          { id: String(id) },
          {
            $set: { approved: true, approvalTime: Date.now(), lastActivity: Date.now() },
            $unset: { leftAt: "", leftReason: "", reAddedAt: "", unapprovedTime: "" },
            $setOnInsert: { id: String(id), createdAt: Date.now(), name: `Group ${id.slice(-6)}` }
          },
          { upsert: true, new: true }
        ).lean();
        console.log(`[SAVE OK] ${id} -> approved=${res?.approved}`);
      }catch(e){ console.log("ON Fail", id, e.message); }
    }
    try{
      if(uniq.some(id=> id.startsWith("-100"))){
        await global.db.Thread.deleteOne({ id: "-5558330798" }).catch(()=>{});
      }
    }catch{}
    if(global._noticeCache){
      global._noticeCache.approved = uniq;
      global._noticeCache.time = Date.now();
    }
    if(global._approvedCache) global._approvedCache.time = 0;
    if(global._gcmdCache) global._gcmdCache.time = 0;
  }catch(e){ console.log("saveList error:", e.message); }
}

async function removeFromList(gid){
  try{
    const sGid = String(gid).trim();
    console.log(`[DELETE] Hard Delete Start: ${sGid}`);
    try{ await global.db.Thread.findOneAndUpdate({ id: sGid }, { $set: { approved: false, unapprovedTime: Date.now() } }).lean().catch(()=>{}); }catch{}
    try{ if(global.db.deleteThread) await global.db.deleteThread(sGid); }catch{}
    try{ if(global.db.deleteGroup) await global.db.deleteGroup(sGid); }catch{}
    try{ if(global.db.removeThread) await global.db.removeThread(sGid); }catch{}
    try{ if(global.db.removeGroup) await global.db.removeGroup(sGid); }catch{}
    try{
      if(global.db.db && global.db.db.collection){
        const col = global.db.db.collection("threads");
        await col.deleteOne({ id: sGid });
        await col.deleteOne({ threadID: sGid });
        await col.deleteOne({ threadId: sGid });
      }
    }catch{}
    if(global._noticeCache){
      global._noticeCache.approved = (global._noticeCache.approved||[]).filter(x=> String(x)!==sGid);
      global._noticeCache.time = Date.now();
    }
    if(global._approvedCache) global._approvedCache.time = 0;
    if(global._gcmdCache) global._gcmdCache.time = 0;
    console.log(`[DELETE] Done: ${sGid}`);
    let list = await getList();
    return list;
  }catch(e){ console.log("remove err", e.message); return []; }
}

async function isBotKicked(api, gid){
  try{
    const bot = await api.getMe();
    const m = await api.getChatMember(parseInt(gid), bot.id);
    if(!m) return true;
    if(m.status==='left'||m.status==='kicked'||m.status==='banned') return true;
    return false;
  }catch{ return true; }
}

module.exports={
  config:{
    name:"approve",
    version:"11.2",
    author:"MOHAMMAD BADOL",
    countDown:3,
    role:2,
    description:"Approve ORIGINAL + 100% DELETE + KICK HIDE",
    category:"admin",
    usePrefix:true,
    aliases:["gcapprove","approval","apv"]
  },
  BADOL: async function({ctx,chatId,args, api}){
    try{
      const sub=String(args[0]||"").toLowerCase();
      const id=String(chatId);
      const isG=id.startsWith("-")||ctx.message?.chat?.type==='group'||ctx.message?.chat?.type==='supergroup';
      let list=await getList();

      if(sub==="remove" || sub==="del" || sub==="delete" || sub==="rm"){
        const gid = args[1];
        if(!gid) return await ctx.telegram.sendMessage(chatId, `${BOX.top}\n│ ⚠️ Usage: /approve remove -100xxx\n${BOX.bottom}`);
        await removeFromList(gid);
        return await ctx.telegram.sendMessage(chatId, `${BOX.top}\n│ ✅ HARD DELETED │\n│ 🆔 ${gid}\n│ DB + Cache থেকে Delete Done!\n│ এখন /approve দিলে আর দেখাবে না! ✅\n${BOX.bottom}`);
      }
      if(sub==="clean" || sub==="cleankicked"){
        const tgApi = api || ctx.telegram;
        await ctx.telegram.sendMessage(chatId, `${BOX.top}\n│ 🔍 Checking ${list.length} Groups - Kicked Check...\n${BOX.bottom}`);
        let removed=0;
        for(const gid of list){
          if(await isBotKicked(tgApi, gid)){
            await removeFromList(gid);
            removed++;
          }
        }
        return await ctx.telegram.sendMessage(chatId, `${BOX.top}\n│ ✅ CLEAN DONE │\n│ 🗑️ Removed Kicked: ${removed}\n│ Active Groups Only থাকবে!\n${BOX.bottom}`);
      }
      if(sub==="showkicked" || sub==="kicked"){
        const tgApi = api || ctx.telegram;
        await ctx.telegram.sendMessage(chatId, `🔍 Checking ${list.length} Groups...`);
        let kicked=[];
        for(const gid of list){
          if(await isBotKicked(tgApi, gid)) kicked.push(gid);
        }
        if(kicked.length===0) return await ctx.telegram.sendMessage(chatId, `${BOX.top}\n│ ✅ No Kicked Groups!\n${BOX.bottom}`);
        let txt=`${BOX.top}\n│ 💀 KICKED ${kicked.length} │\n${BOX.line2}\n`;
        kicked.forEach((gid,i)=>{ txt+=`│ ${i+1}. ${gid}\n`; });
        txt+=`${BOX.line2}\n│ /approve clean = Delete All\n${BOX.bottom}`;
        return await ctx.telegram.sendMessage(chatId, txt);
      }
      if(sub==="help" || sub==="h"){
        return await ctx.telegram.sendMessage(chatId, `${BOX.top}\n│ 📖 APPROVE HELP V11.2 │\n${BOX.line2}\n│ /approve - Active Panel Only\n│ /approve remove ID - Delete 100%\n│ /approve clean - Delete Kicked\n│ /approve showkicked - Kicked List\n${BOX.bottom}`);
      }

      if(isG){
        if(sub==="unapprove"||sub==="off"||sub==="0"){
          list = await removeFromList(id);
          await ctx.telegram.sendMessage(chatId, `${BOX.top}\n│ ❌ 𝐆𝐑𝐎𝐔𝐏 𝐎𝐅 │\n${BOX.line2}\n│ 🆔 ${id}\n│ 📦 Total ON: ${list.length}\n${BOX.bottom}`);
          try{ await ctx.telegram.sendMessage(id, `${BOX.top}\n│ ❌ 𝐆𝐑𝐎𝐔𝐏 Apv OFF ❌ │\n${BOX.line2}\n│ এই গ্রুপটি Apv OFF করা হয়েছে!\n│ এখন থেকে বট কাজ করবে না!\n${BOX.bottom}`); }catch{}
          return;
        }
        if(!list.includes(id)){
          list.push(id);
          await saveList(list);
        } else {
          await global.db.Thread.findOneAndUpdate(
            { id: String(id) },
            { $set: { approved: true }, $unset: { leftAt: "", leftReason: "", reAddedAt: "", unapprovedTime: "" } },
            { upsert: true }
          ).catch(()=>{});
          if(global._noticeCache){ global._noticeCache.approved = list; global._noticeCache.time = Date.now(); }
        }
        await ctx.telegram.sendMessage(chatId, `${BOX.top}\n│ ✅ 𝐆𝐑𝐎𝐔𝐏 𝐎𝐍 │\n${BOX.line2}\n│ 🆔 ${id}\n│ 📦 Total ON: ${list.length}\n${BOX.bottom}`);
        try{ await ctx.telegram.sendMessage(id, `${BOX.top}\n│ ✅ 𝐆𝐑𝐎𝐔𝐏 𝐀𝐏𝐑𝐎𝐕𝐄𝐃 ✅ │\n${BOX.line2}\n│ অভিনন্দন! গ্রুপটি Apv ON হয়েছে!\n│ এখন থেকে বট কাজ করবে!\n${BOX.bottom}`); }catch{}
        return;
      }
      return await sendMainPanel(ctx,chatId,0,sub||"all");
    }catch(e){ await ctx.telegram.sendMessage(chatId, `Error: ${e.message}`).catch(()=>{}); }
  },
  onCallback: async function({event,ctx}){
    try{
      const data=event.data; const chatId=event.message.chat.id;
      try{ await ctx.answerCbQuery().catch(()=>{}); }catch{}
      let list=await getList();
      if(data==="approve_back"){
        const v=global.approveView[chatId]||{page:0,filter:"all"};
        return await sendMainPanel(ctx,chatId,v.page,v.filter,event.message.message_id);
      }
      if(data==="approve_clean_kicked"){
        let removed=0;
        for(const gid of list){
          if(await isBotKicked(ctx.telegram, gid)){
            await removeFromList(gid);
            removed++;
          }
        }
        await ctx.telegram.sendMessage(chatId, `✅ Cleaned ${removed} kicked groups - Refreshing!`).catch(()=>{});
        return await sendMainPanel(ctx,chatId,0,"all",event.message.message_id);
      }
      if(data.startsWith("approve_main_")){
        const p=data.replace("approve_main_","").split("_");
        return await sendMainPanel(ctx,chatId,parseInt(p[0])||0,p[1]||"all",event.message.message_id);
      }
      if(data.startsWith("approve_filter_")){
        return await sendMainPanel(ctx,chatId,0,data.replace("approve_filter_",""),event.message.message_id);
      }
      if(data.startsWith("approve_view_")){
        return await sendDetailPanel(ctx,chatId,data.replace("approve_view_",""),event.message.message_id);
      }
      if(data.startsWith("approve_toggle_")){
        const gid=data.replace("approve_toggle_","");
        const wasOn=list.includes(gid);
        if(wasOn){
          list = await removeFromList(gid);
          try{
            await ctx.telegram.sendMessage(gid,
              `${BOX.top}\n│ ❌ GROUP Apv OFF ❌ │\n${BOX.line2}\n│ এই গ্রুপটি এডমিন Apv OFF করেছে!\n│ বট এখন থেকে অফ থাকবে!\n${BOX.bottom}`
            );
          }catch(e){}
        }else{
          list.push(gid); await saveList(list);
          try{
            await ctx.telegram.sendMessage(gid,
              `${BOX.top}\n│ ✅ GROUP Apv ON ✅ │\n${BOX.line2}\n│ অভিনন্দন! গ্রুপটি Apv ON হয়েছে!\n│ বট এখন থেকে কাজ করবে!\n${BOX.line2}\n│ 💡 /help for commands\n${BOX.bottom}`
            );
          }catch(e){}
        }
        return await sendDetailPanel(ctx,chatId,gid,event.message.message_id);
      }
    }catch(e){ console.log(e); }
  }
};

async function getAllGroups(){
  try{
    let t=[];
    if(global.db?.Thread) t=await global.db.Thread.find({ id: { $regex: "^-" } }).lean();
    else if(global.db?.getAllThreads) t=await global.db.getAllThreads();
    const filtered = t.filter(x=>{
      const id = String(x.id||x.threadID);
      if(id === "-5558330798") return false;
      return id.startsWith("-");
    });
    return filtered.map(x=>({
      id: String(x.id||x.threadID),
      name: String(x.name||x.title||"Unknown"),
      members: x.memberCount||0
    }));
  }catch{ return []; }
}

async function sendMainPanel(ctx,chatId,page,filter,editId=null){
  const PER=6;
  let list=await getList();
  let groups=await getAllGroups();

  let activeGroups = [];
  let kickedCount = 0;
  for(const g of groups){
    try{
      const kicked = await isBotKicked(ctx.telegram, g.id);
      if(kicked){
        kickedCount++;
        continue;
      }
      activeGroups.push(g);
    }catch{
      activeGroups.push(g);
    }
  }

  if(activeGroups.length===0 && list.length>0){
    let temp = [];
    for(const id of list){
      try{
        if(!(await isBotKicked(ctx.telegram, id))){
          temp.push({id, name:`Group ${id.slice(-6)}`, members:0});
        }
      }catch{}
    }
    if(temp.length>0) activeGroups = temp;
  }

  let filtered=activeGroups;
  if(filter==="on"||filter==="approved") filtered=activeGroups.filter(g=>list.includes(g.id));
  if(filter==="off"||filter==="pending") filtered=activeGroups.filter(g=>!list.includes(g.id));
  const totalPages=Math.max(1,Math.ceil(filtered.length/PER));
  const safePage=Math.max(0,Math.min(page,totalPages-1));
  global.approveView[chatId]={page:safePage, filter};
  const pageGroups=filtered.slice(safePage*PER, (safePage+1)*PER);

  let txt=`${BOX.top}\n│ 🔐 APPROVE PANEL │\n${BOX.line2}\n│ 📊 Active: ${activeGroups.length} | Kicked Hidden: ${kickedCount}\n│ ✅ ON: ${activeGroups.filter(g=>list.includes(g.id)).length} | ❌ OFF: ${activeGroups.filter(g=>!list.includes(g.id)).length}\n│ 🔍 Filter: ${filter.toUpperCase()} | Page: ${safePage+1}/${totalPages}\n${BOX.line}\n\n`;
  if(filtered.length===0){ txt+=`📭 No groups in ${filter.toUpperCase()}!\n│ Kicked ${kickedCount} Hidden!\n\n`; }
  else{ pageGroups.forEach((g,i)=>{ const idx=safePage*PER+i+1; const on=list.includes(g.id); const dn=safeName(g.name,28); txt+=`${idx}. ${on?"✅ ON":"❌ OFF"} ─ ${dn}\n └─ 🆔 ${g.id}\n\n`; }); }
  txt+=`${BOX.bottom}`;

  let kb=[];
  kb.push([{text:filter==="all"?"● ALL":"○ ALL", callback_data:"approve_filter_all"}, {text:filter==="on"?"● ON":"○ ON", callback_data:"approve_filter_on"}, {text:filter==="off"?"● OFF":"○ OFF", callback_data:"approve_filter_off"}]);
  pageGroups.forEach(g=>{ const on=list.includes(g.id); const short=safeName(g.name,14); kb.push([{text:`${on?"✅":"❌"} ${short}`, callback_data:`approve_view_${g.id}`}]); });
  let nav=[];
  if(safePage>0) nav.push({text:"⬅️ Prev", callback_data:`approve_main_${safePage-1}_${filter}`});
  if(safePage<totalPages-1) nav.push({text:"Next ➡️", callback_data:`approve_main_${safePage+1}_${filter}`});
  if(nav.length) kb.push(nav);
  kb.push([{text:`🗑️ Clean Kicked (${kickedCount})`, callback_data:"approve_clean_kicked"}]);
  const opt={ reply_markup:{ inline_keyboard: kb } };
  try{ if(editId) await ctx.telegram.editMessageText(chatId,editId,null,txt,opt); else await ctx.telegram.sendMessage(chatId,txt,opt); }catch{ await ctx.telegram.sendMessage(chatId,txt,opt).catch(()=>{}); }
}

async function sendDetailPanel(ctx,chatId,gid,editId=null){
  let list=await getList();
  let groups=await getAllGroups();
  let g=groups.find(x=>x.id===gid);
  if(!g) g={id:gid, name:`Group ${gid.slice(-6)}`, members:0};
  try{ const chat=await ctx.telegram.getChat(gid).catch(()=>null); if(chat && chat.title) g.name=chat.title; }catch{}
  const isOn=list.includes(gid);
  const displayName=safeName(g.name, 35);
  let txt=`${BOX.top}\n│ 📋 GROUP DETAILS │\n${BOX.line2}\n│ 📛 Name: ${displayName}\n│ 🆔 ID: ${gid}\n│ 📊 Status: ${isOn?"✅ ON":"❌ OFF"}\n│ 👥 Members: ${g.members||"Unknown"}\n${BOX.bottom}`;
  try{ const k = await isBotKicked(ctx.telegram, gid); txt = txt.replace(BOX.bottom, `│ 🤖 Bot: ${k?"💀 KICKED - Hide":"✅ Active"}\n${BOX.bottom}`); }catch{}
  let kb=[[{text: isOn? "🔴 TURN OFF + Notice" : "🟢 TURN ON + Notice", callback_data:`approve_toggle_${gid}`}], [{text:"⬅️ Back to List", callback_data:"approve_back"}]];
  const opt={ reply_markup:{ inline_keyboard: kb } };
  try{ if(editId) await ctx.telegram.editMessageText(chatId,editId,null,txt,opt); else await ctx.telegram.sendMessage(chatId,txt,opt); }catch{ await ctx.telegram.sendMessage(chatId,txt,opt).catch(()=>{}); }
}