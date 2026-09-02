const fs = require('fs');
const path = require('path');

const fontPath = path.join(__dirname, 'BADOL', 'font.json');

function loadFonts() {
  try {
    const dir = path.dirname(fontPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(fontPath)) return {};
    return JSON.parse(fs.readFileSync(fontPath, 'utf8'));
  } catch (e) { return {}; }
}

const FONT_MAPS = loadFonts();

function styleText(text, styleId) {
  const data = FONT_MAPS[styleId];
  if (!data ||!data.map) return text;
  return [...text].map(ch => data.map[ch] || ch).join("");
}

function createList(page = 1) {
  const ids = Object.keys(FONT_MAPS);
  const perPage = 10;
  const totalPage = Math.ceil(ids.length / perPage);
  const start = (page - 1) * perPage;
  const slice = ids.slice(start, start + perPage);
  let msg = `╭━❮ FONT MENU ❯━╮\n├═━═━═━═━═━═━═━═━═━═\n`;
  msg += `├‣ Total: ${ids.length} • Page ${page}/${totalPage}\n`;
  msg += `├═━═━═━═━═━═━═━═━═━═\n`;
  slice.forEach(id => {
    const f = FONT_MAPS[id];
    msg += `├‣ ${id}. ${f.name}\n`;
    msg += `│ ${f.example}\n`;
  });
  msg += `╰━═━═━═━═━═━═━═━═━╯`;
  return { msg, totalPage };
}

