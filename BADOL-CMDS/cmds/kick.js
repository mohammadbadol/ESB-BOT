module.exports = {
  config: {
    name: "kick",
    aliases: ["kickout"],
    author: "MOHAMMAD BADOL",
    version: "3.0-FIXED",
    cooldown: 5,
    role: 1,
    description: "Kick a user (Reply/UID/Mention)",
    category: "admin",
    usePrefix: true
  },

  BADOL: async ({ event, api, message, args, chatId }) => {
    try {
      const chatType = event.chat.type;
      if (chatType !== "group" && chatType !== "supergroup") {
        return message.reply("⚠️ গ্রুপে ইউজ করুন!");
      }

      let targetUserId = null;
      let targetUserName = "User";

      // 1️⃣ REPLY থেকে (BEST WAY - 100% কাজ করবে)
      if (event.reply_to_message?.from) {
        targetUserId = event.reply_to_message.from.id;
        targetUserName = event.reply_to_message.from.first_name;
      }

      // 2️⃣ TEXT_MENTION থেকে (Clickable Mention - নীল নামে মেনশন)
      else if (event.entities) {
        const textMention = event.entities.find(e => e.type === "text_mention" && e.user);
        if (textMention) {
          targetUserId = textMention.user.id;
          targetUserName = textMention.user.first_name;
        }
      }

      // 3️⃣ ARGS থেকে - UID / @username
      if (!targetUserId && args[0]) {
        let raw = args[0].trim();

        // @ বাদ দাও
        if (raw.startsWith('@')) raw = raw.slice(1);

        // যদি নাম্বার UID হয়
        if (/^\d+$/.test(raw)) {
          targetUserId = Number(raw);
          targetUserName = `User ${raw}`;
          try {
            const m = await api.getChatMember(chatId, targetUserId);
            targetUserName = m.user.first_name;
          } catch {}
        } else {
          // Username দিয়ে DB তে খুঁজো (তোমার bot এর DB তে যদি থাকে)
          try {
            const allUsers = await global.db.getAllUsers();
            const found = allUsers.find(u => u.username && u.username.toLowerCase() === raw.toLowerCase());
            if (found) {
              targetUserId = Number(found.userId || found.id);
              targetUserName = found.firstName || raw;
            } else {
              return message.reply(
                `❌ @${raw} এর ID পাওয়া যায়নি!\n\n` +
                `✅ সঠিক উপায়:\n` +
                `1️⃣ তার মেসেজে Reply দিয়ে /kick লিখো (100% কাজ করবে)\n` +
                `2️⃣ তার প্রোফাইল থেকে নীল নামটা কপি করে মেনশন করে /kick @নীল_নাম\n` +
                `3️⃣ তার UID দিয়ে /kick 123456789\n\n` +
                `⚠️ Telegram Bot API তে @username দিয়ে ID বের করা যায় না, তাই Reply সবচেয়ে ভালো।`
              );
            }
          } catch {
            return message.reply(`❌ @${raw} কে খুঁজে পাওয়া যায়নি। Reply দিয়ে kick করো।`);
          }
        }
      }

      if (!targetUserId) {
        return message.reply(
          `⚠️ কাকে কিক করবে?\n\n` +
          `1️⃣ Reply: /kick (রিপ্লাই দিয়ে)\n` +
          `2️⃣ UID: /kick 123456789\n` +
          `3️⃣ Clickable Mention দিয়ে`
        );
      }

      // নিজেকে / বট / গ্লোবাল এডমিন কিক না
      if (global.config.adminUID.includes(String(targetUserId))) return message.reply("⚠️ Bot Admin কে কিক করা যাবে না!");
      if (targetUserId === event.from.id) return message.reply("⚠️ নিজেকে কিক করা যাবে না!");
      if (targetUserId === (await api.getMe()).id) return message.reply("⚠️ আমাকে কিক করা যাবে না!");

      // Bot permission check
      const botMember = await api.getChatMember(chatId, (await api.getMe()).id);
      if (botMember.status !== "administrator" && botMember.status !== "creator") return message.reply("⚠️ আমাকে Admin বানাও!");
      if (!botMember.can_restrict_members) return message.reply("⚠️ আমার Ban Users পারমিশন নাই!");

      // Target admin check
      try {
        const targetMember = await api.getChatMember(chatId, targetUserId);
        if (["administrator", "creator"].includes(targetMember.status)) {
          return message.reply("⚠️ গ্রুপ এডমিনকে কিক করা যাবে না!");
        }
        targetUserName = targetMember.user.first_name;
      } catch {}

      // Kick = Ban + Unban (5 sec)
      const untilDate = Math.floor(Date.now() / 1000) + 5;
      await api.banChatMember(chatId, targetUserId, { until_date: untilDate });
      // 2 সেকেন্ড পর আনব্যান যাতে আবার জয়েন করতে পারে
      setTimeout(async () => {
        try { await api.unbanChatMember(chatId, targetUserId); } catch {}
      }, 6000);

      await message.reply(
        `✅ Kicked ${targetUserName}!\n` +
        `🆔 ID: \`${targetUserId}\`\n` +
        `👮 By: ${event.from.first_name}`,
        { parse_mode: "Markdown" }
      );

    } catch (error) {
      console.error("Kick error:", error);
      await message.reply(`❌ Kick হয়নি: ${error.message}`);
    }
  }
};