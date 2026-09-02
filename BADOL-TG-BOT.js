const fs = require('fs');
const path = require('path');
const express = require('express');
const axios = require('axios');

const app = express();

app.get("/", (req, res) => {
  res.status(200).send("BADOL-TG-BOT IS ONLINE 🚀 MONGODB 100% FAST");
});
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});
app.get("/uptime", (req, res) => {
  const uptime = process.uptime();
  res.status(200).json({
    status: "ok",
    uptime: Math.floor(uptime),
    message: "BADOL-TG-BOT is alive - MONGODB FAST"
  });
});
const EXTRA_PORT = process.env.PORT ? Number(process.env.PORT) + 1 : 3000;
app.listen(EXTRA_PORT, "0.0.0.0", () => {
  console.log(`🌐 Extra Server running on port ${EXTRA_PORT}`);
});

const { showBanner } = require('./logger/banner');
const Logger = require('./logger/logs');
const c = require('./logger/color');
const autoload = require('./BADOL/autoload');
const login = require('./BADOL/login');

const LOCK_NAME = "MOHAMMAD BADOL";
const LOCK_ID = "6954597258";

const ALL_OWNERS = [
  { name: "MOHAMMAD BADOL", id: "6954597258" },
  { name: "EMON HAWLADAR", id: "5079311859" }
];
const ALL_OWNER_IDS = ALL_OWNERS.map(o => String(o.id));

const GBAN_RAW_URL = 'https://raw.githubusercontent.com/BADOL-VAI/BADOL-VAI/refs/heads/main/Badol-tg-bot-global-ban.json';

// ✅ FAST CACHE SYSTEM
if(!global._fastCache) global._fastCache = {
  thread: new Map(), // chatId -> { data, time }
  gban: { list: [], time: 0 },
  user: new Map()
};
const THREAD_CACHE_TIME = 30 * 1000; // 30 sec
const GBAN_CACHE_TIME = 5 * 60 * 1000; // 5 min

global.badol = {
  commands: new Map(),
  events: new Map(),
  onReply: new Map(),
  onReaction: new Map(),
  onCallback: new Map(),
  cooldowns: new Map(),
  threadAdmins: new Map(),
  messageTracker: {
    data: new Map(),
    add: function(t, u) { this.data.set(`${t}_${u}`, (this.data.get(`${t}_${u}`) || 0) + 1); },
    get: function(t, u) { return this.data.get(`${t}_${u}`) || 0; }
  }
};

global.commands = global.badol.commands;
global.events = global.badol.events;
global.onReply = global.badol.onReply;
global.onReaction = global.badol.onReaction;
global.onCallback = global.badol.onCallback;
global.cooldowns = global.badol.cooldowns;
global.threadAdmins = global.badol.threadAdmins;
global.messageTracker = global.badol.messageTracker;

global.config = require('./config.json');
global.utils = require('./BADOL/util.js');
global.fs = fs;
global.path = path;

if (global.config.botInfo) {
  global.config.token = global.config.botInfo.token;
  global.config.prefix = global.config.botInfo.prefix;
  global.config.botName = global.config.botInfo.name;
  global.config.timezone = global.config.botInfo.timezone;
  global.config.usePrefix = global.config.botInfo.usePrefix;
}
if (global.config.ownerInfo) {
  global.config.adminUID = global.config.ownerInfo.botAdmins;
  const mOwners = global.config.ownerInfo.mainOwner;
  if (Array.isArray(mOwners)) {
    global.config.ownerName = mOwners.map(o => o.name).join(" & ");
  } else {
    global.config.ownerName = mOwners.name;
  }
}

const log = new Logger(global.config.timezone || 'Asia/Dhaka');
global.log = log;

try {
  require("./BADOL/autoUptime.js");
} catch (e) {
  console.log("AutoUptime load error:", e.message);
}

function checkAuthorIntegrity() {
  const mainOwners = global.config.ownerInfo?.mainOwner;
  const ownerArray = Array.isArray(mainOwners) ? mainOwners : [mainOwners];
  const lockExists = ownerArray.some(o => String(o.id) === LOCK_ID && o.name === LOCK_NAME);
  if (!lockExists) {
    console.clear();
    console.log(c.red('=================================================='));
    console.log(c.red(`⛔ SECURITY ERROR: Main Lock Owner ${LOCK_NAME} (${LOCK_ID}) not found!`));
    console.log(c.red('Bot will not run without main owner.'));
    console.log(c.red('=================================================='));
    process.exit(1);
  }
}