module.exports = {
  config: {
    name: "font",
    aliases: ["fonts", "fancy"],
    author: "MOHAMMAD BADOL",
    version: "11.2-BOX-FIX",
    cooldown: 2,
    role: 0,
    description: "Box design + copy",
    category: "utility",
    usePrefix: true
  },
  BADOL: async function ({ event, api, args, message, chatId }) {
    const total = Object.keys(FONT_MAPS).length;
    if (total === 0) return message.reply(`BADOL/font.json পাওয়া যায়নি!`);

    if (!args[0] || args[0].toLowerCase() === "list") {
      const { msg, totalPage } = createList(1);
      const buttons = [];
      for (let i = 1; i <= Math.min(total, 10); i++) buttons.push(message.Markup.button.callback(`${i}`, `font_try_${i}_${chatId}`));
      const row1 = buttons.slice(0, 5);
      const row2 = buttons.slice(5, 10);
      const nav = totalPage > 1? [message.Markup.button.callback('Next →', `font_page_2_${chatId}`)] : [];
      const keyboard = message.Markup.inlineKeyboard([row1, row2, nav].filter(r => r.length > 0));
      try {
        for (let i = 1; i <= 20; i++) global.badol.onCallback.set(`font_try_${i}_${chatId}`, { commandName: 'font' });
        global.badol.onCallback.set(`font_page_2_${chatId}`, { commandName: 'font' });
      } catch {}
      return message.reply(msg, keyboard);
    }

    const styleId = args[0];
    const textToStyle = args.slice(1).join(" ");
    if (!FONT_MAPS[styleId]) return message.reply(`❌ ভুল ID! 1 থেকে ${total} পর্যন্ত।`);
    if (!textToStyle) return message.reply(`❌ টেক্সট দাও! যেমন: /font ${styleId} Badol`);
    const styled = styleText(textToStyle, styleId);

    // 🔥 তোর চাওয়া Box + Copy Fix
    const outMsg =
`╭━❮ ✨ ${FONT_MAPS[styleId].name} ❯━╮
├═━═━═━═━═━═━═━═━═━═
├‣ 📝 Input: ${textToStyle}
├═━═━═━═━═━═━═━═━═━═
├‣ 🎨 Output:
│
│ \`${styled}\`
│
├‣ 👆 উপরের Text এ চাপ দিলে Copy হবে!
├═━═━═━═━═━═━═━═━═━═
├‣ 🤖 𝐄𝐒𝐁-𝐁𝐎𝐓
╰━═━═━═━═━═━═━╯`;

    const keyboard = message.Markup.inlineKeyboard([[message.Markup.button.callback('Back to List', `font_list_1_${chatId}`)]]);
    try { global.badol.onCallback.set(`font_list_1_${chatId}`, { commandName: 'font' }); } catch {}

    // FIX: parse_mode + reply_markup একসাথে
    return await api.sendMessage(chatId, outMsg, {
      parse_mode: "Markdown",
      reply_markup: keyboard.reply_markup
    });
  },

  onCallback: async function ({ event, api, message, ctx }) {
    const data = event.data;
    const m = data.match(/_(-?\d+)$/);
    if (!m) return;
    const chatId = m[1];
    const msgId = ctx.callbackQuery.message.message_id;
    const chatIdNum = ctx.callbackQuery.message.chat.id;

    if (data.startsWith('font_try_')) {
      const id = data.split('_')[2];
      if (!FONT_MAPS[id]) return ctx.answerCbQuery('Not found');
      const sample = styleText("Mohammad Badol", id);
      const previewMsg =
`╭━❮ ✨ ${FONT_MAPS[id].name} ❯━╮
├═━═━═━═━═━═━═━═━═━═
├‣ 🎨 Preview:
│
│ \`${sample}\`
│
├‣ 👆 Tap to Copy!
├═━═━═━═━═━═━═━═━═━═
├‣ 💡 /font ${id} YourName
╰━═━═━═━═━═━═━═━═━═━╯`;

      const kb = { reply_markup: { inline_keyboard: [[{ text: "« Back to List", callback_data: `font_list_1_${chatId}` }]] } };
      try {
        await ctx.telegram.editMessageText(chatIdNum, msgId, undefined, previewMsg, { parse_mode: "Markdown", reply_markup: kb.reply_markup });
      } catch {
        await ctx.telegram.editMessageText(chatIdNum, msgId, undefined, previewMsg, kb).catch(()=>{});
      }
      return ctx.answerCbQuery(`${FONT_MAPS[id].name}`);
    }

    if (data.startsWith('font_page_')) {
      const page = Number(data.split('_')[2]) || 1;
      const { msg, totalPage } = createList(page);
      const start = (page - 1) * 10 + 1;
      const end = Math.min(start + 9, Object.keys(FONT_MAPS).length);
      const buttons = [];
      for (let i = start; i <= end; i++) buttons.push({ text: `${i}`, callback_data: `font_try_${i}_${chatId}` });
      const row1 = buttons.slice(0, 5);
      const row2 = buttons.slice(5, 10);
      const nav = [];
      if (page > 1) nav.push({ text: '← Prev', callback_data: `font_page_${page - 1}_${chatId}` });
      if (page < totalPage) nav.push({ text: 'Next →', callback_data: `font_page_${page + 1}_${chatId}` });
      const kb = { reply_markup: { inline_keyboard: [row1, row2, nav].filter(r => r.length > 0) } };
      try { await ctx.telegram.editMessageText(chatIdNum, msgId, undefined, msg, kb); } catch {}
      return ctx.answerCbQuery(`Page ${page}`);
    }

    if (data.startsWith('font_list_')) {
      const { msg, totalPage } = createList(1);
      const buttons = [];
      for (let i = 1; i <= 10; i++) buttons.push({ text: `${i}`, callback_data: `font_try_${i}_${chatId}` });
      const row1 = buttons.slice(0, 5);
      const row2 = buttons.slice(5, 10);
      const nav = totalPage > 1? [{ text: 'Next →', callback_data: `font_page_2_${chatId}` }] : [];
      const kb = { reply_markup: { inline_keyboard: [row1, row2, nav].filter(r => r.length > 0) } };
      try { await ctx.telegram.editMessageText(chatIdNum, msgId, undefined, msg, kb); } catch {}
      return ctx.answerCbQuery('List');
    }
  }
};