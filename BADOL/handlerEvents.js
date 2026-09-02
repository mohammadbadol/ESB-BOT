//✅ BADOL/handlerEvents.js - V13 MONGODB FAST FIXED - NO FS
const { MessageUtils } = require('./util');
const notices = require("./notices");
const referralSystem = require("./referralSystem");

const ALWAYS_EMOJIS = ["👍","❤️","😆","🔥","✨","🥰","😍","🤩","😎","🥳","😂","🤣","🥺","😘","🫶","💖","🎉","😮"];

if (!global._gcmdCache) global._gcmdCache = { data: {}, time: 0 };
if (!global._lockCache) global._lockCache = { data: [], time: 0 };
if (!global._adminOnlyCache) global._adminOnlyCache = { enabled: false, time: 0 };

const CACHE_TIME = 20 * 1000; // 20 sec cache

async function getGroupCommands() {
  try {
    if (Date.now() - global._gcmdCache.time < CACHE_TIME && global._gcmdCache.data) {
      return global._gcmdCache.data;
    }
    if (global.db?.Thread) {
      const threads = await global.db.Thread.find({ groupCommands: { $exists: true } }).lean();
      let obj = {};
      threads.forEach(t => { if(t.groupCommands) obj[t.id] = t.groupCommands; });
      global._gcmdCache = { data: obj, time: Date.now() };
      return obj;
    }
    return {};
  } catch { return global._gcmdCache.data || {}; }
}

async function isGroupCommandAllowed(chatId, cmdName) {
  try {
    const all = await getGroupCommands();
    const gid = String(chatId);
    if (!all[gid]) return true;
    const data = all[gid];
    if (data.mode!== "whitelist") return true;
    let low = String(cmdName).toLowerCase();
    if (global.badol && global.badol.commands) {
      const direct = global.badol.commands.get(low);
      if (direct) low = direct.config.name.toLowerCase();
      else {
        for (const [_, c] of global.badol.commands) {
          if (c.config.aliases && c.config.aliases.map(a=>a.toLowerCase()).includes(low)) {
            low = c.config.name.toLowerCase();
            break;
          }
        }
      }
    }
    const specials = ["welcome","leave","antilink","spammute","spam","autoreact","alwaysemoji","adminonly"];
    if (specials.includes(String(cmdName).toLowerCase())) low = String(cmdName).toLowerCase();
    return data.enabled.map(c=>c.toLowerCase()).includes(low);
  } catch { return true; }
}

async function isCommandLocked(cmdName, cmdObj = null){
  try {
    let locked = [];
    if (Date.now() - global._lockCache.time < CACHE_TIME) {
      locked = global._lockCache.data;
    } else {
      const s = await global.db.getSettings().catch(()=>null);
      locked = (s?.lockedCommands || []).map(c=>String(c).toLowerCase());
      global._lockCache = { data: locked, time: Date.now() };
    }
    if(locked.length === 0) return false;
    const low = cmdName.toLowerCase();
    if(locked.includes(low)) return true;
    if(cmdObj){
      const mainName = cmdObj.config.name.toLowerCase();
      if(locked.includes(mainName)) return true;
      if(cmdObj.config.aliases){
        for(const al of cmdObj.config.aliases){
          if(locked.includes(al.toLowerCase())) return true;
        }
      }
    }
    if(global.badol && global.badol.commands){
      const directCmd = global.badol.commands.get(low);
      if(directCmd && locked.includes(directCmd.config.name.toLowerCase())) return true;
      for(const [_, c] of global.badol.commands){
        if(c.config.aliases && c.config.aliases.map(a=>a.toLowerCase()).includes(low)){
          if(locked.includes(c.config.name.toLowerCase())) return true;
        }
      }
    }
    return false;
  } catch { return false; }
}

async function getAdminOnlyMode(){
  try {
    if(Date.now() - global._adminOnlyCache.time < CACHE_TIME) return global._adminOnlyCache.enabled;
    const s = await global.db.getSettings().catch(()=>null);
    const enabled = s?.adminOnlyMode === true;
    global._adminOnlyCache = { enabled, time: Date.now() };
    return enabled;
  } catch { return false; }
}

function getConfig(key, defaultValue = null) {
  const cfg = global.config;
  if (!cfg) return defaultValue;
  if (key === 'botName') return cfg.botInfo?.name || cfg.botName || defaultValue;
  if (key === 'prefix') return cfg.botInfo?.prefix || cfg.prefix || '/';
  if (key === 'timezone') return cfg.botInfo?.timezone || cfg.settings?.timezone || cfg.timezone || 'Asia/Dhaka';
  if (key === 'ownerName') {
    const mainOwner = cfg.ownerInfo?.mainOwner;
    if (Array.isArray(mainOwner)) {
      return mainOwner.map(o => o.name).join(" & ") || defaultValue;
    }
    return mainOwner?.name || cfg.ownerName || defaultValue;
  }
  if (key === 'adminUID') {
    const botAdmins = cfg.ownerInfo?.botAdmins || cfg.adminUID || [];
    const mainOwners = cfg.ownerInfo?.mainOwner;
    let ownerIds = [];
    if (Array.isArray(mainOwners)) ownerIds = mainOwners.map(o => String(o.id));
    else if (mainOwners?.id) ownerIds = [String(mainOwners.id)];
    return [...new Set([...botAdmins.map(String),...ownerIds])];
  }
  return cfg[key]?? defaultValue;
}