// ✅ FIXED - CACHED GBAN - FAST
async function isGloballyBanned(userId) {
  try {
    const now = Date.now();
    if (now - global._fastCache.gban.time < GBAN_CACHE_TIME && global._fastCache.gban.list.length > 0) {
      return global._fastCache.gban.list.includes(String(userId));
    }
    const response = await axios.get(GBAN_RAW_URL, { timeout: 3000 });
    const bannedUsers = response.data.bannedList || [];
    global._fastCache.gban = { list: bannedUsers.map(String), time: now };
    console.log(`[GBAN] Loaded ${bannedUsers.length} banned users - Cached 5min`);
    return bannedUsers.includes(String(userId));
  } catch (e) {
    return false;
  }
}

// ✅ CACHED getThread
async function getThreadCached(chatId) {
  const now = Date.now();
  const cached = global._fastCache.thread.get(String(chatId));
  if (cached && now - cached.time < THREAD_CACHE_TIME) {
    return cached.data;
  }
  const thread = await global.db.getThread(chatId).catch(()=>null);
  if (thread) global._fastCache.thread.set(String(chatId), { data: thread, time: now });
  return thread;
}

async function initDatabase() {
  const MongoDatabase = require('./database/mongodb');
  global.db = new MongoDatabase();
  const uri = global.config.database?.uriMongodb || process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    log.error('❌ MONGODB URI Missing!');
    process.exit(1);
  }
  await global.db.connect(uri);
  log.success('✅ Connected to MongoDB Atlas - 100% MONGODB FAST MODE');
}

global.loadCommands = autoload.loadCommands;
global.loadEvents = autoload.loadEvents;
global.unloadCommand = autoload.unloadCommand;
global.unloadEvent = autoload.unloadEvent;
global.reloadCommand = autoload.reloadCommand;
global.reloadEvent = autoload.reloadEvent;
global.deleteCommandFile = autoload.deleteCommandFile;
global.deleteEventFile = autoload.deleteEventFile;
global.installCommandFile = autoload.installCommandFile;
global.installEventFile = autoload.installEventFile;

