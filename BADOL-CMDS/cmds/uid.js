module.exports = {
  config: {
    name: "uid",
    aliases: [],
    author: "MOHAMMAD BADOL",
    version: "1.7",
    cooldown: 3,
    role: 0,
    description: "Get Telegram user ID (self, reply, or mention)",
    category: "utility",
    usePrefix: true
  },

  BADOL: async ({ event, message, args, api }) => {
    try {
      let targetUser = null;
      let userId = null;

      // 🔹 1. If reply to a message
      if (event.reply_to_message && event.reply_to_message.from) {
        targetUser = event.reply_to_message.from;
        userId = targetUser.id;
      }
      // 🔹 2. Otherwise, show own UID
      else {
        targetUser = event.from;
        userId = targetUser.id;
      }

      // 🧩 Build mention
      const mentionText = `[${targetUser.first_name || "User"}](tg://user?id=${userId})`;

      // 💬 Send message with UID
      await message.reply(
        `👤 ${mentionText}\n🆔 \`${userId}\``,
        { parse_mode: "Markdown" }
      );

    } catch (error) {
      console.error("Error in uid command:", error);
      await message.reply(`❌ Error: ${error.message}`);
    }
  }
};