async function getSettings() {
  const cfg = global.config || {};
  const st = cfg.settings || {};
  const dbSettings = await global.db.getSettings().catch(()=> ({})) || {};

  const adminOnlyMode = dbSettings.adminOnlyMode === true || st.adminOnlyMode === true || st.onlyAdmin === true;
  const groupApprovalEnabled = dbSettings.groupApprovalEnabled!== false && st.groupApprovalEnabled!== false;
  const dmApprovalEnabled = dbSettings.dmApprovalEnabled === true || st.dmApprovalEnabled === true;
  const maintenanceEnabled = dbSettings.maintenanceEnabled === true || st.maintenanceEnabled === true;
  const cooldownEnabled = dbSettings.cooldownEnabled!== false && st.cooldownEnabled!== false;
  const prefixMode = dbSettings.prefixModeEnabled === true || st.prefixModeEnabled || cfg.prefixModeEnabled || false;

  return {
    prefixMode: prefixMode,
    maintenance: maintenanceEnabled,
    groupApproval: groupApprovalEnabled,
    dmApproval: dmApprovalEnabled,
    adminOnly: adminOnlyMode,
    banSystem: st.banSystemEnabled!== false && st.banSystem?.enabled!== false,
    cooldown: cooldownEnabled,
    autoReact: st.autoReactionEnabled!== false && st.autoReaction?.enabled!== false,
    alwaysEmoji: st.alwaysEmojiEnabled!== false && st.alwaysEmoji?.enabled!== false,
    welcome: st.welcomeMessageEnabled!== false && st.welcome?.enabled!== false,
    leave: st.leaveMessageEnabled!== false && st.leave?.enabled!== false,
    adminUnsend: st.adminReactionUnsend?.enabled || cfg.adminReactionUnsend?.enabled || false,
    adminUnsendEmoji: st.adminReactionUnsend?.emoji || cfg.adminReactionUnsend?.emoji || '👍',
    ignoreOld: st.ignoreOldMessages?.enabled || cfg.ignoreOldMessages?.enabled || false,
    antiSpam: st.antiSpamEnabled || false,
  };
}

async function sendBotStartNotification(api) {
  try {
    const moment = require('moment-timezone');
    const timezone = getConfig('timezone', 'Asia/Dhaka');
    const startTime = moment().tz(timezone).format('DD MMM YYYY | hh:mm:ss A');
    let totalUsers = 0; let totalGroups = 0;
    try {
      const allUsers = await global.db.getAllUsers();
      const allThreads = await global.db.getAllThreads();
      totalUsers = allUsers.length;
      totalGroups = allThreads.filter(t => String(t.id||t.threadID||"").startsWith("-")).length;
    } catch (_) {}
    const cmdCount = global.badol.commands? [...new Map([...global.badol.commands].map(([_, v]) => [v.config.name, v])).values()].length : 0;
    const evtCount = global.badol.events? global.badol.events.size : 0;
    const line = '━━━━━━━━━━━━━━━━━━━━━━━━';
    const botName = getConfig('botName', 'ESB-BOT');
    const ownerName = getConfig('ownerName', 'B4D9L & EM9N');
    const msg = `🚀 ${botName} চালু হয়েছে!\n${line}\n✅ স্ট্যাটাস : Online FAST\n⏰ সময় : ${startTime}\n${line}\n📦 কমান্ড : ${cmdCount} টি\n📡 ইভেন্ট : ${evtCount} টি\n👥 ইউজার : ${totalUsers} জন\n💬 গ্রুপ : ${totalGroups} টি\n${line}\n👑 ওনার : ${ownerName}`;
    const adminUID = getConfig('adminUID', []);
    if (adminUID?.length > 0) {
      for (const adminId of adminUID) {
        try { await api.sendMessage(adminId, msg); } catch {}
      }
    }
  } catch (e) {}
}

async function fetchChatAdmins(ctx, chatId) {
  try {
    if (global.badol.threadAdmins.has(chatId)) {
      const cached = global.badol.threadAdmins.get(chatId);
      if (cached.timestamp && Date.now() - cached.timestamp < 300000) return cached.admins;
    }
    const admins = await ctx.telegram.getChatAdministrators(chatId);
    const adminIds = admins.map(a => a.user.id);
    global.badol.threadAdmins.set(chatId, { admins: adminIds, timestamp: Date.now() });
    return adminIds;
  } catch { return []; }
}

