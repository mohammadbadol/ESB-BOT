const util = require("util");

module.exports = {
  config: {
    name: "eval",
    aliases: ["exec", "run"],
    author: "MOHAMMAD BADOL",
    version: "2.2",
    cooldown: 0,
    role: 2,
    description: "Execute JavaScript code (Owner only)",
    category: "admin",
    usePrefix: true
  },

  BADOL: async function ({ event, api, args, message, userId, ctx, db, chatId }) {
    const code = args.join(" ");
    if (!code) return message.reply("⚠️ Provide code to execute.");

    try {
      const axios = require("axios");
      const fs = require("fs");
      const path = require("path");
      const util = require("util");

      // Define out() function for easy output
      const out = async (content) => {
        if (typeof content === "object") {
          content = util.inspect(content, { depth: 3, colors: false });
        }
        await api.sendMessage(event.chat.id, String(content));
      };

      // Create async eval function with all context
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      const asyncEval = new AsyncFunction(
        "message", "api", "event", "global", "require", "axios", "fs", "path", "ctx", "db", "out", "chatId", "userId", "util",
        `
        try {
          const result = await (async () => { ${code} })();
          if (result !== undefined) return result;
        } catch (err) {
          return '❌ Error: ' + err.message + '\\n' + err.stack;
        }
      `
      );

      let result = await asyncEval(message, api, event, global, require, axios, fs, path, ctx, db, out, chatId, userId, util);

      // Skip output if out() already used
      if (result === undefined) return;

      if (typeof result === "object") {
        result = util.inspect(result, { depth: 3, colors: false });
      }
      
      if (typeof result !== "string") result = String(result);
      
      if (result.length > 4000) {
        result = result.slice(0, 4000) + "...\n[Output truncated]";
      }

      await api.sendMessage(event.chat.id, `✅ Result:\n\`\`\`\n${result}\n\`\`\``);

    } catch (error) {
      await api.sendMessage(event.chat.id, `❌ Error:\n${error.message}\n\n${error.stack || ''}`);
    }
  }
};
