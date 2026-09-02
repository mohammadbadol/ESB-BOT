/**
 * 🤖 BADOL-BOT APK LIST
 * 👤 CREDIT: MOHAMMAD BADOL
 */

module.exports = {
  config: {
    name: "app",
    aliases: ["apps", "apk", "apkl"],
    author: "MOHAMMAD BADOL",
    version: "2.0-BADOL",
    cooldown: 10,
    role: 0,
    description: "Premium APK list",
    category: "utility",
    usePrefix: true
  },

  BADOL: async function ({ event, api, args, message, chatId }) {
    try {
      // Loading Bar
      let progress = [
        "🔄 [▒▒▒▒▒▒▒▒▒▒] 0%",
        "⚡ [██▒▒▒▒▒▒▒▒] 20%",
        "⚡ [████▒▒▒▒▒▒] 40%",
        "⚡ [██████▒▒▒▒] 60%",
        "⚡ [████████▒▒] 80%",
        "✅ [██████████] 100%"
      ];

      let loading = await api.sendMessage(chatId, progress[0]);

      for (let i = 1; i < progress.length; i++) {
        await new Promise(r => setTimeout(r, 350));
        try {
          await api.editMessageText(progress[i], {
            chat_id: chatId,
            message_id: loading.message_id
          });
        } catch {}
      }

      await new Promise(r => setTimeout(r, 300));
      try { await api.deleteMessage(chatId, loading.message_id); } catch {}

      const apkButtons = {
        inline_keyboard: [
          [
            { text: "🛠️ Apk Editor Pro", url: "https://t.me/SB_MODS_APK/115" },
            { text: "🤖 BADOL_TG_BOT", url: "https://t.me/SB_MODS_APK/116" }
          ],
          [
            { text: "📘 MCS Fb Lite", url: "https://t.me/SB_MODS_APK/117" },
            { text: "💳 HD Card Maker", url: "https://t.me/SB_MODS_APK/118" }
          ],
          [
            { text: "⌨️ Redmik Keyboard", url: "https://t.me/SB_MODS_APK/119" },
            { text: "🎵 Audio Player Pro", url: "https://t.me/SB_MODS_APK/120" }
          ],
          [
            { text: "🎬 Inshot Premium", url: "https://t.me/SB_MODS_APK/121" },
            { text: "📨 Telegram Puls Mod", url: "https://t.me/SB_MODS_APK/122" }
          ],
          [
            { text: "📹 Xrecorder Pro", url: "https://t.me/SB_MODS_APK/123" },
            { text: "🌐 TouchVPN Mod", url: "https://t.me/SB_MODS_APK/124" }
          ],
          [
            { text: "🖼️ PixelLab MB", url: "https://t.me/SB_MODS_APK/125" },
            { text: "🖼️ PixelLab MB 2", url: "https://t.me/SB_MODS_APK/126" }
          ],
          [
            { text: "🛠️ Apk Editor MB", url: "https://t.me/SB_MODS_APK/127" },
            { text: "📘 Old FB Lite", url: "https://t.me/SB_MODS_APK/31" }
          ],
          [
            { text: "🆔 Fb Name Change Capital", url: "https://t.me/SB_MODS_APK/136" },
            { text: "💹 Mt Manager💰", url: "https://t.me/SB_MODS_APK/150" }
          ],
          [
            { text: "📧 Temp Mail✉️", url: "https://t.me/SB_MODS_APK/151" },
            { text: "⌛ Fb Cookies ⏳", url: "https://t.me/SB_MODS_APK/184" }
          ]
        ]
      };

      return await api.sendMessage(
        chatId,
        `✨ **SB MODS PREMIUM APK LIST**\n\n` +
        `📂 নিচের লিস্ট থেকে আপনার পছন্দের APK সিলেক্ট করুন:\n\n` +
        `🛡️ **Credit:** 𝐄𝐒𝐁-𝐓𝐄𝐀𝐌`,
        {
          parse_mode: "Markdown",
          reply_markup: apkButtons
        }
      );

    } catch (error) {
      console.log("APK CMD ERROR:", error.message);
      return message.reply("⚠️ APK লিস্ট লোড করতে সমস্যা হয়েছে।");
    }
  }
};