async function handleMessage(ctx) {
  try {
    const msg = ctx.message || ctx.editedMessage;
    if (!msg) return;
    try{
      if(msg.migrate_to_chat_id){
        const oldId = String(msg.chat.id);
        const newId = String(msg.migrate_to_chat_id);
        const oldThread = await global.db.getThread(oldId).catch(()=>null);
        if(oldThread){
          await global.db.updateThread(newId, {...oldThread, id: newId, approved: oldThread.approved===true });
          try{ if(global.db.deleteThread) await global.db.deleteThread(oldId); }catch{}
          global._gcmdCache.time = 0;
          console.log(`[MIGRATION] ${oldId} -> ${newId} Migrated`);
        }
      }
      if(msg.migrate_from_chat_id){
        const oldId = String(msg.migrate_from_chat_id);
        const newId = String(msg.chat.id);
        const oldThread = await global.db.getThread(oldId).catch(()=>null);
        if(oldThread){
          await global.db.updateThread(newId, {...oldThread, id: newId, approved: oldThread.approved===true });
          try{ if(global.db.deleteThread) await global.db.deleteThread(oldId); }catch{}
          global._gcmdCache.time = 0;
          console.log(`[MIGRATION] ${oldId} -> ${newId} Migrated`);
        }
      }
    }catch{}
    const st = await getSettings();
    const hasContent = msg.text || msg.caption || msg.photo || msg.video || msg.audio || msg.voice || msg.document || msg.sticker || msg.new_chat_members || msg.left_chat_member;
    if (!hasContent) return;
    if (st.ignoreOld && global.botStartTime) {
      if (msg.date < global.botStartTime) return;
    }
    global.bot = ctx.telegram;
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if(String(chatId).startsWith("-")){
      try{
        const text = (msg.text || msg.caption || "").trim();
        const raw = text.split(' ')[0] || "";
        let cmd = raw.toLowerCase().replace('/','').split('@')[0];
        const ALLOW = ["approve","apv","gcapprove","gapprove","approval","gclist","group","setting","request","req","start"];
        if(cmd &&!ALLOW.includes(cmd)){
          const thread = await global.db.getThread(String(chatId)).catch(()=>null);
          if(!thread || thread.approved!== true){
            console.log(`[KILL BLOCK] ${chatId} | ${cmd} | BLOCKED`);
            await ctx.reply(`╭━❮ ESB-TEAM ❯━╮\n├‣ ❌ NOT APPROVED\n├‣ 📛 Group: ${(msg.chat.title||"This Group").slice(0,20)}\n├‣ 🆔 ID: ${String(chatId).slice(-8)}\n├‣ ⚠️ Approval Needed!\n├‣ 👑 Contact Owner!\n╰━━━━━━━━━━━━╯`, { reply_markup: { inline_keyboard: [[{text:"👑 B4D9L", url:"https://t.me/B4D9L_007"}, {text:"👑 EMON", url:"https://t.me/EMONHAWLADAR"}], [{text:"🤖 ESB-BOT", url:"https://t.me/ESBTEAMBOT"}]] } }).catch(()=>{});
            return;
          }
        }
      }catch(e){}
    }

    let messageText = (msg.text || msg.caption || '').trim();
    const firstWord = messageText.trim().split(' ')[0] || '';
    if (firstWord.startsWith('/') && firstWord.includes('@')) {
      const mentionedBotRaw = firstWord.split('@')[1]?.toLowerCase() || "";
      const mentionedBot = mentionedBotRaw.split(/[^a-z0-9_]/)[0];
      const myBotFromConfig = (global.botUsername || global.config?.botInfo?.username || ctx.botInfo?.username || "ESBTEAMBOT").toLowerCase().replace('@','');
      const myBot = myBotFromConfig.split(/[^a-z0-9_]/)[0];
      if (mentionedBot && mentionedBot!== myBot) return;
      messageText = messageText.replace(/@\S+/i, '').trim();
    }
    let noticeCheck;
    noticeCheck = notices.checkAdminOnly(userId);
    if (noticeCheck.blocked) {
      if (!noticeCheck.silent && noticeCheck.msg) {
        if (noticeCheck.keyboard) await ctx.telegram.sendMessage(chatId, noticeCheck.msg, { reply_markup: noticeCheck.keyboard }).catch(()=>{});
        else await ctx.reply(noticeCheck.msg).catch(()=>{});
      }
      return;
    }
    noticeCheck = notices.checkMaintenance(userId);
    if (noticeCheck.blocked) {
      if (!noticeCheck.silent && noticeCheck.msg) {
        if (noticeCheck.keyboard) await ctx.telegram.sendMessage(chatId, noticeCheck.msg, { reply_markup: noticeCheck.keyboard }).catch(()=>{});
        else await ctx.reply(noticeCheck.msg).catch(()=>{});
      }
      return;
    }
    if (st.autoReact && st.alwaysEmoji) {
      const needAutoReact = await isGroupCommandAllowed(chatId, "autoreact") && await isGroupCommandAllowed(chatId, "alwaysemoji");
      if (needAutoReact) {
        (async () => {
          try {
            const emoji = ALWAYS_EMOJIS[Math.floor(Math.random()*ALWAYS_EMOJIS.length)];
            if (ctx.react) await ctx.react(emoji).catch(()=>{});
            else await ctx.telegram.setMessageReaction(chatId, msg.message_id, [{ type: "emoji", emoji }]).catch(()=>{});
          } catch {}
        })();
      }
    }
    if (st.antiSpam) {
      if (!global.spamMap) global.spamMap = new Map();
      const now = Date.now();
      const key = String(userId);
      const data = global.spamMap.get(key) || { count: 0, firstTime: now };
      if (now - data.firstTime < 4000) {
        data.count++;
        if (data.count > 6) return;
      } else { data.count = 1; data.firstTime = now; }
      global.spamMap.set(key, data);
    }
    let prefix = getConfig('prefix', '/');
    try {
      const dbS = await global.db.getSettings().catch(()=>null);
      const customPrefixAllowed = global.config.settings?.allowCustomPrefix || global.config.allowCustomPrefix;
      if (customPrefixAllowed && chatId) {
        const thread = await global.db.getThread(String(chatId)).catch(()=>null);
        if (thread?.customPrefix) prefix = thread.customPrefix;
      }
      if(dbS?.prefixModeEnabled) {
        if (!global.config.settings) global.config.settings = {};
        global.config.settings.prefixModeEnabled = true;
      }
    } catch {}
    const _rawCmd = (messageText.trim().split(' ')[0] || '').toLowerCase().replace('/','').split('@')[0];
    const _isRequestCmd = ["request","req","appeal"].includes(_rawCmd);
    if (st.banSystem) {
      if (!_isRequestCmd && global.isGlobalBanned && global.isGlobalBanned(userId, chatId)) {
        return ctx.reply(global.getBanNotice? global.getBanNotice() : "⛔ Globally Banned!").catch(()=>{});
      }
      const banCheck = await notices.checkBan({ api: ctx.telegram, chatId, userId, text: messageText, prefix, event: msg });
      if (banCheck.blocked &&!_isRequestCmd) return;
    }
    if (global.badol.events) {
      const message = new MessageUtils(ctx);
      const detectedEventType = detectEventType(ctx);
      for (const [_, event] of global.badol.events) {
        if (detectedEventType === 'new_member' &&!st.welcome) continue;
        if (detectedEventType === 'left_member' &&!st.leave) continue;
        if ((msg.chat.type === 'group' || msg.chat.type === 'supergroup') && event.config?.name) {
          if (event.config.name!== "gcmd" &&!(await isGroupCommandAllowed(chatId, event.config.name))) continue;
        }
        const eventTypeMatches = event.config.eventType === detectedEventType || (event.config.eventType === 'message' && detectedEventType === 'message') || event.config.eventType === 'all';
        if (eventTypeMatches && event.BADOL) {
          try { await event.BADOL.call(event, { event: msg, api: ctx.telegram, message, ctx, eventType: detectedEventType }); } catch {}
        }
      }
    }
    if (global.badol.commands) {
      const messageUtil = new MessageUtils(ctx);
      const seen = new Set();
      for (const [_, cmd] of global.badol.commands) {
        if (!cmd.config || seen.has(cmd.config.name)) continue;
        seen.add(cmd.config.name);
        if ((msg.chat.type === 'group' || msg.chat.type === 'supergroup') && cmd.config?.name) {
          if (cmd.config.name!== "gcmd" && cmd.config.name!== "setting" &&!(await isGroupCommandAllowed(chatId, cmd.config.name))) continue;
        }
        if (typeof cmd.onChat === 'function') {
          try {
            await cmd.onChat.call(cmd, {
              bot: ctx.telegram, api: ctx.telegram, message: messageUtil, msg, chatId, userId,
              args: messageText.split(' '), db: global.db, ctx, event: msg
            });
          } catch {}
        }
      }
    }
    if (!msg.from) return;
    if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') await fetchChatAdmins(ctx, chatId);
    if (msg.reply_to_message && msg.reply_to_message.from.is_bot) {
      const replyData = global.badol.onReply.get(msg.reply_to_message.message_id);
      if (replyData) {
        const command = global.badol.commands.get(replyData.commandName);
        if (command?.onReply) { try { await command.onReply.call(command, { event: msg, api: ctx.telegram, Reply: replyData, args: messageText.split(' '), message: new MessageUtils(ctx), ctx }); } catch {} return; }
      }
    }
    const message = new MessageUtils(ctx);
    global.message = message;
    let commandName = ''; let args = []; let isCommand = false; let isCommandAttempt = false;
    const isPrefixModeOn = global.config.settings?.prefixModeEnabled === true || global.config.prefixModeEnabled === true;
    if (isPrefixModeOn) {
      const rawParts = messageText.trim().split(' ');
      let potentialCommand = rawParts[0].toLowerCase().split('@')[0];
      let isWithPrefix = false;
      if (potentialCommand.startsWith(prefix)) { isWithPrefix = true; potentialCommand = potentialCommand.slice(prefix.length).toLowerCase().split('@')[0]; }
      const command = global.badol.commands.get(potentialCommand);
      if (command) { commandName = potentialCommand; args = rawParts.slice(1); if (isWithPrefix) { const pParts = messageText.slice(prefix.length).trim().split(' '); args = pParts.slice(1); } isCommand = true; isCommandAttempt = true; }
      else if (isWithPrefix && potentialCommand) { commandName = potentialCommand; isCommandAttempt = true; }
    } else {
      if (messageText.startsWith(prefix)) {
        const parts = messageText.slice(prefix.length).trim().split(' ');
        let potentialCommand = parts[0].toLowerCase().split('@')[0];
        commandName = potentialCommand; args = parts.slice(1); isCommandAttempt = true;
        const command = global.badol.commands.get(commandName);
        if (command) { const usePrefix = command.config.usePrefix!== undefined? command.config.usePrefix : (global.config.botInfo?.usePrefix?? global.config.usePrefix); if (usePrefix) isCommand = true; }
      }
      if (!isCommand && messageText &&!messageText.startsWith(prefix)) {
        const parts = messageText.trim().split(' ');
        let potentialCommand = parts[0].toLowerCase().split('@')[0];
        const command = global.badol.commands.get(potentialCommand);
        if (command) { const usePrefix = command.config.usePrefix!== undefined? command.config.usePrefix : (global.config.botInfo?.usePrefix?? global.config.usePrefix); if (!usePrefix) { commandName = potentialCommand; args = parts.slice(1); isCommand = true; } }
      }
    }
    if (commandName &&!isCommand) {
      const command = global.badol.commands.get(commandName);
      if (!command && isCommandAttempt) {
        const nf = notices.getNotFoundNotice(commandName, prefix);
        if (typeof nf === 'object' && nf.msg) {
          if (nf.keyboard) await ctx.telegram.sendMessage(chatId, nf.msg, { reply_markup: nf.keyboard }).catch(()=>{});
          else await message.reply(nf.msg);
        } else {
          await message.reply(nf);
        }
        return;
      }
    }
    if (commandName) {
      const command = global.badol.commands.get(commandName);
      if(commandName!== "lockfile" && commandName!== "lockcmd" && commandName!== "cmdlock"){
        if(await isCommandLocked(commandName, command)){
          return await ctx.reply(`🔒 Command "${commandName}" is Locked! 🔒\n\n⛔ This command + All Aliases Locked by Owner!\nUse /lockfile to unlock!`).catch(()=>{});
        }
      }
      const OWNER_IDS = ["6954597258", "5079311859"];
      const isOwner = OWNER_IDS.includes(String(userId));
      if (command && command.config.name!== "refer" &&!isOwner) {
        try {
          const realName = referralSystem.getRealName(command.config.name) || command.config.name;
          const paidCheckName = realName.toLowerCase();
          const currentCheckName = String(commandName).toLowerCase();
          const isPaid = await referralSystem.isPaid(paidCheckName) || await referralSystem.isPaid(currentCheckName) || referralSystem.isPaidSync?.(paidCheckName) || referralSystem.isPaidSync?.(currentCheckName);
          if (isPaid) {
            const check = await referralSystem.useCredit(userId, paidCheckName);
            if (!check.ok) {
              const botUser = global.botUsername || ctx.botInfo?.username || "ESBTEAMBOT";
              const link = `https://t.me/${botUser}?start=ref_${userId}`;
              return await ctx.reply(
`🔒 <b>${realName.toUpperCase()} LOCKED!</b>
━━━━━━━━━━━━
💳 Balance: 0 Credit
🔒 ${realName} + All Alias Lock

💡 <b>Credit শেষ!</b>
👥 1 Invite = 5 Credit
🔗 তোমার Link:
<code>${link}</code>

👉 Refer করে Credit নাও!
📌 Must Join: @erenaiteam`,
                { parse_mode: "HTML", disable_web_page_preview: true }
              ).catch(()=>{});
            }
          }
        } catch(e) { console.log("Credit check error:", e.message); }
      }
      if ((msg.chat.type === 'group' || msg.chat.type === 'supergroup') && command) {
        if (commandName!== "gcmd" && commandName!== "approve" && commandName!== "apv" && commandName!== "gcapprove" && commandName!== "approval" && commandName!== "gapprove" &&!(await isGroupCommandAllowed(chatId, commandName))){
          const approvalCheckEarly = await notices.checkGroupApproval(chatId, commandName, msg.chat?.title);
          if (approvalCheckEarly.blocked) {
            if (approvalCheckEarly.keyboard) await ctx.telegram.sendMessage(chatId, approvalCheckEarly.msg, { reply_markup: approvalCheckEarly.keyboard }).catch(()=>{});
            else if (!approvalCheckEarly.silent && approvalCheckEarly.msg) await ctx.reply(approvalCheckEarly.msg).catch(()=>{});
            return;
          }
          return;
        }
      }
      if (command) {
        const approvalCheck = await notices.checkGroupApproval(chatId, commandName, msg.chat?.title);
        if (approvalCheck.blocked) {
          if (approvalCheck.keyboard) await ctx.telegram.sendMessage(chatId, approvalCheck.msg, { reply_markup: approvalCheck.keyboard }).catch(()=>{});
          else if (!approvalCheck.silent && approvalCheck.msg) await ctx.reply(approvalCheck.msg).catch(()=>{});
          return;
        }
        const dmCheck = notices.checkDMApproval(userId, msg.chat.type, commandName);
        if (dmCheck.blocked) {
          if (!dmCheck.silent && dmCheck.msg) {
            if (dmCheck.keyboard) await ctx.telegram.sendMessage(chatId, dmCheck.msg, { reply_markup: dmCheck.keyboard }).catch(()=>{});
            else await ctx.reply(dmCheck.msg).catch(()=>{});
          }
          return;
        }
        const perm = notices.checkPermission({ command, userId, chatId });
        if (perm.blocked) {
          if (perm.silent) return;
          if (perm.keyboard) {
            await ctx.telegram.sendMessage(chatId, perm.msg, { reply_markup: perm.keyboard }).catch(()=>{});
          } else {
            return message.reply(perm.msg);
          }
          return;
        }
        const cd = notices.checkCooldown({ command, userId });
        if (cd.blocked) {
          if (cd.keyboard) {
            await ctx.telegram.sendMessage(chatId, cd.msg, { reply_markup: cd.keyboard }).catch(()=>{});
          } else {
            return message.reply(cd.msg);
          }
          return;
        }
        try {
          if (command.BADOL) {
            await command.BADOL.call(command, { event: msg, api: ctx.telegram, args, message, chatId, userId, ctx, db: global.db, telegram: ctx.telegram, bot: ctx.telegram });
            global.log.commandExecution(msg.from, msg.chat, commandName, true);
          }
        } catch (error) { global.log.commandExecution(msg.from, msg.chat, commandName, false, error.message); message.reply(`❌ Error: ${error.message}`); }
        return;
      }
    }
  } catch (error) { global.log.error('Error in handleMessage:', error); }
}

