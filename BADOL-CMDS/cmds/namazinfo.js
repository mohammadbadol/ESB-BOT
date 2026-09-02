const path = require("path");
const fs = require("fs");

module.exports = {
  config: {
    name: "namazinfo",
    aliases: ["namazinf"],
    author: "MOHAMMAD BADOL",
    version: "3.0 BUTTON EDIT",
    role: 0,
    cooldown: 5,
    description: "Namaz info with button edit",
    category: "islamic",
    usePrefix: true
  },

  BADOL: async function({ api, event, chatId }) {
    const msg = `╭─━─━─╮
  🕌 নামাজের মেনু
╰─━─━─╯

👇 নিচের Button থেকে Select করো:

🚀 𝐄𝐒𝐁-𝐁𝐎𝐓`;

    const keyboard = {
      inline_keyboard: [
        [{ text: "🌅 ফজর", callback_data: "namazinfo_1" }, { text: "☀️ যোহর", callback_data: "namazinfo_2" }],
        [{ text: "🌤️ আসর", callback_data: "namazinfo_3" }, { text: "🌆 মাগরিব", callback_data: "namazinfo_4" }],
        [{ text: "🌙 এশা", callback_data: "namazinfo_5" }, { text: "🕌 জুম্মা", callback_data: "namazinfo_6" }],
        [{ text: "🤲 তাহাজ্জুদ", callback_data: "namazinfo_7" }],
        [{ text: "❌ Close", callback_data: "namazinfo_close" }]
      ]
    };

    await api.sendMessage(chatId, msg, { reply_markup: keyboard });
  },

  onCallback: async function({ event, api, ctx }) {
    const data = event.data; // callback_data
    const chatId = event.message.chat.id;
    const messageId = event.message.message_id;

    if (data === "namazinfo_close") {
      try {
        await ctx.deleteMessage();
      } catch {
        await api.deleteMessage(chatId, messageId).catch(()=>{});
      }
      return ctx.answerCbQuery("Closed!").catch(()=>{});
    }

    if (data === "namazinfo_back") {
      const msg = `╭─━─━─━─━─╮
  🕌 নামাজের মেনু
╰─━─━─╯

👇 নিচের Button থেকে Select করো:

🚀 𝐄𝐒𝐁-𝐁𝐎𝐓`;
      const keyboard = {
        inline_keyboard: [
          [{ text: "🌅 ফজর", callback_data: "namazinfo_1" }, { text: "☀️ যোহর", callback_data: "namazinfo_2" }],
          [{ text: "🌤️ আসর", callback_data: "namazinfo_3" }, { text: "🌆 মাগরিব", callback_data: "namazinfo_4" }],
          [{ text: "🌙 এশা", callback_data: "namazinfo_5" }, { text: "🕌 জুম্মা", callback_data: "namazinfo_6" }],
          [{ text: "🤲 তাহাজ্জুদ", callback_data: "namazinfo_7" }],
          [{ text: "❌ Close", callback_data: "namazinfo_close" }]
        ]
      };
      try {
        await ctx.editMessageText(msg, { reply_markup: keyboard }).catch(async()=>{
          await api.editMessageText(msg, { chat_id: chatId, message_id: messageId, reply_markup: keyboard }).catch(()=>{});
        });
      } catch {}
      await ctx.answerCbQuery().catch(()=>{});
      return;
    }

    // namazinfo_1 to 7
    const input = parseInt(data.split("_")[1]);
    if (isNaN(input) || input < 1 || input > 7) return ctx.answerCbQuery("Invalid!").catch(()=>{});

    const filePath = path.join(__dirname, "BADOL", `namaz${input}.json`);

    if (!fs.existsSync(filePath)) {
      return ctx.answerCbQuery(`File namaz${input}.json Not Found!`, true).catch(()=>{});
    }

    try {
      const fileData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      let replyMsg = `╭─━─━─━─━─╮\n 🕋 নামাজের নিয়মাবলি\n╰─━─━─━─━─╯\n\n`;
      fileData.forEach(step => {
        replyMsg += `📌 [ ${step.title} ]\n`;
        replyMsg += `• কাজ: ${step.details}\n`;
        replyMsg += `• পাঠ: ${step.recitation}\n`;
        replyMsg += `• অর্থ: ${step.meaning}\n`;
        replyMsg += `• সময়: ${step.times}\n`;
        replyMsg += `─────────────────────\n`;
      });
      replyMsg += `\n✅ সম্পূর্ণ হয়েছে।`;

      const backKeyboard = {
        inline_keyboard: [
          [{ text: "🔙 Back to Menu", callback_data: "namazinfo_back" }],
          [{ text: "❌ Close", callback_data: "namazinfo_close" }]
        ]
      };

      // ✅ EDIT SYSTEM - setting.js এর মত
      try {
        await ctx.editMessageText(replyMsg, { reply_markup: backKeyboard });
      } catch {
        await api.editMessageText(replyMsg, { chat_id: chatId, message_id: messageId, reply_markup: backKeyboard }).catch(()=>{});
      }

      await ctx.answerCbQuery().catch(()=>{});

    } catch (e) {
      console.log(e);
      await ctx.answerCbQuery("❌ JSON Read Error!", true).catch(()=>{});
    }
  }
};