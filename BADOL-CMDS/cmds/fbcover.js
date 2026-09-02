const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const axios = require('axios');

module.exports = {
  config: {
    name: "fbcover",
    aliases: ["fbcover2","fbcover3","fbcover4","fbcover5","fbcover6","fbcover7","fbcover8","cover","cover2","cover3","cover4","cover5","cover6","cover7","cover8"],
    author: "MOHAMMAD BADOL",
    version: "10.1 ENGLISH FINAL",
    cooldown: 10,
    role: 0,
    description: "FB Cover 8 BG with DP",
    category: "canvas",
    usePrefix: true
  },

  BADOL: async function ({ event, api, args, message, chatId, userId, ctx }) {
    const text = event.text || "";
    let cmd = text.split(" ")[0].replace("/","").toLowerCase().split("@")[0].replace(/[^a-z0-9]/g,"");
    if(cmd.startsWith("cover")) cmd = cmd.replace("cover","fbcover");
    if(!cmd.startsWith("fbcover")) cmd="fbcover";

    const BG_MAP = {
      fbcover: "1VrlsVNuCLBd59ys2KAyR2ltfb-SXL4CF",
      fbcover2: "1vkAVbmwAymQm0OIFHkufqg50n4o1MtAS",
      fbcover3: "1T39f36HAOKSEXoWYjwiq1KC-PFwtVddB",
      fbcover4: "1eT9SvjvAS05Q2Vh7yRpPYxaYPS9H3gHA",
      fbcover5: "1XhXOuKqciQDJ1kaknBAqLuF7-S-nCLlX",
      fbcover6: "1BXpsh8xYU_Y06vKUjoxDTbfKHv7BjFEd",
      fbcover7: "1PaEkp1Q3PKu_DJeeZtg3nvNXq4u3YKpt",
      fbcover8: "1-L9aRt0jBkGp1RafTwuUW22tbxCY3feJ"
    };

    let targetId = userId;
    if (event.reply_to_message) targetId = event.reply_to_message.from.id;

    const fullInput = args.join(" ");
    if (!fullInput ||!fullInput.includes("-")) {
      return await message.reply(
`┏━━━━━━━━━━━━━━━━┓
 🎨 FB COVER MENU 🎨
┗━━━━━━━━━━━━━━━━┛

📌 Example:
 /fbcover MOHAMMAD BADOL - 22 - KHULNA - badol@gmail.com - fb/B4D9L - Bot Developer

━━━━━━━━━━━━
🎨 AVAILABLE BG:
- /fbcover → BG-1
- /fbcover2 → BG-2
- /fbcover3 → BG-3
- /fbcover4 → BG-4
- /fbcover5 → BG-5
- /fbcover6 → BG-6
- /fbcover7 → BG-7
- /fbcover8 → BG-8

Format: Name - Age - Home - Mail - FB - Bio
━━━━━━━━━━━━
🛠 𝐄𝐒𝐁-𝐓𝐄𝐀𝐌`
      );
    }

    const parts = fullInput.split("-").map(i => i.trim());
    const uData = { name: parts[0]||"N/A", age: parts[1]||"N/A", home: parts[2]||"N/A", email: parts[3]||"N/A", fb: parts[4]||"N/A", bio: parts[5]||"N/A" };

    const loadingMsg = await message.reply(
`┏━━━━━━━━━━━━━━┓
 ⏳ ${cmd.toUpperCase()} ⏳
┗━━━━━━━━━━━━━━┛
🎨 BG: ${cmd}
👤 ${uData.name}`
    );

    try { const fp = path.join(__dirname,"../../fonts/Badol_1.ttf"); if(fs.existsSync(fp)) registerFont(fp,{family:"BadolFont"}); } catch{}

    try {
      let bgImg=null;
      try { const r=await axios.get(`https://drive.google.com/uc?export=download&id=${BG_MAP[cmd]}`,{responseType:'arraybuffer'}); bgImg=await loadImage(Buffer.from(r.data)); } catch {}
      if(!bgImg) {
        try{ await api.deleteMessage(chatId, loadingMsg.message_id); }catch{}
        return await message.reply(`❌ BG Fail: ${cmd}`);
      }

      const canvas=createCanvas(1640,856);
      const ctxs=canvas.getContext('2d');
      ctxs.drawImage(bgImg,0,0,1640,856);

      const dpX=115, dpY=165, dpSize=600;
      let dpLoaded=false;
      try {
        const photos = await api.getUserProfilePhotos(targetId, { limit: 1 });
        if(photos?.photos?.length>0){
          const fileId = photos.photos[0][photos.photos[0].length-1].file_id;
          const fileLink = await api.getFileLink(fileId);
          const res = await axios.get(fileLink.href,{responseType:'arraybuffer'});
          const uImg = await loadImage(Buffer.from(res.data));
          ctxs.save();
          ctxs.beginPath();
          ctxs.arc(dpX+dpSize/2, dpY+dpSize/2, dpSize/2, 0, Math.PI*2);
          ctxs.clip();
          ctxs.drawImage(uImg, dpX, dpY, dpSize, dpSize);
          ctxs.restore();
          ctxs.beginPath();
          ctxs.arc(dpX+dpSize/2, dpY+dpSize/2, dpSize/2+5, 0, Math.PI*2);
          ctxs.lineWidth=10;
          ctxs.strokeStyle="#FFFFFF";
          ctxs.stroke();
          dpLoaded=true;
        }
      } catch(e){ console.log("DP Error:", e.message); }

      ctxs.shadowBlur=12; ctxs.shadowColor="black"; ctxs.textAlign="left";
      const startX=850; let startY=280; const gap=65;
      ctxs.font=`bold 65px "BadolFont", Sans-Serif`; ctxs.fillStyle="#FFFFFF"; ctxs.fillText("OWNER PROFILE", startX, 180);
      ctxs.font=`bold 34px "BadolFont", Sans-Serif`;
      [
        { label: "NAME", val: uData.name, color: "#FFD700" },
        { label: "BORN", val: uData.age, color: "#FFFFFF" },
        { label: "HOME", val: uData.home, color: "#00FF00" },
        { label: "MAIL", val: uData.email, color: "#FF00FF" },
        { label: "LINK", val: uData.fb, color: "#FFA500" },
        { label: "BIO ", val: uData.bio, color: "#7CFC00" }
      ].forEach((f,i)=>{ ctxs.fillStyle=f.color; ctxs.fillText(`⚡ ${f.label}: [ ${f.val} ]`, startX, startY + (i*gap)); });
      ctxs.font=`bold 25px Arial`; ctxs.fillStyle="#00E5FF";
      ctxs.fillText(`USER ID: ${targetId}`, 850, 750); ctxs.fillText(`𝐄𝐒𝐁-𝐁𝐎𝐓: ${cmd.toUpperCase()}`, 1300, 750);

      const outPath=path.join(__dirname,`cover_${targetId}_${Date.now()}.png`);
      fse.writeFileSync(outPath, canvas.toBuffer('image/png'));

      try{ await api.deleteMessage(chatId, loadingMsg.message_id); }catch{}
      await api.sendPhoto(chatId, { source: outPath }, {
        caption: `┏━━━━━━━━━━━━━━━━┓\n 👑 ${cmd.toUpperCase()} DONE 👑\n┗━━━━━━━━━━━━━━━━┛\n👤 ${uData.name}\n🎨 BG: ${cmd}\n🆔 ${targetId}\n━━━━━━━━━━━━\n🛠 𝐄𝐒𝐁-𝐓𝐄𝐀𝐌`
      });
      fs.unlinkSync(outPath);

    } catch(e){
      console.log(e);
      try{ await api.deleteMessage(chatId, loadingMsg.message_id); }catch{}
      return await message.reply("❌ ERROR");
    }
  }
};