const path = require("path");
const fs = require("fs");

function getAllSuraData() {
  let allData = [];
  // sura1.json থেকে sura10.json পর্যন্ত Load
  for (let i = 1; i <= 10; i++) {
    const filePath = path.join(__dirname, "BADOL", `quran${i}.json`);
    if (fs.existsSync(filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        // যদি File Array হয়
        if (Array.isArray(data)) {
          allData = allData.concat(data);
        } else {
          // যদি Object হয়
          allData.push(data);
        }
      } catch (e) {
        console.log(`Error reading sura${i}.json`, e.message);
      }
    }
  }
  // Sorting by number
  allData.sort((a,b) => (a.number||0) - (b.number||0));
  return allData;
}

function buildSuraText(surah) {
  let msg = `╭─❏ 📖 সূরা: ${surah.name}\n`;
  const limit = Math.min(surah.arabic? surah.arabic.length : 0, 3);
  for (let i = 0; i < limit; i++) {
    msg += `\n│ ✨ আয়াত ${i + 1}: ${surah.arabic[i] || ""}`;
    msg += `\n│ 🗣️ উচ্চারণ: ${surah.pronunciation[i] || ""}`;
    msg += `\n│ 💎 অর্থ: ${surah.meaning[i] || ""}\n`;
  }
  msg += `╰──────────────\n🚀 𝐄𝐒𝐁-𝐓𝐄𝐀𝐌`;
  return msg;
}

function getMenuKeyboard(data, page = 0) {
  const perPage = 30;
  const start = page * perPage;
  const end = Math.min(start + perPage, data.length);
  const slice = data.slice(start, end);

  let buttons = [];
  let row = [];
  slice.forEach((s) => {
    row.push({ text: `${s.number}. ${s.name}`, callback_data: `sura_${s.number}` });
    if (row.length === 3) {
      buttons.push(row);
      row = [];
    }
  });
  if (row.length > 0) buttons.push(row);

  let nav = [];
  if (page > 0) nav.push({ text: "⬅️ Prev", callback_data: `sura_page_${page-1}` });
  if (end < data.length) nav.push({ text: "Next ➡️", callback_data: `sura_page_${page+1}` });
  if (nav.length > 0) buttons.push(nav);

  buttons.push([{ text: "❌ Close", callback_data: "sura_close" }]);
  return { inline_keyboard: buttons };
}

module.exports = {
  config: {
    name: "sura",
    aliases: ["quran"],
    author: "MOHAMMAD BADOL",
    version: "3.0 10-JSON SUPPORT",
    role: 0,
    cooldown: 5,
    description: "Quran 10 JSON merge with button edit",
    category: "islamic",
    usePrefix: true
  },

  BADOL: async function({ api, chatId, args }) {
    const quranData = getAllSuraData();
    if (!quranData || quranData.length === 0) return api.sendMessage(chatId, "❌ কোনো ডাটা পাওয়া যায়নি!\n📁 Check: BADOL-CMDS/cmds/BADOL/quran1.json - quran10.json");

    if (args && args.length > 0 &&!isNaN(args[0])) {
      const num = parseInt(args[0]);
      const surah = quranData.find(s => s.number === num);
      if (!surah) return api.sendMessage(chatId, "❌ এই সূরার নাম্বারটি লিস্টে নেই।");
      const keyboard = {
        inline_keyboard: [
          [{ text: "🔙 Back", callback_data: "sura_page_0" }],
          [{ text: "❌ Close", callback_data: "sura_close" }]
        ]
      };
      return api.sendMessage(chatId, buildSuraText(surah), { reply_markup: keyboard });
    }

    const msg = `╭─❏ 📖 𝐄𝐒𝐁-𝐓𝐄𝐀𝐌\n│ 🕌 কুরআনুল কারীম (${quranData.length} টা সূরা লোড):\n╰──────────────\n👇 Button থেকে Select করো:`;
    const keyboard = getMenuKeyboard(quranData, 0);
    await api.sendMessage(chatId, msg, { reply_markup: keyboard });
  },

  onCallback: async function({ event, api, ctx }) {
    const data = event.data;
    const quranData = getAllSuraData();
    if (!quranData || quranData.length === 0) return ctx.answerCbQuery("No Data!", true).catch(()=>{});

    if (data === "sura_close") {
      try { await ctx.deleteMessage(); } catch { await api.deleteMessage(event.message.chat.id, event.message.message_id).catch(()=>{}); }
      return ctx.answerCbQuery().catch(()=>{});
    }

    if (data.startsWith("sura_page_")) {
      const page = parseInt(data.split("_")[2]);
      const msg = `╭─❏ 📖 𝐄𝐒𝐁-𝐓𝐄𝐀𝐌\n│ 🕌 কুরআনুল কারীম - Page ${page+1}\n╰──────────────\n👇 Button থেকে Select করো:`;
      const keyboard = getMenuKeyboard(quranData, page);
      try { await ctx.editMessageText(msg, { reply_markup: keyboard }); } catch {}
      return ctx.answerCbQuery().catch(()=>{});
    }

    if (data.startsWith("sura_")) {
      const num = parseInt(data.split("_")[1]);
      const surah = quranData.find(s => s.number === num);
      if (!surah) return ctx.answerCbQuery("Not Found!", true).catch(()=>{});
      const keyboard = {
        inline_keyboard: [
          [{ text: "🔙 Back", callback_data: `sura_page_${Math.floor((quranData.findIndex(s=>s.number===num))/30)}` }],
          [{ text: "❌ Close", callback_data: "sura_close" }]
        ]
      };
      try { await ctx.editMessageText(buildSuraText(surah), { reply_markup: keyboard }); } catch {}
      return ctx.answerCbQuery().catch(()=>{});
    }
  }
};