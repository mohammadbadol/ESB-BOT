// ╔════════════════════════════════════════════════════╗
// ║ BADOL-CMDS/cmds/pin.js - Pin/Unpin FINAL FIXED ║
// ╚════════════════════════════════════════════════════╝

module.exports = {
  config: {
    name: "pin",
    aliases: ["pinmsg", "unpin", "unpinmsg"],
    author: "MOHAMMAD BADOL",
    version: "1.1.0",
    description: "Pin / Unpin Message in Group",
    category: "group",
    usePrefix: true,
    role: 1,
    cooldown: 2
  },

  BADOL: async function ({ api, event, msg, chatId, args, commandName }) {
    try {
      const message = msg || event?.message || event;
      const mChatId = chatId || message?.chat?.id || event?.chat?.id;
      if (!mChatId) return;

      if (!String(mChatId).startsWith("-")) {
        return api.sendMessage(mChatId, "❌ এই Command শুধু Group এ কাজ করবে!");
      }

      const finalArgs = args || (message?.text? message.text.split(" ").slice(1) : []) || [];
      const rawText = (message?.text || "").toLowerCase().trim();

      // ✅ FIX - Raw Text দিয়ে Unpin Check (Alias Conflict Fix)
      const isUnpin = rawText.startsWith("/unpin") || rawText.startsWith("!unpin") || rawText.startsWith(".unpin") || rawText.startsWith("unpin");

      // ===== UNPIN SYSTEM =====
      if (isUnpin) {

        if (finalArgs[0]?.toLowerCase() === "all" || finalArgs[1]?.toLowerCase() === "all" || rawText.includes("all")) {
          try {
            await api.unpinAllChatMessages(mChatId);
            return api.sendMessage(mChatId, "✅ সব Pin Remove করা হয়েছে! 🗑️ উপরের থেকে সরে গেছে!");
          } catch (e) {
            return api.sendMessage(mChatId, `❌ Unpin All Fail: ${e.message}`);
          }
        }

        const replyId = message?.reply_to_message?.message_id;
        if (replyId) {
          try {
            // ✅ FIX - 2 ভাবে Try করবে
            try {
              await api.unpinChatMessage(mChatId, replyId);
            } catch {
              await api.unpinChatMessage(mChatId, { message_id: replyId });
            }
            return api.sendMessage(mChatId, "✅ Unpinned Done! 🗑️ উপরের থেকে সরে গেছে! Real Unpin!");
          } catch (e) {
            return api.sendMessage(mChatId, `❌ Unpin Fail: ${e.message}`);
          }
        } else {
          try {
            await api.unpinChatMessage(mChatId);
            return api.sendMessage(mChatId, "✅ Last Pinned Message Unpinned!");
          } catch (e) {
            return api.sendMessage(mChatId, `❌ Reply করে Unpin করো!\n📌 Pin করা Msg এ Reply দিয়ে /unpin লিখো`);
          }
        }
      }

      // ===== PIN SYSTEM =====
      const replyMsg = message?.reply_to_message;
      if (!replyMsg) {
        return api.sendMessage(mChatId,
          `📌 Pin করতে Reply দাও!\n\n` +
          `📝 Use:\n` +
          `/pin - Message এ Reply দিয়ে /pin (🔔 Notification সহ)\n` +
          `/pin silent - Notification ছাড়া Pin (🔕 Silent)\n` +
          `/unpin - Reply দিয়ে Unpin\n` +
          `/unpin all - সব Pin Remove`
        );
      }

      const isSilent = finalArgs[0]?.toLowerCase() === "silent" || finalArgs[0]?.toLowerCase() === "s";

      try {
        // ✅ REAL NOTIFICATION LOGIC - এটাই তোমার আগেরটা
        await api.pinChatMessage(mChatId, replyMsg.message_id, {
          disable_notification: isSilent? true : false
        });

        if (isSilent) {
          return api.sendMessage(mChatId, `📌 Silent Pin Done! 🔕\nNo Notification!`);
        } else {
          return api.sendMessage(mChatId, `📌 Pinned Done!`);
        }
      } catch (e) {
        return api.sendMessage(mChatId, `❌ Pin Fail: ${e.message}\nBot কে Pin Permission দাও!`);
      }

    } catch (e) {
      console.log("Pin Error:", e.message);
      try {
        const errChatId = chatId || msg?.chat?.id || event?.chat?.id;
        if (errChatId) await api.sendMessage(errChatId, `❌ Error: ${e.message}`);
      } catch {}
    }
  }
};