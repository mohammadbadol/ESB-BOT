// Path: BADOL/CMDS/cmds/alldown.js
const { alldown } = require('nayan-media-downloaders');
const axios = require('axios');

module.exports = {
  config: {
    name: "autodl",
    aliases: ["autoMediaDownloader", "alldown", "dl", "down"],
    author: "MOHAMMAD BADOL",
    version: "3.2 BOX DESIGN",
    description: "Auto social media downloader for all platforms",
    category: "downloader",
    usePrefix: false,
    cooldown: 3,
    role: 0
  },

  BADOL: async function ({ event, api, args, message }) {
    const text = args.join(" ").trim();
    if (!text) return;
    return this.onChat({ bot: api, msg: event, chatId: event.chat.id, api });
  },

  onChat: async function ({ bot, msg, chatId, api }) {
    try {
      const text = msg.text || msg.caption || "";
      if (!text || !text.includes("http")) return;
      if (msg.from?.is_bot) return;

      const supported = [
        "facebook.com", "fb.watch", "fb.me", "fb.share",
        "instagram.com", "instagr.am", "reel",
        "tiktok.com",
        "youtube.com", "youtu.be",
        "pinterest.com", "pin.it",
        "twitter.com", "x.com"
      ];

      const lowerText = text.toLowerCase();
      if (!supported.some(d => lowerText.includes(d))) return;

      const tg = bot || api;

      const waitMsg = await tg.sendMessage(chatId, "⏳ `Downloading...`", {
        reply_to_message_id: msg.message_id,
        parse_mode: "Markdown"
      }).catch(() => {});

      try {
        // ক্লিন করার জন্য রেজেক্স যা এক্সট্রা প্যারামিটার (যেমন ?igsh=...) বাদ দিয়ে মূল লিংক ধরবে
        const urlMatch = text.match(/https?:\/\/[^\s]+/);
        let videoLink = urlMatch ? urlMatch[0] : text.trim();
        
        // লিংকের শেষের এক্সট্রা ট্রেইলিং ক্যারেক্টার বা ডট ক্লিন করা
        videoLink = videoLink.replace(/[.,;!?]$/, "");

        const res = await alldown(videoLink);
        
        // সব প্ল্যাটফর্ম এবং ইনস্টাগ্রামের ডাটা ফরম্যাট হ্যান্ডেল করার জন্য সঠিক ফলব্যাক
        const videoUrl = res?.data?.high || res?.data?.low || res?.data?.video || res?.data?.url || res?.result;
        const title = res?.data?.title || res?.title || "No Title Found";

        if (!videoUrl) throw new Error("No URL Found");

        // Axios দিয়ে স্ট্রিম আকারে ভিডিও রেসপন্স ফেচ করা (ইনস্টাগ্রাম ও অন্যান্য ব্লক এড়াতে)
        const videoResponse = await axios.get(videoUrl, {
          responseType: "stream",
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });

        // ===== SHORT BOX DESIGN =====
        const cleanTitle = String(title).slice(0, 40).replace(/[<>]/g, '');
        const caption =
`╭───⦿ 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗘𝗗 ⦿───╮
│
├─🎬 𝗧𝗶𝘁𝗹𝗲: ${cleanTitle}
╰─────────────────⦿`;

        await tg.sendVideo(chatId, { source: videoResponse.data }, {
          caption: caption,
          parse_mode: "Markdown",
          reply_to_message_id: msg.message_id,
          reply_markup: {
            inline_keyboard: [
              [
                { text: '👑 DEV', url: 'tg://user?id=6954597258' },
                { text: '🤖 BOT', url: 'https://t.me/ErenAi1Bot' }
              ]
            ]
          }
        });

        if (waitMsg) await tg.deleteMessage(chatId, waitMsg.message_id).catch(() => {});
      } catch (e) {
        console.error("AutoDown Error:", e.message);
        if (waitMsg) {
          await tg.editMessageText("❌ Failed to download! Link might be private or unsupported.", {
            chat_id: chatId,
            message_id: waitMsg.message_id
          }).catch(() => {});
        }
      }
    } catch (err) {
      // সাইলেন্ট আউটার ক্যাচ
    }
  }
};
