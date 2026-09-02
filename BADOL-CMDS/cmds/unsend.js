module.exports = {
  config: {
    name: "unsend",
    aliases: ["uns", "del"],
    author: "MOHAMMAD BADOL",
    version: "1.0",
    cooldown: 0,
    role: 0,
    description: "Unsend bot's message (reply to bot message)",
    category: "admin",
    usePrefix: true
  },

  BADOL: async function ({ event, api, message }) {
    try {
      if (!event.reply_to_message) {
        return message.reply('❌ Please reply to a bot message to unsend it.');
      }

      const replyMsg = event.reply_to_message;

      if (!replyMsg.from.is_bot) {
        return message.reply('❌ You can only unsend bot messages.');
      }

      try {
        await api.deleteMessage(event.chat.id, replyMsg.message_id);
        console.log(`🗑️ [UNSEND] Deleted message ${replyMsg.message_id}`);
      } catch (err) {
        if (err.message.includes('message to delete not found')) {
          return message.reply('❌ Message already deleted.');
        } else if (err.message.includes('not enough rights')) {
          return message.reply('❌ I don\'t have permission to delete messages.');
        } else {
          throw err;
        }
      }

      // Delete the unsend command message
      try {
        await api.deleteMessage(event.chat.id, event.message_id);
      } catch (err) {
        // Ignore if can't delete command message
      }

    } catch (error) {
      global.log.error('Error in unsend command:', error);
      return message.reply(`❌ Error: ${error.message}`);
    }
  }
};