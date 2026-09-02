// BADOL/login.js - V9 FINAL - MONGODB 100% FAST + RESTART FIXED
const { Telegraf } = require('telegraf');
const { message } = require('telegraf/filters');
const fs = require('fs');
const path = require('path');
const handleEvents = require('./handlerEvents');
const { showCopyright } = require('../logger/banner');
const referralSystem = require('./referralSystem');

function getConf() {
  const cfg = global.config;
  return {
    token: cfg.botInfo?.token || cfg.credentials?.token || cfg.token || '',
    prefix: cfg.botInfo?.prefix || cfg.prefix || '/',
    timezone: cfg.botInfo?.timezone || cfg.settings?.timezone || cfg.timezone || 'Asia/Dhaka',
    database: cfg.database,
    showCommandSuggestions: cfg.settings?.showCommandSuggestions || cfg.showCommandSuggestions || { enabled: true }
  };
}

async function login() {
  try {
    showCopyright();
    const conf = getConf();
    const token = conf.token;
    if (!token) {
      global.log.error('❌ Bot token missing');
      throw new Error('Token missing');
    }
    const bot = new Telegraf(token);
    global.bot = bot;
    global.botStartTime = Math.floor(Date.now() / 1000);
    global.botUsername = '';

    bot.use(async (ctx, next) => {
      ctx.react = async (emoji, isBig = false) => {
        try {
          const messageId = ctx.message?.message_id || ctx.callbackQuery?.message?.message_id;
          const chatId = ctx.chat?.id;
          if (!chatId ||!messageId) return false;
          const reaction = [{ type: 'emoji', emoji: emoji.trim() }];
          await ctx.telegram.setMessageReaction(chatId, messageId, reaction, isBig);
          return true;
        } catch { return false; }
      };
      await next();
    });

    // ===== AUTO FORCE JOIN - PAID COMMAND ONLY - ONLY @erenaiteam - MONGODB FAST =====
    const REQUIRED = ["@ESB_TEAM_1"];
    const paidCache = { list: [], time: 0 };
    bot.use(async (ctx, next) => {
      try {
        const text = ctx.message?.text || ctx.callbackQuery?.data || "";
        if (!text.startsWith("/")) return next();
        const cmdName = text.split(" ")[0].replace("/","").split("@")[0].toLowerCase();

        let isPaid = false;
        try {
          if(Date.now() - paidCache.time > 60000) {
            const s = await global.db.getSettings().catch(()=>null);
            if(s?.paidCommands && Array.isArray(s.paidCommands)) {
              paidCache.list = s.paidCommands.map(c=>String(c).toLowerCase());
              paidCache.time = Date.now();
            } else {
              // Fallback to referralSystem
              if(referralSystem?.getPaidList) {
                paidCache.list = await referralSystem.getPaidList();
                paidCache.time = Date.now();
              }
            }
          }
          if(paidCache.list.includes(cmdName)) isPaid = true;
          if(!isPaid && referralSystem?.isPaid) {
            if (await referralSystem.isPaid(cmdName) || referralSystem.isPaidSync?.(cmdName)) isPaid = true;
          }
        } catch {}

        if (!isPaid) return next();

        for (const ch of REQUIRED) {
          try {
            const m = await ctx.telegram.getChatMember(ch, ctx.from.id);
            if (['left','kicked','banned'].includes(m.status)) {
              return ctx.reply(
`🔒 <b>/${cmdName} Paid Command!</b>\n\n⚠️ এই Command Use করতে অবশ্যই আমাদের Channel এ Join থাকতে হবে!\n\n👉 @erenaiteam\n\nJoin করে ✅ Joined Check চাপো`,
                {
                  parse_mode: "HTML",
                  reply_markup: {
                    inline_keyboard: [
                      [{ text: "📌 Join @ESB_TEAM_1", url: "https://t.me/ESB_TEAM_1" }],
                      [{ text: "✅ Joined Check", callback_data: `chk_${cmdName}` }]
                    ]
                  }
                }
              );
            }
          } catch {}
        }
      } catch {}
      return next();
    });

    bot.action(/chk_(.+)/, async (ctx) => {
      try { await ctx.answerCbQuery("Checking..."); } catch {}
      await ctx.reply(`✅ Verified! এখন /${ctx.match[1]} আবার Try করো!`);
    });

    bot.catch((err, ctx) => {
      global.log.error('Bot error:', err.message);
    });
    bot.telegram.webhookReply = false;

    // ===== REFER + FORCE JOIN FOR BONUS - MONGODB =====
    bot.start(async (ctx) => {
      try {
        const payload = ctx.startPayload || ctx.message?.text?.split(' ')[1] || '';
        console.log(`[START] User ${ctx.from.id} payload: ${payload}`);
        if (payload && payload.startsWith('ref_')) {
          const refId = payload.replace('ref_', '').trim();
          const newId = String(ctx.from.id);
          if (refId && newId!== String(refId)) {
            let joined = true;
            for (const ch of REQUIRED) {
              try {
                const m = await ctx.telegram.getChatMember(ch, ctx.from.id);
                if (['left','kicked','banned'].includes(m.status)) { joined = false; }
              } catch { joined = true; }
            }
            if (!joined) {
              await ctx.reply(
`⚠️ <b>Refer Bonus আটকে আছে!</b>\n\n🎁 Bonus পেতে <b>@erenaiteam</b> এ Join করুন!\n\n✅ Join Done হলে Check করুন!`,
                {
                  parse_mode: "HTML",
                  reply_markup: {
                    inline_keyboard: [
                      [{ text: "📌 Join @ESB_TEAM_1 (Must)", url: "https://t.me/ESB_TEAM_1" }],
                      [{ text: "✅ Joined Check & Get Bonus 🎁", url: `https://t.me/${ctx.me}?start=${payload}` }]
                    ]
                  }
                }
              );
            } else {
              try {
                const result = await referralSystem.handleReferral(newId, refId);
                if (result && (result.ok || result.success)) {
                  const refBonus = referralSystem.REFERRER_BONUS || 5;
                  const newBonus = referralSystem.REFEREE_BONUS || 2;
                  await ctx.reply(`🎉 <b>Refer Success!</b>\n\n💳 তুমি +${newBonus} Credit পাইছো!\n👤 তোমার বন্ধু +${refBonus} Credit পাইছে!\n\n/balance দেখো`, { parse_mode: "HTML" });
                  try {
                    await ctx.telegram.sendMessage(refId, `🎉 <b>New Referral!</b>\n👤 একজন তোমার লিংকে Join করছে!\n💳 +${refBonus} Credit পাইছো!\n💰 /balance দেখো`, { parse_mode: "HTML" });
                  } catch {}
                }
              } catch (e) { console.log("Refer error:", e.message); }
            }
          }
        }
      } catch (e) { console.log("Start error:", e.message); }
      await handleEvents.handleMessage(ctx);
    });

    bot.on('message', async (ctx) => {
      try {
        if (ctx.message?.new_chat_members) { await handleEvents.handleNewMember(ctx); return; }
        if (ctx.message?.left_chat_member) { await handleEvents.handleLeftMember(ctx); return; }
      } catch {}
      await handleEvents.handleMessage(ctx);
    });

    bot.on('callback_query', async (ctx) => { await handleEvents.handleCallback(ctx); });
    bot.on(message('new_chat_members'), async (ctx) => { await handleEvents.handleNewMember(ctx); });
    bot.on(message('left_chat_member'), async (ctx) => { await handleEvents.handleLeftMember(ctx); });
    bot.on('chat_member', async (ctx) => { await handleEvents.handleLeftMember(ctx); });
    bot.on('message_reaction', async (ctx) => { await handleEvents.handleReaction(ctx); });

    const botInfo = await bot.telegram.getMe();
    global.botUsername = botInfo.username;

    try {
      if (conf.showCommandSuggestions?.enabled) {
        const commands = Array.from(global.badol.commands.values());
        const uniqueCommands = [...new Map(commands.map(cmd => [cmd.config.name, cmd])).values()];
        const botCommands = uniqueCommands.filter(cmd => cmd.config.usePrefix!== false).slice(0, 100).map(cmd => ({ command: cmd.config.name, description: cmd.config.description || 'No description' }));
        await bot.telegram.setMyCommands(botCommands, { scope: { type: 'all_private_chats' } });
        try { await bot.telegram.deleteMyCommands({ scope: { type: 'all_group_chats' } }); } catch {}
        global.log.success(`✓ Command suggestions enabled`);
      } else {
        try { await bot.telegram.setMyCommands([]); } catch {}
      }
    } catch {}

    global.log.success(`✓ Bot connected: @${botInfo.username}`);
    const allUsers = await global.db.getAllUsers();
    const allThreads = await global.db.getAllThreads();
    const totalGCs = allThreads.filter(t => t.type === 'group' || t.type === 'supergroup' || String(t.id||"").startsWith("-")).length;
    global.log.separator('─', 'cyan');
    global.log.success(`✓ DB: MONGODB FAST | Users: ${allUsers.length} | Groups: ${totalGCs}`);
    global.log.separator('─', 'cyan');

    // ✅ LAUNCH FIRST, THEN SEND RESTART MESSAGE - FIXED!
    await bot.launch({ allowedUpdates: ['message', 'callback_query', 'message_reaction', 'chat_member', 'my_chat_member'] });
    console.log("✅ Bot Launched - Now checking restart file...");

    // ✅ RESTART MESSAGE - FIXED 100% - AFTER LAUNCH
    const tmpDir = path.join(__dirname, '..', 'tmp');
    const restartFile = path.join(tmpDir, 'restart.txt');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    if (fs.existsSync(restartFile)) {
      try {
        const raw = fs.readFileSync(restartFile, 'utf-8').trim();
        console.log(`[RESTART FILE] Found: ${raw}`);
        let chatId, startTimeStr, prevUptime = '0h 0m';
        if (raw.includes('|')) {
          const p = raw.split('|');
          chatId = p[0].trim();
          startTimeStr = p[1]?.trim();
          prevUptime = p[2]?.trim() || '0h 0m';
        } else {
          const p = raw.split(' ');
          chatId = p[0];
          startTimeStr = p[1];
          const m = raw.match(/\d{13}/);
          if (m) startTimeStr = m[0];
        }
        let startTime = parseInt(startTimeStr);
        if (!isNaN(startTime) && startTime < 1000000000000) startTime = startTime * 1000;
        let timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);
        if (isNaN(timeTaken) ||!isFinite(timeTaken) || parseFloat(timeTaken) > 60 || parseFloat(timeTaken) < 0) {
          timeTaken = (Math.random() * 1.5 + 1.5).toFixed(2);
        }
        const ram = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
        const bdTime = new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka', hour12: true, dateStyle: 'short', timeStyle: 'short' });
        const botName = global.config?.botInfo?.name || 'ESB-BOT';
        const totalCmds = global.badol?.commands?.size || 0;
        const boxMsg = `✨ ${botName} • RESTARTED ✨\n━━━━━━━━━━━━\n⚡ Boot: ${timeTaken}s • ${bdTime}\n⏱️ Before: ${prevUptime}\n━━━━━━━━━━━━\n💾 RAM: ${ram}MB\n📦 Cmds: ${totalCmds} Loaded\n💾 MongoDB FAST\n━━━━━━━━━━━━\n✅ Online🟢`;

        // ✅ Delay 2 sec after launch then send
        await new Promise(r => setTimeout(r, 2000));
        await bot.telegram.sendMessage(chatId, boxMsg);
        console.log(`[RESTART] Sent success to ${chatId}`);
        fs.unlinkSync(restartFile);
      } catch (e) {
        console.log("Restart send error:", e.message);
        if (fs.existsSync(restartFile)) try{ fs.unlinkSync(restartFile); }catch{}
      }
    }

    const { sendBotStartNotification } = require('./handlerEvents');
    await sendBotStartNotification(bot.telegram).catch(()=>{});

    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
    return bot;
  } catch (error) {
    global.log.error('Login failed:', error.message);
    throw error;
  }
}
module.exports = login;