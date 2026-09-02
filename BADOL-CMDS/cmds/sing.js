const axios = require('axios');
const fs = require('fs');
const path = require('path');
const Youtube = require('youtube-search-api');
const { ytdown } = require('nayan-media-downloaders');

module.exports = {
  config: {
    name: "sing",
    aliases: ["music", "song", "play"],
    version: "3.0.0",
    author: "MOHAMMAD BADOL",
    cooldown: 10,
    role: 0,
    description: "Search and download music from YouTube (nayan API)",
    category: "media",
    usePrefix: true
  },

  BADOL: async function ({ event, api, args, message }) {
    if (!args[0]) return message.reply("⚠️ Provide song name!\nUsage: /sing <song name>");
    try {
      const searchQuery = args.join(" ");
      const searchMsg = await message.send(`🔍 Searching for: ${searchQuery}...`);

      const searchResult = await Youtube.GetListByKeyword(searchQuery, false, 6);
      if (!searchResult.items || searchResult.items.length === 0) {
        try { await api.deleteMessage(event.chat.id, searchMsg.message_id); } catch {}
        return message.reply("❌ No results found.");
      }

      const videos = searchResult.items;
      let resultText = `🎵 Results for "${searchQuery}":\n\n`;
      videos.forEach((v, i) => { resultText += `${i + 1}. ${v.title}\n⏱️ ${v.length?.simpleText || 'N/A'}\n\n`; });

      const buttons = [];
      for (let i = 0; i < videos.length; i += 3) {
        const row = [];
        for (let j = i; j < Math.min(i + 3, videos.length); j++) row.push({ text: `${j + 1}`, callback_data: `sing_select_${j}` });
        buttons.push(row);
      }

      try { await api.deleteMessage(event.chat.id, searchMsg.message_id); } catch {}
      const replyMsg = await api.sendMessage(event.chat.id, resultText, { reply_markup: { inline_keyboard: buttons } });

      global.badol.onCallback.set(replyMsg.message_id, {
        commandName: "sing",
        messageID: replyMsg.message_id,
        author: event.from.id,
        videos: videos
      });

    } catch (e) {
      console.log(e);
      return message.reply(`❌ Error: ${e.message}`);
    }
  },

  onCallback: async function ({ event, api, ctx }) {
    let filePath = "";
    let processingMsg = null;
    try {
      const data = event.data;
      const messageId = event.message.message_id;
      const Callback = global.badol.onCallback.get(messageId);
      if (!Callback) return ctx.answerCbQuery('❌ Expired, search again').catch(()=>{});
      if (event.from.id!== Callback.author) return ctx.answerCbQuery('⚠️ Not your request!', { show_alert: true }).catch(()=>{});

      const selectedIndex = parseInt(data.split('_')[2]);
      const selectedVideo = Callback.videos[selectedIndex];
      await ctx.answerCbQuery('⏳ Downloading...').catch(()=>{});

      processingMsg = await api.sendMessage(event.message.chat.id, `⏳ Found: ${selectedVideo.title}\n📥 Downloading...`);

      // ★★★ MESSENGER BOT ER SAME API ★★★
      const videoUrl = `https://www.youtube.com/watch?v=${selectedVideo.id}`;
      const downloadInfo = await ytdown(videoUrl);

      if (!downloadInfo.status ||!downloadInfo.data) throw new Error("API failed");

      // Video link for video, audio link thakle audio
      const downloadUrl = downloadInfo.data.video || downloadInfo.data.audio || downloadInfo.data.videoUrl;
      const title = downloadInfo.data.title || selectedVideo.title;

      if (!downloadUrl) throw new Error("No download URL");

      const cacheDir = path.join(__dirname, "..", "..", "tmp");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
      filePath = path.join(cacheDir, `${Date.now()}_sing.mp3`);

      const res = await axios({
        method: 'get',
        url: downloadUrl,
        responseType: 'stream',
        timeout: 60000
      });

      const writer = fs.createWriteStream(filePath);
      res.data.pipe(writer);
      await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });

      try { await api.deleteMessage(event.message.chat.id, Callback.messageID); } catch {}
      try { await api.deleteMessage(event.message.chat.id, processingMsg.message_id); } catch {}

      await api.sendAudio(event.message.chat.id,
        { source: fs.createReadStream(filePath) },
        { caption: `🎶 ${title}` }
      );

      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      global.badol.onCallback.delete(messageId);

    } catch (err) {
      console.error("Sing Error:", err.message);
      if (processingMsg) { try { await api.deleteMessage(event.message.chat.id, processingMsg.message_id); } catch {} }
      if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
      await api.sendMessage(event.message.chat.id, `❌ Failed: ${err.message}`);
    }
  }
};