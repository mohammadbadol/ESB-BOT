const { createCanvas, loadImage } = require('canvas');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

const BG_URL = "https://drive.google.com/uc?export=view&id=16igx5CTH129wvcoE2HI7uwFrcW6MexoM";

module.exports = {
  config: {
    name: "wish",
    aliases: ["happybirthday", "hbd", "wishme"],
    version: "5.1 TG FINAL",
    author: "MOHAMMAD BADOL",
    cooldown: 10,
    role: 0,
    prefix: true,
    description: "Beautiful Birthday Wish Banner with DP",
    category: "fun",
    usePrefix: true
  },

  BADOL: async function ({ event, api, message, chatId }) {

    const birthdayMessages = [
      "🎉 Happy Birthday! 🎂 Today is your special day, may it be filled with joy and happiness. May all your dreams come true. Allah bless you with health and long life. 🎈✨💖",
      "🌟 Happy Birthday! 🥳 Today the world got a sweet person like you. May every day be filled with laughter, love and success. Be very happy! 🍰💫🌈",
      "🎊 Happy Birthday! 🎈 Lots of love and wishes on your special day. May life become more colorful, may today shine brightly in your memory! 🌸💎🥂",
      "🎂 Happy Birthday Dear! 🎁 Today is the happiest day of your life. May all your wishes come true very soon. Always stay cheerful! 🌷💫🌻",
      "✨ Happy Birthday! 🥂 Wishing you lots of love on this day. May life be full of joy, may all sorrows go away and happiness come. Stay well always! 🎀💖🎊"
    ];
    const randomMsg = birthdayMessages[Math.floor(Math.random() * birthdayMessages.length)];

    // Target - info.js logic
    let targetId = event.from.id;
    let targetName = event.from.first_name || "User";
    if (event.reply_to_message) {
      targetId = event.reply_to_message.from.id;
      targetName = event.reply_to_message.from.first_name || targetName;
    }

    const waitMsg = await message.reply("⏳ Generating your Birthday wish banner...");

    try {
      // BG
      const bgResponse = await axios.get(BG_URL, { responseType: 'arraybuffer' });
      const bgImg = await loadImage(Buffer.from(bgResponse.data));

      const canvas = createCanvas(1000, 667);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bgImg, 0, 0, 1000, 667);

      // DP - info.js logic same as fbcover
      const posX = 226;
      const posY = 290;
      const sizeR = 200;

      let dpLoaded = false;
      try {
        const photos = await api.getUserProfilePhotos(targetId, { limit: 1 });
        if (photos?.photos?.length > 0) {
          const fileId = photos.photos[0][photos.photos[0].length - 1].file_id;
          const fileLink = await api.getFileLink(fileId);
          const res = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
          const img = await loadImage(Buffer.from(res.data));

          ctx.save();
          ctx.beginPath();
          ctx.arc(posX, posY, sizeR, 0, Math.PI * 2, true);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(img, posX - sizeR, posY - sizeR, sizeR * 2, sizeR * 2);
          ctx.restore();
          dpLoaded = true;
        }
      } catch(e){ console.log("DP Error:", e.message); }

      // Name on image
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.font = "bold 32px Arial";
      ctx.shadowColor = "black";
      ctx.shadowBlur = 10;
      ctx.fillText(targetName, posX, posY + sizeR + 60);

      const outPath = path.join(__dirname, `wish_${targetId}_${Date.now()}.png`);
      fs.writeFileSync(outPath, canvas.toBuffer('image/png'));

      try { await api.deleteMessage(chatId, waitMsg.message_id); } catch {}

      const outputMessage = `┏━━━━『 𝐄𝐒𝐁-𝐁𝐎𝐓 』━━━━┓\n` +
                            ` 👤 Birthday Person: ${targetName}\n\n` +
                            ` 💬 ${randomMsg}\n\n` +
                            ` 💌 Powered by: 𝐄𝐒𝐁-𝐓𝐄𝐀𝐌\n` +
                            `┗━━━━━━━━━━━━━━━━━━━━━━┛`;

      await api.sendPhoto(chatId, { source: outPath }, {
        caption: outputMessage,
        reply_to_message_id: event.message_id
      });

      fs.unlinkSync(outPath);

    } catch (e) {
      console.error(e);
      try { await api.deleteMessage(chatId, waitMsg.message_id); } catch {}
      return await message.reply("┏━『 𝐄𝐒𝐁-𝐁𝐎𝐓 』━┓\n 〉Error: Could not generate wish!\n┗━━━━━━━━━━━━━━━━━┛");
    }
  }
};