/**
 * 🤖 BADOL-BOT TG-INFO / FORWARD INFO
 * 👤 AUTHOR: MOHAMMAD BADOL
 */

const escapeHTML = (text) => {
  if (!text) return "";
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
};

module.exports = {
  config: {
    name: "forward",
    aliases: ["for", "tginfo", "fwdinfo"],
    author: "MOHAMMAD BADOL",
    version: "2.0-BADOL-FIXED",
    cooldown: 5,
    role: 0,
    description: "Get info from forwarded message",
    category: "utility",
    usePrefix: true
  },

  BADOL: async function ({ event, api, args, message, chatId }) {
    try {
      // রিপ্লাই চেক
      const replied = event.reply_to_message;
      if (!replied) {
        return message.reply(
          "⚠️ <b>একটি ফরওয়ার্ড করা মেসেজে Reply দিয়ে কমান্ডটি ব্যবহার করুন।</b>\n\n" +
          "যেমন: কোনো চ্যানেল থেকে ফরওয়ার্ড করা মেসেজে Reply দিয়ে /forward লিখুন।",
          { parse_mode: "HTML" }
        );
      }

      const fwdMsg = replied;

      const hasForwardData = fwdMsg.forward_from || fwdMsg.forward_from_chat || fwdMsg.forward_sender_name;

      if (!hasForwardData) {
        return message.reply(
          "⚠️ <b>এই মেসেজটিতে কোনো ফরওয়ার্ড ইনফরমেশন নেই।</b>\n" +
          "এটি অরিজিনাল মেসেজ, ফরওয়ার্ড করা না।",
          { parse_mode: "HTML" }
        );
      }

      // 1. চ্যানেল / গ্রুপ থেকে ফরওয়ার্ড
      if (fwdMsg.forward_from_chat) {
        const chat = fwdMsg.forward_from_chat;
        const title = escapeHTML(chat.title || "N/A");
        const chatUser = chat.username? "@" + escapeHTML(chat.username) : "Private Channel/Group";
        const chatID = chat.id;

        const boxedChat =
`╭───[ 📢 <b>CHAT INFORMATION</b> ]───
│ 🏷️ <b>Title:</b> ${title}
│ 🔗 <b>Username:</b> ${chatUser}
│ 🆔 <b>Chat ID:</b> <code>${chatID}</code>
│ 💬 <b>Type:</b> ${chat.type}
╰────────────────────────
🛡️ <b>Dev:</b> <code>𝐄𝐒𝐁-𝐓𝐄𝐀𝐌</code>`;

        try {
          const fullChat = await api.getChat(chatID);
          if (fullChat.photo) {
            const fileId = fullChat.photo.big_file_id || fullChat.photo.small_file_id;
            return await api.sendPhoto(chatId, fileId, {
              caption: boxedChat,
              parse_mode: "HTML"
            });
          }
        } catch {}

        return await message.reply(boxedChat, { parse_mode: "HTML" });
      }

      // 2. ইউজার থেকে ফরওয়ার্ড
      else if (fwdMsg.forward_from) {
        const user = fwdMsg.forward_from;
        const name = escapeHTML(user.first_name || "No Name");
        const username = user.username? "@" + escapeHTML(user.username) : "(No Username)";
        const id = user.id;
        const mention = `<a href="tg://user?id=${id}">${name}</a>`;

        const boxedInfo =
`╭───[ 👤 <b>USER INFORMATION</b> ]───
│ 🪪 <b>Name:</b> ${name}
│ 🔗 <b>Username:</b> ${username}
│ 🆔 <b>User ID:</b> <code>${id}</code>
│ 🙋 <b>Mention:</b> ${mention}
╰────────────────────────
🛡️ <b>Dev:</b> <code>𝐄𝐒𝐁-𝐓𝐄𝐀𝐌</code>`;

        try {
          const photos = await api.getUserProfilePhotos(id);
          if (photos.total_count > 0) {
            const largestPhoto = photos.photos[0][photos.photos[0].length - 1].file_id;
            return await api.sendPhoto(chatId, largestPhoto, {
              caption: boxedInfo,
              parse_mode: "HTML"
            });
          }
        } catch {}

        return await message.reply(boxedInfo, { parse_mode: "HTML" });
      }

      // 3. প্রাইভেট ফরওয়ার্ড
      else if (fwdMsg.forward_sender_name) {
        return await message.reply(
          `⚠️ <b>তথ্য পাওয়া যায়নি!</b>\n\n` +
          `ইউজার 👤 <b>${escapeHTML(fwdMsg.forward_sender_name)}</b> তার "Forwarded Messages" প্রাইভেট করে রেখেছে, তাই ID দেখা সম্ভব নয়।`,
          { parse_mode: "HTML" }
        );
      }

    } catch (err) {
      console.log("tginfo error:", err.message);
      return message.reply("❌ তথ্য প্রসেস করতে এরর হয়েছে।");
    }
  }
};