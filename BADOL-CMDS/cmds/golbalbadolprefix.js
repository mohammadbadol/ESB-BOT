function toBoldItalic(text) {
    const map = {
        "a": "𝚊", "b": "𝚋", "c": "𝚌", "d": "𝚍", "e": "𝚎", "f": "𝚏", "g": "𝚐", "h": "𝚑", "i": "𝚒", "j": "𝚓", "k": "𝚔", "l": "𝚕", "m": "𝚖", "n": "𝚗", "o": "𝚘", "p": "𝚙", "q": "𝚚", "r": "𝚛", "s": "𝚜", "t": "𝚝", "u": "𝚞", "v": "𝚟", "w": "𝚠", "x": "𝚡", "y": "𝚢", "z": "𝚣",
        "A": "𝙰", "B": "𝙱", "C": "𝙲", "D": "𝙳", "E": "𝙴", "F": "𝙵", "G": "𝙶", "H": "𝙷", "I": "𝙸", "J": "𝙹", "K": "𝙺", "L": "𝙻", "M": "𝙼", "N": "𝙽", "O": "𝙾", "P": "𝙿", "Q": "𝚀", "R": "𝚁", "S": "𝚂", "T": "𝚃", "U": "𝚄", "V": "𝚅", "W": "𝚆", "X": "𝚇", "Y": "𝚈", "Z": "𝚉"
    };
    return String(text).split('').map(c => map[c] || c).join('');
}

async function getEffectivePrefix(threadId){
  let configPrefix = global.config?.botInfo?.prefix || "/";
  try {
    if(global.db && threadId){
      const thread = await global.db.getThread(String(threadId));
      if(thread?.customPrefix) return thread.customPrefix;
    }
  } catch(e){}
  return configPrefix;
}

module.exports = {
  config: {
    name: "golbalbadolprefix",
    aliases: [],
    author: "MOHAMMAD BADOL",
    version: "14.0 EFFECTIVE PREFIX FINAL",
    description: "Effective Prefix - Custom or Config",
    category: "islamic",
    usePrefix: false,
    cooldown: 2,
    role: 0,
  },

  BADOL: async function ({ event, api, message, chatId }) {
    const body = (event.text || "").trim();
    const threadId = String(chatId || event.chat.id);

    const effectivePrefix = await getEffectivePrefix(threadId);
    if (body!== effectivePrefix) return;

    const captions = [
        "– কোনো নেতার পিছনে নয়.!!🤸‍♂️\n– মসজিদের ইমামের পিছনে দাড়াও জীবন বদলে যাবে ইনশাআল্লাহ.!!🖤🌻",
        "আল্লাহর রহমত থেকে নিরাশ হওয়া যাবে না! আল্লাহ অবশ্যই তোমাকে ক্ষমা করে দিবেন☺️🌻",
        "- ইসলাম অহংকার করতে শেখায় না!🌸\n- ইসলাম শুকরিয়া আদায় করতে শেখায়!🤲🕋🥀",
        "স্মার্ট নয় ইসলামিক জীবন সঙ্গি খুঁজুন 🖤🥰",
        "যখন বান্দার জ্বর হয়,😇 তখন গুনাহ গুলো ঝড়ে পড়তে থাকে☺️ – হযরত মুহাম্মদ(সাঃ)",
        "তুমি আসক্ত হও—তবে নেশায় নয় আল্লাহর ইবাদতে-||-🖤🌸✨",
        "বুকে হাজারো কষ্ট নিয়ে আলহামডেলিল্লাহ বলাটা আল্লাহর প্রতি অগাধ বিশ্বাসের নমুনা❤️🥀"
    ];
    const links = [
        "https://i.postimg.cc/7LdGnyjQ/images-31.jpg",
        "https://i.postimg.cc/65c81ZDZ/images-30.jpg",
        "https://i.postimg.cc/Y0wvTzr6/images-29.jpg",
        "https://i.postimg.cc/1Rpnw2BJ/images-28.jpg",
        "https://i.postimg.cc/mgrPxDs5/images-27.jpg",
        "https://i.postimg.cc/yxXDK3xw/images-26.jpg"
    ];

    const randomCaption = captions[Math.floor(Math.random() * captions.length)];
    const imgURL = links[Math.floor(Math.random() * links.length)];
    let name = event.from?.first_name || "User";
    const cId = chatId || event.chat.id;

    const botName = global.config?.botInfo?.name || "𝐄𝐒𝐁-𝐁𝐎𝐓";
    const botUsername = global.config?.botInfo?.username || "ESBTEAMBOT";

    const txt = `╭━❮ 𝐄𝐒𝐁-𝐓𝐄𝐀𝐌 ❯━╮\n├═━═━═━═━═━═━═\n├‣ 🕌 𝗔𝗟𝗟𝗔𝗛𝗨 𝗔𝗞𝗕𝗔𝗥\n├═━═━═━═━═━═━═━═━═━═\n│\n│ ❝ ${randomCaption} ❞\n│\n├═━═━═━═━═━═━═━═━═━═\n├‣ 👤 ${toBoldItalic("User")}: ${name}\n├‣ 🤖 ${toBoldItalic("Bot")}: ${botName}\n├‣ 📌 ${toBoldItalic("Prefix")}: ${effectivePrefix}\n╰━═━═━═━═━═━═━╯\n\n🕋 La Ilaha Illallah 🕋`;

    const buttons = {
      inline_keyboard: [
        [{text:`🤖 ${botName}`, url:`https://t.me/${botUsername.replace('@','')}`}]
      ]
    };

    try { return await api.sendPhoto(cId, imgURL, { caption: txt, reply_markup: buttons }); }
    catch(e){ return message.reply(txt, { reply_markup: buttons }); }
  },

  onChat: async function ({ api, message, msg, chatId }) {
    const body = (msg.text || "").trim();
    if (!body) return;
    const threadId = String(msg.chat.id || chatId);
    const effectivePrefix = await getEffectivePrefix(threadId);
    if (body === effectivePrefix) {
        const self = global.badol.commands.get("golbalbadolprefix");
        if (self && self.BADOL) {
            await self.BADOL({ event: msg, api: api, message: message, chatId: msg.chat.id || chatId });
            return false;
        }
    }
  }
};