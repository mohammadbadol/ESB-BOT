const moment = require("moment-timezone");

module.exports = {
  config: {
    name: "admintag",
    aliases: ["adminteg", "tagadmin"],
    author: "MOHAMMAD BADOL",
    version: "2.3-FIXED-DUAL",
    cooldown: 3,
    role: 0,
    description: "Auto reply when admin is mentioned - Dual Owner Fixed",
    category: "utility",
    usePrefix: false
  },

  BADOL: async function ({ message }) {
    return message.reply(`✅ Admin Tag System Active\n50+ Funny Auto Reply Ready!\nDual Owner Support ON!`);
  },

  onChat: async function ({ api, chatId, event }) {
    try {
      const text = event.text || event.caption || "";
      if (!text || !event.entities || event.entities.length === 0) return;

      const senderId = String(event.from?.id || "");
      const targetAdmins = [
        { id: "6954597258", username: "B4D9L_007", name: "B4D9L Boss" },
        { id: "8036137477", username: "M9U_077", name: "M9U Apu" }
      ];

      let isAdminMentioned = false;
      let mentionedAdmin = null;

      for (const entity of event.entities) {
        if (entity.type === "mention") {
          const mentioned = text.slice(entity.offset, entity.offset + entity.length).replace("@", "").toLowerCase();
          const found = targetAdmins.find(a => a.username.toLowerCase() === mentioned);
          if (found) { 
            // নিজেকে মেনশন দিলে স্কিপ, অন্য ওনারকে দিলে রিপ্লাই
            if (String(found.id) === senderId) continue;
            isAdminMentioned = true; mentionedAdmin = found; break; 
          }
        }
        if (entity.type === "text_mention" && entity.user) {
          const found = targetAdmins.find(a => a.id === String(entity.user.id));
          if (found) { 
            if (String(found.id) === senderId) continue;
            isAdminMentioned = true; mentionedAdmin = { ...found, name: entity.user.first_name || found.name }; break; 
          }
        }
      }
      if (!isAdminMentioned || !mentionedAdmin) return;

      const name = event.from.first_name || "Friend";
      const adminName = mentionedAdmin.name || "Admin";
      const time = moment.tz(global.config.timezone || "Asia/Dhaka").format("hh:mm:ss A DD/MM/YYYY");

      const Messages = [
        `Mention দিস না, ${adminName} এখন ঘুমাচ্ছে! 😴💤`,
        `${adminName} এখন বিজি, প্রেম করতেছে! 😏❤️`,
        `এত মেনশন দিস না, ${adminName} বিরক্ত হচ্ছে! 😒🔨`,
        `${adminName} এখন বাথরুমে, পরে আসো! 🚽🏃`,
        `${adminName} এর মন ভালো নেই আজকে, ডিস্টার্ব করিস না! 💔🥀`,
        `ওই ${adminName} রে এত ডাকিস কেন? সে তো সিঙ্গেল না! 😾`,
        `${adminName} এখন গেম খেলতেছে, Mention দিস না! 🎮🔥`,
        `${adminName} বলছে পরে কথা বলবে, এখন বিজি! 😼🥰`,
        `Mention দিলে ${adminName} চুম্মাইয়া ঠোঁটের কালার change কইরা দিবে! 💋😾`,
        `${adminName} এখন মুড অফ, কেউ ডিস্টার্ব করিস না! 😤`,
        `আরে ${adminName} রে ছেড়ে দে, ও এখন খাচ্ছে! 🍜😋`,
        `${adminName} এখন Netflix দেখতেছে, ডিস্টার্ব করিস না! 📺🍿`,
        `Mention না দিয়ে ${adminName} রে একটা গফ দে! 😒👩‍❤️‍👨`,
        `${adminName} এখন Lover এর সাথে বিজি! 🫂💔`,
        `${adminName} বলছে তোর Mention এ তার ঘুম ভেঙে গেছে! 😡💤`,
        `এত ডাকাডাকি করিস কেন? ${adminName} কি তোর জামাই? 🤣`,
        `${adminName} এখন বাইরে, পরে মেনশন দিস! 🌃🚶`,
        `${adminName} এর ফোনে চার্জ নাই, Mention দিয়ে লাভ নাই! 🔋❌`,
        `${adminName} এখন পড়ালেখা করতেছে, ডিস্টার্ব করিস না! 📚🤓`,
        `Mention দিস না, ${adminName} রেগে গেলে ব্যান করে দিবে! 🔨😾`,
        `${adminName} is busy eating biriyani! 🍛 Don't disturb!`,
        `${adminName} is sleeping, don't wake him up! 😴`,
        `${adminName} is currently on a date! ❤️ Please wait!`,
        `Stop mentioning ${adminName}, he is charging his phone! 🔌`,
        `${adminName} said he will reply later, he is busy now! 😼`,
        `${adminName} is playing Free Fire, don't disturb! 🎮🔥`,
        `${adminName} is in the washroom right now! 🚽`,
        `Hey ${adminName} is busy, talk to me instead! 😉`,
        `${adminName} is watching anime, please don't disturb! 🎌`,
        `${adminName} is angry now, don't mention him! 😤🔥`,
        `Bro ${adminName} is offline, leave a message! 📩`,
        `${adminName} is with his girlfriend, don't disturb! 👩‍❤️‍👨`,
        `${adminName} is taking a nap, shhh! 🤫💤`,
        `Mention = Ban! ${adminName} is in bad mood! 🔨`,
        `${adminName} is busy coding, don't spam! 💻`,
        `Oops! ${adminName} is not available right now! 🙈`,
        `${adminName} বলছে তুই এত মেনশন দিস কেন? 😒`,
        `${adminName} এখন গার্লফ্রেন্ড খুঁজতেছে, হেল্প কর! 😏🔍`,
        `এই ${adminName} রে ডাকিস না, ও এখন কান্না করতেছে! 😭`,
        `${adminName} এর মাথা গরম, এখন মেনশন দিস না! 🤯🔥`,
        `${adminName} এখন গান শুনতেছে, ডিস্টার্ব করিস না! 🎧🎶`,
        `${adminName} বলছে Inbox এ আসো, এখানে না! 📥`,
        `Mention দিয়ে লাভ নাই, ${adminName} তো তোরে চিনে না! 🤣`,
        `${adminName} এখন ঘুরতে গেছে, পরে আসো! ✈️🌍`,
        `এত মেনশন দিলে ${adminName} তোরে ব্লক করে দিবে! 🚫😾`,
        `${adminName} is on vacation, please don't disturb! 🏖️`,
        `${adminName} is busy with his new project! 🚀💻`,
        `Please wait, ${adminName} will come soon! ⏳`,
        `${adminName} is not in mood today! 😔💔`,
        `${adminName} is laughing at your mention! 🤣`,
        `${adminName} said - Who is this? I don't know him! 🙄`,
        `${adminName} is drinking tea, don't disturb! ☕😌`,
        `Bro don't mention ${adminName}, he is shy! 🙈❤️`,
        `${adminName} is now a busy person! Respect! 👑`,
        `${adminName} will reply when he is free, patience! 🙏`,
        `Mention spam = Kick! ${adminName} is watching! 👀🔨`
      ];

      const randomMsg = Messages[Math.floor(Math.random() * Messages.length)];

      const replyText =
        `𝐇𝐞𝐲 ${name}\n` +
        `▬▬▬▬\n\n` +
        `${randomMsg}\n\n` +
        `▬▬▬▬\n` +
        `🕒 ${time}`;

      await api.sendMessage(chatId, replyText, { reply_to_message_id: event.message_id });

    } catch (err) {
      console.log("admintag error:", err.message);
    }
  }
};