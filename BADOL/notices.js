// BADOL/notices.js - V13 MONGODB FAST FIXED - CACHED + NO FS
const LOCK_ID = "6954597258";
const ALL_OWNER_IDS = ["6954597258", "5079311859"];
const BOT_NAME = "ESB-BOT";
const OWNER1_NAME = "B4D9L";
const OWNER1_URL = "https://t.me/B4D9L_007";
const OWNER2_NAME = "EMON";
const OWNER2_URL = "https://t.me/EMONHAWLADAR";

if (!global._noticeCache) global._noticeCache = { approved: new Map(), adminOnly: false, time: 0, banCache: new Map() };
const CACHE_TIME = 20 * 1000; // 20 sec

function getConfig() {
  const cfg = global.config;
  if (!cfg) return { adminUID: [], onlyAdmin: false, prefix: '/', ownerName: BOT_NAME, ownerId: LOCK_ID, ownerIds: ALL_OWNER_IDS, botName: BOT_NAME, botUsername: "ESBTEAMBOT", bannedUsers: [], bannedGroups: [] };
  const mainOwner = cfg.ownerInfo?.mainOwner;
  let ownerIds = ALL_OWNER_IDS;
  let ownerId = LOCK_ID;
  if (Array.isArray(mainOwner)) {
    ownerIds = mainOwner.map(o => String(o.id));
    ownerId = String(mainOwner[0]?.id || LOCK_ID);
  } else if (mainOwner?.id) {
    ownerId = String(mainOwner.id);
    ownerIds = [ownerId];
  }
  const botAdmins = cfg.ownerInfo?.botAdmins || cfg.adminUID || [];
  const allAdmins = [...new Set([...botAdmins.map(String),...ownerIds.map(String)])];
  return {
    adminUID: allAdmins,
    ownerIds: ownerIds,
    prefix: cfg.botInfo?.prefix || cfg.prefix || '/',
    botName: cfg.botInfo?.name || BOT_NAME,
    ownerName: BOT_NAME,
    ownerId: ownerId,
    botUsername: cfg.botInfo?.username || "ESBTEAMBOT",
    bannedUsers: cfg.banSystem?.bannedUsers || [],
    bannedGroups: cfg.banSystem?.bannedGroups || []
  };
}

function getButtons(cfg){
  return { inline_keyboard: [[{text:`🤖 ${BOT_NAME}`, url:`https://t.me/${cfg.botUsername.replace('@','')}`}]] };
}
function getOwnerContactButtons(cfg){
  return { inline_keyboard: [[{text:`👑 ${OWNER1_NAME}`, url: OWNER1_URL},{text:`👑 ${OWNER2_NAME}`, url: OWNER2_URL}], [{text:`🤖 ${BOT_NAME}`, url:`https://t.me/${cfg.botUsername.replace('@','')}`}]] };
}
function safeName(str, len=20){
  try{
    if(!str) return "Unknown";
    str=String(str).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
    if(!str) return "Unknown";
    const arr=Array.from(str);
    if(arr.length>len) return arr.slice(0,len).join("")+"…";
    return arr.join("");
  }catch{ return "Group"; }
}
function isBotAdminCheck(userId) {
  const cfg = getConfig();
  const uid = String(userId);
  return cfg.adminUID.map(String).includes(uid) || cfg.ownerIds.map(String).includes(uid) || uid === LOCK_ID;
}

async function getApprovedGroups() {
  try {
    const now = Date.now();
    if(now - global._noticeCache.time < CACHE_TIME && global._noticeCache.approved.size > 0) {
      return [...global._noticeCache.approved.keys()];
    }
    if (global.db?.getAllThreads) {
      const all = await global.db.getAllThreads();
      const map = new Map();
      for (const t of all) {
        if (t.approved === true) {
          const id = String(t.id || t.threadID || t.threadId);
          if(id === "-5558330798") continue;
          if(t.leftAt || t.reAddedAt || t.leftReason) continue;
          map.set(id, true);
        }
      }
      global._noticeCache.approved = map;
      global._noticeCache.time = now;
      return [...map.keys()];
    }
    return [...global._noticeCache.approved.keys()] || [];
  } catch { return [...global._noticeCache.approved.keys()] || []; }
}

async function getAdminOnlyState() {
  try {
    if (Date.now() - global._noticeCache.time < 10000 && global._noticeCache.adminOnly!== undefined) return global._noticeCache.adminOnly;
    const s = await global.db.getSettings().catch(()=>null);
    const enabled = s?.adminOnlyMode === true;
    global._noticeCache.adminOnly = enabled;
    return enabled;
  } catch { return false; }
}
function getGroupApprovalEnabled(){ return true; }
function getDMApprovalEnabled() {
  const st = global.config?.settings || {};
  if (st.dmApprovalEnabled!== undefined) return st.dmApprovalEnabled === true;
  if (st.dmApproval && typeof st.dmApproval.enabled!== 'undefined') return st.dmApproval.enabled === true;
  return false;
}

