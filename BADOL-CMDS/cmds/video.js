const fs = require("fs");
const path = require("path");
const axios = require("axios");
const nayan = require("nayan-media-downloaders");
const Youtube = require("youtube-search-api");

module.exports = {
  config: {
    name: "video",
    aliases: ["videos", "yt", "ytvideo"],
    author: "MOHAMMAD BADOL",
    version: "3.0-BUTTON-SELECT",
    description: "YouTube video search 5 results with button select",
    category: "media",
    usePrefix: true,
    cooldown: 10,
    role: 0,
    guide: "{pn}video <keyword>"
  },

  BADOL: async function ({ event, api, args, message, chatId, userId }) {

    function safeName(str, len = 35) {
      try {
        if (!str) return "Unknown";
        str = String(str).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
        if (!str) return "Unknown";
        const arr = Array.from(str);
        if (arr.length > len) return arr.slice(0, len).join("") + "…";
        return arr.join("");
      } catch { return "Unknown"; }
    }

    const keyword = args.join(" ").trim();
    if (!keyword) {
      return api.sendMessage(chatId, `╭─❖─〔 𝐄𝐒𝐁-𝐓𝐄𝐀𝐌 〕─❖─╮\n│ ⚠️ Use: /video dil dil\n│ ⚠️ Use: /video Believer\n╰─❖─〔 𝐄𝐒𝐁-𝐓𝐄𝐀𝐌 〕─❖─╯`, {
        reply_to_message_id: event.message_id
      });
    }

    let waitMsg = null;
    try {
      waitMsg = await api.sendMessage(chatId, `╭─❖─〔 𝐄𝐒𝐁-𝐁𝐎𝐓 〕─❖─╮\n│ 🔍 Searching: ${safeName(keyword, 20)}\n│ ⏳ Finding 5 videos...\n╰─❖─〔 𝐄𝐒𝐁-𝐁𝐎𝐓 〕─❖─╯`, {
        reply_to_message_id: event.message_id
      });
    } catch {}

    try {
      const results = await Youtube.GetListByKeyword(keyword, false, 5);
      const videos = results.items?.slice(0, 5) || [];

      if (!videos.length) {
        try { if (waitMsg) await api.deleteMessage(chatId, waitMsg.message_id); } catch {}
        return api.sendMessage(chatId, `❌ Video not found: ${safeName(keyword, 25)}`, {
          reply_to_message_id: event.message_id
        });
      }

      global.videoCache = global.videoCache || new Map();
      const cacheId = `${chatId}_${Date.now()}`;
      global.videoCache.set(cacheId, { videos, keyword, userId });

      setTimeout(() => global.videoCache.delete(cacheId), 300000);

      let listMsg = `╭─❖─〔 𝐄𝐒𝐁-𝐓𝐄𝐀𝐌 〕─❖─╮\n│ 🎬 Results for: ${safeName(keyword, 18)}\n├──────────────────────┤\n`;

      videos.forEach((v, i) => {
        const title = safeName(v.title || "Unknown", 30);
        const channel = safeName(v.channelTitle || v.channel?.name || "Unknown", 15);
        listMsg += `│ ${i+1}. ${title}\n│ 👤 ${channel}\n│\n`;
      });

      listMsg += `├──────────────────────┤\n│ 👇 Select Number To Download\n╰─❖─〔 𝐄𝐒𝐁-𝐁𝐎𝐓 〕─❖─╯`;

      const buttons = {
        inline_keyboard: [
          [
            { text: "1️⃣", callback_data: `video_${cacheId}_0` },
            { text: "2️⃣", callback_data: `video_${cacheId}_1` },
            { text: "3️⃣", callback_data: `video_${cacheId}_2` },
            { text: "4️⃣", callback_data: `video_${cacheId}_3` },
            { text: "5️⃣", callback_data: `video_${cacheId}_4` }
          ],
          [
            { text: "❌ Cancel", callback_data: `video_cancel` }
          ]
        ]
      };

      try { if (waitMsg) await api.deleteMessage(chatId, waitMsg.message_id); } catch {}

      await api.sendMessage(chatId, listMsg, {
        reply_to_message_id: event.message_id,
        reply_markup: buttons
      });

    } catch (err) {
      console.log("VIDEO SEARCH ERROR:", err.message);
      try { if (waitMsg) await api.deleteMessage(chatId, waitMsg.message_id); } catch {}
      await api.sendMessage(chatId, `❌ Search failed! Try again!\nError: ${err.message.slice(0,80)}`, {
        reply_to_message_id: event.message_id
      });
    }
  },

  onCallback: async function ({ event, api, ctx }) {

    function safeName(str, len = 40) {
      try {
        if (!str) return "Unknown";
        str = String(str).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
        if (!str) return "Unknown";
        const arr = Array.from(str);
        if (arr.length > len) return arr.slice(0, len).join("") + "…";
        return arr.join("");
      } catch { return "Unknown"; }
    }

    const data = event.data || "";
    if (!data.startsWith("video_")) return;

    await ctx.answerCbQuery();

    if (data.includes("cancel")) {
      await ctx.answerCbQuery("❌ Cancelled!");
      try { await api.deleteMessage(ctx.chat.id, event.message.message_id); } catch {
        await ctx.editMessageText("❌ Cancelled! Use /video again!").catch(()=>{});
      }
      return;
    }

    try {
      const parts = data.split("_");
      const index = parseInt(parts[parts.length - 1]);
      const cacheId = parts.slice(1, -1).join("_");

      const cached = global.videoCache?.get(cacheId);
      if (!cached) {
        return ctx.editMessageText("❌ Expired! Search again with /video").catch(()=>{});
      }

      const video = cached.videos[index];
      if (!video) return ctx.answerCbQuery("❌ Invalid selection!");

      const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;
      const keyword = cached.keyword;

      try {
        await ctx.editMessageText(`╭─❖─〔 𝐄𝐒𝐁-𝐓𝐄𝐀𝐌 〕─❖─╮\n│ 🎬 Selected: ${safeName(video.title, 25)}\n│ ⏳ Downloading...\n│ 🔗 ${videoUrl}\n╰─❖─〔 𝐄𝐒𝐁-𝐁𝐎𝐓 〕─❖─╯`, {
          reply_markup: { inline_keyboard: [] }
        });
      } catch {}

      const ytd = await nayan.ytdown(videoUrl);
      const videoLink = ytd?.data?.video;
      const title = safeName(ytd?.data?.title || video.title || keyword, 50);

      if (!videoLink) throw new Error("No video link!");

      const CACHE_DIR = path.join(__dirname, "..", "cache");
      if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
      const filePath = path.join(CACHE_DIR, `video_${Date.now()}.mp4`);

      const writer = fs.createWriteStream(filePath);
      const res = await axios.get(videoLink, {
        responseType: "stream",
        timeout: 90000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      await new Promise((resolve, reject) => {
        res.data.pipe(writer);
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      const caption = `╭─❖─〔 𝐄𝐒𝐁-𝐓𝐄𝐀𝐌 〕─❖─╮
│ 🎬 ${title}
├──────────────────────┤
│ 🔍 Query: ${safeName(keyword, 18)}
│ 🔗 ${videoUrl}
│ 👤 ${safeName(video.channelTitle || "", 18)}
╰─❖─〔 𝐄𝐒𝐁-𝐁𝐎𝐓 〕─❖─╯`;

      try { await api.deleteMessage(ctx.chat.id, event.message.message_id); } catch {}

      await api.sendVideo(ctx.chat.id, { source: fs.createReadStream(filePath) }, {
        caption: caption
      });

      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
      global.videoCache.delete(cacheId);

    } catch (err) {
      console.log("VIDEO DOWNLOAD ERROR:", err.message);
      await api.sendMessage(ctx.chat.id, `❌ Download failed!\n${err.message.slice(0,100)}`).catch(()=>{});
      try { await api.deleteMessage(ctx.chat.id, event.message.message_id); } catch {}
    }
  }
};