function detectEventType(ctx) {
  const msg = ctx.message || ctx.editedMessage || ctx.update;
  if (ctx.editedMessage) return 'message_edit'; if (ctx.channelPost) return 'channel_post'; if (ctx.messageReaction) return 'reaction'; if (ctx.callbackQuery) return 'callback_query'; if (msg?.new_chat_members || ctx.new_chat_members) return 'new_member'; if (msg?.left_chat_member || ctx.left_chat_member) return 'left_member'; return 'message';
}

async function handleCallback(ctx) {
  try {
    const query = ctx.callbackQuery;
    const data = query.data;
    if (!data) return;
    if (data.startsWith('request_approve_') || data.startsWith('request_reject_') || data.startsWith('approve_unban_') || data.startsWith('reject_unban_') || data.startsWith('approve_group_') || data.startsWith('reject_group_') || data.startsWith('approve_dm_') || data.startsWith('reject_dm_')) {
      if (data.startsWith('request_approve_') || data.startsWith('request_reject_') || data.startsWith('approve_unban_') || data.startsWith('reject_unban_')) {
        let requestId, action;
        if(data.startsWith('request_')){ const p = data.split('_'); action = p[1]; requestId = p.slice(2).join('_'); } else { const p = data.split('_'); action = p[0]; requestId = p.slice(2).join('_'); }
        try {
          let request = await global.db.getApproval?.(requestId).catch(()=>null);
          if (!request) { await ctx.answerCbQuery('❌ Request not found!').catch(()=>{}); return; }
          if (action === 'approve') {
            await global.db.unbanUser(String(request.userId)).catch(()=>{});
            try{ await global.db.removeApproval(requestId); }catch{}
            await ctx.editMessageText(`✅ Unban Approved!\n👤 ${request.name}\n🆔 ${request.userId}`).catch(()=>{});
            await ctx.answerCbQuery('✅ Approved & Unbanned!').catch(()=>{});
          } else {
            try{ await global.db.removeApproval(requestId); }catch{}
            await ctx.editMessageText(`❌ Request Rejected!\n👤 ${request.name}`).catch(()=>{});
            await ctx.answerCbQuery('❌ Rejected!').catch(()=>{});
          }
          return;
        } catch(e){}
      }
      if (data.startsWith('approve_group_') || data.startsWith('reject_group_')) {
        const parts = data.split('_'); const action = parts[0]; const approvalId = parts.slice(2).join('_'); const approval = await global.db.getApproval(approvalId);
        if (!approval) { await ctx.answerCbQuery('❌ Not found'); return; }
        if (action === 'approve') { await global.db.updateThread(approval.chatId, { approved: true }); await global.db.removeApproval(approvalId); await ctx.editMessageText(`✅ Group Approved!`); await ctx.answerCbQuery('✅ Approved!'); }
        else { await global.db.removeApproval(approvalId); await ctx.editMessageText(`❌ Rejected`); await ctx.answerCbQuery('❌ Rejected'); }
        return;
      }
      if (data.startsWith('approve_dm_') || data.startsWith('reject_dm_')) {
        const parts = data.split('_'); const action = parts[0]; const approvalId = parts.slice(2).join('_'); const approval = await global.db.getApproval(approvalId);
        if (!approval) { await ctx.answerCbQuery('❌ Not found'); return; }
        if (action === 'approve') { await global.db.updateUser(approval.userId, { dmApproved: true }); await global.db.removeApproval(approvalId); await ctx.editMessageText(`✅ DM Approved!`); await ctx.answerCbQuery('✅ Approved!'); }
        else { await global.db.banUser(approval.userId, 'rejected', String(query.from.id)); await global.db.removeApproval(approvalId); await ctx.editMessageText(`❌ Rejected & Banned`); await ctx.answerCbQuery('❌ Rejected'); }
        return;
      }
    }
    if (data.startsWith('spain_again_')) { const c = global.badol.commands.get('spain'); if (c?.onCallback) { await c.onCallback.call(c, { event: query, api: ctx.telegram, message: new MessageUtils(ctx), ctx }); return; } }
    if (data.startsWith('mj_btn_') || data.startsWith('niji_btn_')) { const n = data.startsWith('mj_btn_')? 'mj' : 'niji'; const c = global.badol.commands.get(n); if (c?.onCallback) { await c.onCallback.call(c, { event: query, api: ctx.telegram, message: new MessageUtils(ctx), ctx }); return; } }
    try {
      const allCmdNames = [...global.badol.commands.keys()];
      allCmdNames.sort((a,b) => b.length - a.length);
      for (const cmdName of allCmdNames) {
        if((cmdName === 'approve' || cmdName === 'request') && (data.startsWith('approve_unban_') || data.startsWith('reject_unban_') || data.startsWith('request_approve_') || data.startsWith('request_reject_'))) continue;
        if (data === cmdName || data.startsWith(cmdName + "_") || data.startsWith(cmdName + "-")) {
          const cmd = global.badol.commands.get(cmdName);
          if (cmd?.onCallback) { await cmd.onCallback.call(cmd, { event: query, api: ctx.telegram, message: new MessageUtils(ctx), ctx }); return; }
        }
      }
      for (const [_, cmd] of global.badol.commands) {
        if (cmd.config.aliases) {
          for (const alias of cmd.config.aliases) {
            if (data === alias || data.startsWith(alias + "_") || data.startsWith(alias + "-")) {
              if (cmd?.onCallback) { await cmd.onCallback.call(cmd, { event: query, api: ctx.telegram, message: new MessageUtils(ctx), ctx }); return; }
            }
          }
        }
      }
    } catch (e) {}
    const messageId = query.message?.message_id;
    if (messageId && global.badol.onCallback.has(messageId)) {
      const cbData = global.badol.onCallback.get(messageId);
      const command = global.badol.commands.get(cbData.commandName);
      if (command?.onCallback) { await command.onCallback.call(command, { event: query, api: ctx.telegram, message: new MessageUtils(ctx), ctx }); return; }
    }
    if (global.badol.onCallback.has(data)) {
      const cbData = global.badol.onCallback.get(data);
      let command = null;
      if (cbData.commandName) command = global.badol.commands.get(cbData.commandName);
      else if (cbData.path) command = global.badol.commands.get('fm');
      if (command?.onCallback) { await command.onCallback.call(command, { event: query, api: ctx.telegram, message: new MessageUtils(ctx), callbackData: cbData, ctx }); return; }
    }
    await ctx.answerCbQuery().catch(() => {});
  } catch (error) { console.error('Callback Error:', error); }
}