async function startBot() {
  showBanner();
  log.separator('═', 'cyan');
  log.info(`Starting ${c.bright(c.cyan('BADOL-TG-BOT v2.0 MONGODB FAST'))}...`);
  log.separator('═', 'cyan');
  
  checkAuthorIntegrity();
  if (!global.config.token || global.config.token.includes("ADD YOUR")) {
    log.error('Bot token not found in botInfo.token!');
    process.exit(1);
  }

  await sleep(500);
  log.info('Loading MongoDB database...');
  await initDatabase();
  const allUsers = await global.db.getAllUsers();
  const allThreads = await global.db.getAllThreads();
  const totalGCs = allThreads.filter(t => t.type === 'group' || t.type === 'supergroup' || String(t.id||"").startsWith("-")).length;
  log.success(`Loaded ${c.bright(allUsers.length)} users and ${c.bright(totalGCs)} groups from MongoDB`);
  log.separator();
  log.info('Loading commands from BADOL-CMDS/cmds...');
  const cmdResult = await autoload.loadCommands(true);
  log.success(`Loaded ${c.bright(cmdResult.loaded.length)} commands`);
  log.separator();
  log.info('Loading events from BADOL-CMDS/events...');
  const eventResult = await autoload.loadEvents(true);
  log.success(`Loaded ${c.bright(eventResult.loaded.length)} events`);
  log.separator('═', 'cyan');

  if (global.config.dashBoard?.enable) {
    try {
      const createServer = require('./dashboard/server');
      await createServer();
      log.success(`Dashboard running on port ${global.config.dashBoard.port}`);
    } catch (e) { log.error('Dashboard failed:', e.message); }
  }

  log.info('Connecting to Telegram...');
  const bot = await login();
  global.bot = bot;
  global.botUsername = bot.botInfo?.username || "ErenAi1Bot";

  try {
    for (const [, cmd] of global.badol.commands || []) {
      if (cmd?.onLoad && typeof cmd.onLoad === "function") {
        try {
          await cmd.onLoad.call(cmd, { api: bot, bot });
        } catch (e) {
          log.error(`onLoad error (${cmd.config?.name}):`, e.message);
        }
      }
    }
  } catch (e) {
    log.error("onLoad batch error:", e.message);
  }

  // ✅ FIX 1: AUTO OFF ON LEAVE + FAST SAVE
  bot.use(async (ctx, next) => {
    try{
      if(ctx.update?.my_chat_member){
        const chatId = String(ctx.update.my_chat_member.chat.id);
        const newStatus = ctx.update.my_chat_member.new_chat_member?.status;
        const oldStatus = ctx.update.my_chat_member.old_chat_member?.status;
        
        if(['left','kicked','banned'].includes(newStatus) && chatId.startsWith("-")){
          await global.db.updateThread(chatId, { approved: false, leftAt: Date.now(), leftReason: newStatus }).catch(()=>{});
          global._fastCache.thread.delete(chatId);
          console.log(`[AUTO-OFF] Bot ${newStatus} ${chatId} - OFF`);
        }
        if(['member','administrator'].includes(newStatus) && ['left','kicked','banned'].includes(oldStatus) && chatId.startsWith("-")){
          await global.db.updateThread(chatId, { approved: false, leftAt: null, reAddedAt: Date.now(), leftReason: '' }).catch(()=>{});
          global._fastCache.thread.delete(chatId);
          console.log(`[RE-ADD-OFF] Bot Re-Added ${chatId} - OFF`);
        }
      }
      if(ctx.message?.left_chat_member){
        const left = ctx.message.left_chat_member;
        const botId = bot.botInfo?.id;
        if(botId && String(left.id) === String(botId)){
          const chatId = String(ctx.chat.id);
          await global.db.updateThread(chatId, { approved: false, leftAt: Date.now(), leftReason: "left" }).catch(()=>{});
          global._fastCache.thread.delete(chatId);
          console.log(`[AUTO-OFF] Bot Left ${chatId} - OFF`);
        }
      }
    }catch{}
    // ✅ FAST - Don't wait, background save
    if (global.db?.ensureUserAndThread) {
      if(Math.random() < 0.2) { // Only 20% messages save user - super fast
        global.db.ensureUserAndThread(ctx).catch(()=>{});
      }
    }
    return next();
  });

  // ✅ FIX 2: SUPER FAST APPROVAL - CACHED
  bot.use(async (ctx, next) => {
    try{
      const msg = ctx.message || ctx.editedMessage;
      if(!msg) return next();
      const chatId = String(msg.chat?.id || "");
      if(!chatId.startsWith("-")) return next();
      
      const text = (msg.text || msg.caption || "").trim();
      const rawCmd = text.split(' ')[0] || "";
      let cmd = rawCmd.toLowerCase().replace('/','').split('@')[0];
      if(!cmd) return next();
      
      const allowCmds = ["approve","apv","gcapprove","gapprove","approval","gclist","group","setting","request","req","start"];
      if(allowCmds.includes(cmd)) return next();
      
      const thread = await getThreadCached(chatId);
      if(!thread || thread.approved !== true){
        console.log(`[FORCE BLOCK] ${chatId} | ${cmd} | approved=${thread?.approved}`);
        await ctx.reply(`╭━❮ Eren-AI ❯━╮\n├‣ ❌ NOT APPROVED\n├‣ 📛 Group: ${(msg.chat.title||"This Group").slice(0,20)}\n├‣ 🆔 ID: ${chatId.slice(-8)}\n├‣ ⚠️ Approval Needed!\n├‣ 👑 Contact: @B4D9L_007 @M9U_007\n╰━━━━━━━━━━━━╯`).catch(()=>{});
        return;
      }
    }catch(e){ console.log("Force Approval Error", e.message); }
    return next();
  });

  // ✅ FIX 3: GBAN - CACHED + FAST
  bot.on('message', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    if (ALL_OWNER_IDS.includes(String(userId))) return;
    if (global._fastCache.gban.list.length === 0) return; // If not loaded yet, skip check for speed
    if (global._fastCache.gban.list.includes(String(userId))) {
      return ctx.reply(
        `┏━━━〔 🚨 GBAN ALERT 🚨 〕━━━┓\n` +
        `┃ 🤬 বেশি বাল পাকনামি করিস!\n` +
        `┃ 📌 বট থেকে ব্লক!\n` +
        `┗━━━━━━━━━━━━━━━━━━━━━━┛`
      );
    }
  });

  // ✅ Preload GBAN in background
  isGloballyBanned("0").catch(()=>{});

  log.success(`BADOL-TG-BOT is now FAST! © ${ALL_OWNERS.map(o=>o.name).join(" & ")}`);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
process.on('unhandledRejection', (e) => { console.error('💥 UNHANDLED:', e); });
process.on('uncaughtException', (e) => { console.error('🔥 UNCAUGHT:', e); });
startBot().catch(e => { console.error('❌ START BOT ERROR:', e); process.exit(1); });
module.exports = { autoload };