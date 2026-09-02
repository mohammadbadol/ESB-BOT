module.exports = {
  config: {
    name: "spam",
    aliases: ["spm"],
    author: "MOHAMMAD BADOL",
    version: "1.0.0",
    cooldown: 5,
    role: 2,
    prefix: true,
    description: "Long emoji spam for testing",
    category: "fun"
  },

  BADOL: async function ({ api, chatId, event }) {
    try {
      const emojis = Array(30).fill("💣").join("\n");
      await api.sendMessage(chatId, emojis);
    } catch (err) {
      console.error(`[SPAM ERROR]: ${err.message}`);
      await api.sendMessage(chatId, `❌ Error: ${err.message}`).catch(()=>{});
    }
  }
};