async function handleNewMember(ctx) {
  try{
    const mMsg = ctx.message || ctx.update?.message || {};
    const newMembers = mMsg?.new_chat_members || [];
    if(newMembers.length>0){
      const bot = await ctx.telegram.getMe().catch(()=>null);
      for(const m of newMembers){
        if(String(m.id)===String(bot?.id)){
          const gid = String(mMsg.chat?.id || "");
          if(gid.startsWith("-")){
            await global.db.updateThread(gid, {approved: false, reAddedAt: Date.now()}).catch(()=>{});
            global._gcmdCache.time = 0;
            console.log(`[RE-ADD OFF] ${gid} - Force OFF`);
          }
        }
      }
    }
  }catch(e){}
  try { const st = await getSettings(); if (!st.welcome) return; const msg = ctx.message || ctx.update?.message || ctx.update; const newMembers = msg?.new_chat_members || ctx.new_chat_members; if (!newMembers?.length) return; const message = new MessageUtils(ctx); if (global.badol.events) { for (const [_, event] of global.badol.events) { if (event.config.eventType === 'new_member' && event.BADOL) { try { if (msg.chat?.id &&!(await isGroupCommandAllowed(msg.chat.id, event.config.name))) continue; await event.BADOL.call(event, { event: msg, api: ctx.telegram, message, newMembers, ctx }); } catch {} } } } } catch (e) {}
}