// ✅ CACHED THREAD CHECK
async function getThreadCached(chatId) {
  const now = Date.now();
  const key = String(chatId);
  const cached = global._fastCache?.thread?.get(key);
  if(cached && now - cached.time < CACHE_TIME) return cached.data;

  const thread = await global.db.getThread(key).catch(()=>null);
  if(global._fastCache?.thread) global._fastCache.thread.set(key, { data: thread, time: now });
  return thread;
}

module.exports = {
  async checkBan({ api, chatId, userId, text, prefix, event }) {
    if (!userId) return { blocked: false };
    try {
      const cfg = getConfig();
      const uid = String(userId);
      const raw = String(text||"").trim().toLowerCase();
      let _cmd = raw.split(' ')[0] || "";
      if(_cmd.startsWith(prefix)) _cmd = _cmd.slice(prefix.length);
      if(_cmd.startsWith('/')) _cmd = _cmd.slice(1);
      if(_cmd.includes('@')) _cmd = _cmd.split('@')[0];
      if(["request","req","appeal"].includes(_cmd)) return { blocked: false };

      // ✅ CACHE BAN CHECK
      const now = Date.now();
      const banCached = global._noticeCache.banCache.get(uid);
      if(banCached && now - banCached.time < CACHE_TIME) {
        if(!banCached.isBanned) return { blocked: false };
      }

      if (cfg.bannedUsers.includes(uid)) {
        let reason = 'Violation';
        const msg = `╭━❮ ${BOT_NAME} ❯━╮\n├‣ ⛔ BANNED USER\n├‣ 📝 Reason: ${reason}\n├‣ 🚫 Status: Blocked\n├‣ 💡 Fix: ${prefix}request\n╰━━━━━━━━━━━━╯`;
        await api.sendMessage(chatId, msg, { reply_to_message_id: event.message_id, reply_markup: getOwnerContactButtons(cfg) }).catch(()=>{});
        return { blocked: true, silent: false };
      }
      if (global.db?.isUserBanned) {
        const isBanned = await global.db.isUserBanned(String(userId));
        global._noticeCache.banCache.set(uid, { isBanned, time: now });
        if (!isBanned) return { blocked: false };
        if (!text.startsWith(prefix) &&!text.startsWith('/')) return { blocked: true, silent: true };
        let reason = 'Violation';
        try{ const info = await global.db.getBanInfo?.(String(userId)) || {}; if(info.reason) reason = info.reason; }catch{}
        reason = reason.length > 20? reason.slice(0,20)+'..' : reason;
        const msg = `╭━❮ ${BOT_NAME} ❯━╮\n├‣ ⛔ BANNED USER\n├‣ 📝 Reason: ${reason}\n╰━━━━━━━━━━━━╯`;
        await api.sendMessage(chatId, msg, { reply_to_message_id: event.message_id, reply_markup: getOwnerContactButtons(cfg) }).catch(()=>{});
        return { blocked: true, silent: false };
      }
      return { blocked: false };
    } catch { return { blocked: false }; }
  },

  checkPermission({ command, userId, chatId }) {
    const cfg = getConfig();
    const uid = String(userId);
    const role = command.config.role || 0;
    const isOwner = cfg.ownerIds.map(String).includes(uid) || uid === LOCK_ID;
    if (command.config.name === "setting" || command.config.name === "adminonly") {
      // Skip adminonly check for setting itself to avoid loop
    } else {
      const onlyAdminEnabled = global._noticeCache.adminOnly === true;
      if (onlyAdminEnabled &&!cfg.adminUID.map(String).includes(uid) &&!isOwner) {
        return { blocked: true, silent: true, msg: null };
      }
    }
    if (role === 0) return { blocked: false };
    if (role === 2) {
      if (!isOwner) return { blocked: true, msg: `╭━❮ ${BOT_NAME} ❯━╮\n├‣ 👑 OWNER ONLY\n├‣ 🔐 Only Owner Access\n╰━━━━━━━━━━━━╯`, keyboard: getOwnerContactButtons(cfg) };
      return { blocked: false };
    }
    if (role === 1) {
      if (isOwner) return { blocked: false };
      if (cfg.adminUID.map(String).includes(uid)) return { blocked: false };
      try {
        if (chatId && global.badol?.threadAdmins?.has(String(chatId))) {
          const cached = global.badol.threadAdmins.get(String(chatId));
          if (cached?.admins?.map(String).includes(uid)) return { blocked: false };
          if (Array.isArray(cached) && cached.map(String).includes(uid)) return { blocked: false };
        }
      } catch {}
      return { blocked: true, msg: `╭━❮ ${BOT_NAME} ❯━╮\n├‣ 🔰 GROUP ADMIN ONLY\n├‣ 🛡️ Need Admin Power\n╰━━━━━━━━━━━━╯`, keyboard: getButtons(cfg) };
    }
    return { blocked: false };
  },

  checkCooldown({ command, userId }) {
    const st = global.config?.settings || {};
    const cooldownEnabled = st.cooldownEnabled!== false && st.cooldown?.enabled!== false;
    if (!cooldownEnabled) return { blocked: false };
    const cfg = getConfig();
    const key = `${userId}_${command.config.name}`;
    const now = Date.now();
    const amount = (command.config.cooldown || 0) * 1000;
    if (global.badol.cooldowns.has(key)) {
      const exp = global.badol.cooldowns.get(key) + amount;
      if (now < exp) {
        const left = ((exp-now)/1000).toFixed(1);
        return { blocked: true, msg: `╭━❮ ${BOT_NAME} ❯━╮\n├‣ ⏳ COOLDOWN: ${left}s\n├‣ 💤 Slow Down!\n╰━━━━━━━━━━━━╯`, keyboard: getButtons(cfg) };
      }
    }
    global.badol.cooldowns.set(key, now);
    setTimeout(()=>global.badol.cooldowns.delete(key), amount);
    return { blocked: false };
  },

  checkAdminOnly(userId) {
    const enabled = global._noticeCache.adminOnly === true;
    if (!enabled) return { blocked: false };
    if (!isBotAdminCheck(userId)) return { blocked: true, silent: true, msg: null };
    return { blocked: false };
  },

  checkMaintenance(userId) {
    const st = global.config?.settings || {};
    const enabled = st.maintenanceEnabled === true || st.maintenance?.enabled === true;
    if (!enabled) return { blocked: false };
    if (!isBotAdminCheck(userId)) return { blocked: true, silent: true, msg: null, keyboard: getButtons(getConfig()) };
    return { blocked: false };
  },

  async checkGroupApproval(chatId, commandName, chatTitle) {
    if (!String(chatId).startsWith("-")) return { blocked: false };
    const allowCmds = ["approve","apv","gcapprove","gapprove","approval","gclist","group","setting","request","req","start"];
    if (allowCmds.includes(String(commandName).toLowerCase())) return { blocked: false };

    try{
      const thread = await getThreadCached(String(chatId));
      if(!thread) {
        const displayName = safeName(chatTitle || "This Group", 20);
        const cfg = getConfig();
        const box = `╭━❮ ${BOT_NAME} ❯━╮\n├‣ ❌ NOT APPROVED\n├‣ 📛 Group: ${displayName}\n├‣ 🆔 ID: ${String(chatId).slice(-8)}\n├‣ ⚠️ Approval Needed!\n╰━━━━━━━━━━━━╯`;
        return { blocked: true, silent: false, msg: box, keyboard: getOwnerContactButtons(cfg) };
      }
      if(thread.reAddedAt || thread.leftAt || thread.leftReason){
        if(thread.approved === true){
          await global.db.updateThread(String(chatId), {approved: false}).catch(()=>{});
          if(global._fastCache?.thread) global._fastCache.thread.delete(String(chatId));
        }
        const displayName = safeName(chatTitle || "This Group", 20);
        const cfg = getConfig();
        const box = `╭━❮ ${BOT_NAME} ❯━╮\n├‣ ❌ NOT APPROVED (Re-Add)\n├‣ 📛 Group: ${displayName}\n├‣ 🆔 ID: ${String(chatId).slice(-8)}\n├‣ ⚠️ Re-Add Need Approval!\n╰━━━━━━━━━━━━╯`;
        return { blocked: true, silent: false, msg: box, keyboard: getOwnerContactButtons(cfg) };
      }
      if(thread.approved === true) return { blocked: false };
    }catch(e){}

    const displayName = safeName(chatTitle || "This Group", 20);
    const cfg = getConfig();
    const box = `╭━❮ ${BOT_NAME} ❯━╮\n├‣ ❌ NOT APPROVED\n├‣ 📛 Group: ${displayName}\n├‣ 🆔 ID: ${String(chatId).slice(-8)}\n├‣ ⚠️ Approval Needed!\n╰━━━━━━━━━━━━╯`;
    return { blocked: true, silent: false, msg: box, keyboard: getOwnerContactButtons(cfg) };
  },

  checkDMApproval(userId, chatType, commandName) {
    const enabled = getDMApprovalEnabled();
    if (!enabled) return { blocked: false };
    if (chatType!== 'private') return { blocked: false };
    const allowCmds = ["request","req","appeal","start"];
    if (!isBotAdminCheck(userId) &&!allowCmds.includes(commandName)) return { blocked: true, silent: true, msg: null };
    return { blocked: false };
  },

  getNotFoundNotice(commandName, prefix) {
    const cfg = getConfig();
    return { msg: `╭━❮ ${BOT_NAME} ❯━╮\n├‣ ❌ CMD NOT FOUND\n├‣ 🔍 "${commandName.slice(0,12)}"\n├‣ 💡 Try: ${prefix}help\n╰━━━━━━━━━━━━╯`, keyboard: getButtons(cfg) };
  },

  isBanSystemEnabled() {
    const st = global.config?.settings || {};
    return st.banSystemEnabled!== false && st.banSystem?.enabled!== false;
  },

  getAdminOnlyState, getGroupApprovalEnabled, getDMApprovalEnabled, getApprovedGroups
};