async function handleLeftMember(ctx) {
  try {
    try{
      const update = ctx.update || {};
      const msg = ctx.message || update.message || update.edited_message || {};
      let leftMember = msg.left_chat_member || ctx.left_chat_member;
      if (!leftMember && update.chat_member) {
        const oldStatus = update.chat_member.old_chat_member?.status;
        const newStatus = update.chat_member.new_chat_member?.status;
        if (['left', 'kicked', 'banned'].includes(newStatus)) {
          leftMember = update.chat_member.new_chat_member?.user || update.chat_member.old_chat_member?.user;
        }
      }
      if(!leftMember && update.my_chat_member){
        const newStatus = update.my_chat_member.new_chat_member?.status;
        if(['left','kicked','banned'].includes(newStatus)){
          const chatId = String(update.my_chat_member.chat.id);
          try{
            await global.db.updateThread(chatId, { approved: false, unapprovedTime: Date.now(), leftAt: Date.now(), leftReason: newStatus });
            console.log(`[AUTO-OFF] Bot ${newStatus} in ${chatId} - Approval OFF`);
          }catch{}
          global._gcmdCache.time = 0;
          global._lockCache.time = 0;
          return;
        }
      }
      if(leftMember){
        const bot = await ctx.telegram.getMe().catch(()=>null);
        if(bot && String(leftMember.id) === String(bot.id)){
          const chatId = String(msg.chat?.id || update.chat_member?.chat?.id || ctx.chat?.id || "");
          if(chatId && chatId.startsWith("-")){
            try{
              await global.db.updateThread(chatId, { approved: false, unapprovedTime: Date.now(), leftAt: Date.now(), leftReason: "left" });
              console.log(`[AUTO-OFF] Bot Left ${chatId} - Approval OFF`);
            }catch{}
            global._gcmdCache.time = 0;
            global._lockCache.time = 0;
          }
        }
      }
    }catch(e){ console.log("Auto OFF Error", e.message); }
    const st = await getSettings();
    if (!st.leave) return;
    const update = ctx.update || {};
    const msg = ctx.message || update.message || update.edited_message || {};
    let leftMember = msg.left_chat_member || ctx.left_chat_member;
    if (!leftMember && update.chat_member) {
      const oldStatus = update.chat_member.old_chat_member?.status;
      const newStatus = update.chat_member.new_chat_member?.status;
      if (['left', 'kicked'].includes(newStatus) && ['member', 'administrator', 'restricted'].includes(oldStatus)) leftMember = update.chat_member.new_chat_member.user;
    }
    if (!leftMember) return;
    const message = new MessageUtils(ctx);
    if (global.badol.events) {
      for (const [_, event] of global.badol.events) {
        if (event.config.eventType === 'left_member' && event.BADOL) {
          try {
            if (msg.chat?.id &&!(await isGroupCommandAllowed(msg.chat.id, event.config.name))) continue;
            await event.BADOL.call(event, { event: Object.keys(msg).length > 0? msg : update.chat_member || ctx, api: ctx.telegram, message, leftMember, ctx });
          } catch {}
        }
      }
    }
  } catch (e) {}
}

async function handleReaction(ctx) { try { const reaction = ctx.messageReaction; if (!reaction) return; const st = await getSettings(); const messageId = reaction.message_id; const chatId = reaction.chat.id; const userId = reaction.user.id; if (st.adminUnsend) { const adminUID = getConfig('adminUID', []); const isAdmin = adminUID.includes(String(userId)); if (isAdmin && reaction.new_reaction?.length > 0) { const reactionEmojis = reaction.new_reaction.filter(r => r.type === 'emoji').map(r => r.emoji); if (reactionEmojis.includes(st.adminUnsendEmoji)) { try { await ctx.telegram.deleteMessage(chatId, messageId); return; } catch {} } } } if (global.badol.events) { for (const [_, event] of global.badol.events) { if (event.config.eventType === 'reaction' && event.BADOL) { try { await event.BADOL.call(event, { event: reaction, api: ctx.telegram, ctx }); } catch {} } } } } catch (error) {} }

module.exports = { handleMessage, handleCallback, handleNewMember, handleLeftMember, handleReaction, sendBotStartNotification, getSettings };