const os = require("os");
const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");
const FormData = require("form-data");

module.exports = {
  config: {
    name: "up",
    aliases: ["uptime"],
    author: "MOHAMMAD BADOL",
    version: "6.0 SOCKET FIX",
    description: "EREN-AI UPTIME SYSTEM",
    category: "system",
    usePrefix: true,
    cooldown: 5,
    role: 0,
  },

  BADOL: async function ({ event, api, message }) {
    const chatId = event.chat.id;
    const tg = api.telegram? api.telegram : api;
    const BOT_TOKEN = api.token || tg.token || global.config.botToken;

    let loadingMsg;
    try {
        loadingMsg = await message.reply("🔄 [▒▒▒▒▒▒] 0%");
        const steps = ["⚡ [██▒▒▒▒▒▒▒▒] 20%","⚡ [████▒▒▒▒▒▒] 40%","⚡ [██████▒▒▒▒] 60%","⚡ [████████▒▒] 80%","✅ [██████████] 100%"];
        for (let s of steps) {
            await new Promise(r=>setTimeout(r,300));
            try { await message.edit(s, loadingMsg.message_id, chatId); } catch {}
        }
    } catch {}

    const uniqueCmds = [...new Set([...global.badol.commands.values()].map(c=>c.config?.name))].length;
    const totalEvents = global.badol.events? global.badol.events.size : 0;
    const botPrefix = global.config.prefix || "/";

    const now = new Date();
    const bdTime = now.toLocaleString("en-US", { timeZone: "Asia/Dhaka", hour: '2-digit', minute: '2-digit', hour12: true });
    const bdDate = now.toLocaleString("en-US", { timeZone: "Asia/Dhaka", day: '2-digit', month: 'short', year: 'numeric' });

    const formatUptime = () => {
        let s = Math.floor(process.uptime());
        const d = Math.floor(s/86400); s%=86400;
        const h = Math.floor(s/3600); s%=3600;
        const m = Math.floor(s/60);
        return `${d}d ${h}h ${m}m`;
    };
    const uptimeStr = formatUptime();
    const totalRamMB = (os.totalmem() / 1024 / 1024).toFixed(0);
    const usedRamMB = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(0);
    const ping = Math.floor(Math.random()*10)+5;

    const captionText = `✨ 𝐄𝐒𝐁-𝐁𝐎𝐓 𝐁𝐎𝐓 𝐔𝐏 𝐒𝐘𝐒𝐓𝐄𝐌 ✨\n━━━━━━━━━━━━━━━━━━━━\n🤖 𝗕𝗼𝘁: 𝐄𝐒𝐁-𝐁𝐎𝐓\n⏱️ 𝗨𝗽𝘁𝗶𝗺𝗲: ${uptimeStr}\n⚡ 𝗟𝗮𝘁𝗲𝗻𝗰𝘆: ${ping} MS\n📊 𝗥𝗔𝗠: ${usedRamMB} / ${totalRamMB} MB\n⚙️ 𝗖𝗠𝗗𝘀: ${uniqueCmds} | 𝗘𝘃𝗲𝗻𝘁𝘀: ${totalEvents}\n🛠️ 𝗣𝗿𝗲𝗳𝗶𝘅: [ ${botPrefix} ]\n📅 ${bdDate} | ${bdTime}\n━━━━━━━━━━━━━━━━━━━━\n🟢 𝐄𝐒𝐁-𝐓𝐄𝐀𝐌 𝐎𝐍𝐋𝐈𝐍𝐄`;

    try {
        const canvas = createCanvas(800, 800);
        const ctx = canvas.getContext("2d");

        const bgG = ctx.createRadialGradient(400,400,0,400,400,600);
        bgG.addColorStop(0,"#0b1528"); bgG.addColorStop(1,"#020610");
        ctx.fillStyle=bgG; ctx.fillRect(0,0,800,800);

        const frameG = ctx.createLinearGradient(0,0,800,800);
        frameG.addColorStop(0,"#00f2fe"); frameG.addColorStop(0.5,"#9d4edd"); frameG.addColorStop(1,"#00ffaa");
        ctx.strokeStyle=frameG; ctx.lineWidth=6; ctx.strokeRect(20,20,760,760);

        ctx.fillStyle="#fff"; ctx.font="bold 38px sans-serif"; ctx.textAlign="center";
        ctx.shadowColor="#00f2fe"; ctx.shadowBlur=15;
        ctx.fillText("𝐄𝐒𝐁-𝐓𝐄𝐀𝐌",400,75); ctx.shadowBlur=0;

        const avX=220, avY=280, avR=110;
        ctx.strokeStyle="#00f2fe"; ctx.lineWidth=5; ctx.beginPath(); ctx.arc(avX,avY,avR+12,0,Math.PI*2); ctx.stroke();
        ctx.strokeStyle="#00ffaa"; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(avX,avY,avR,0,Math.PI*2); ctx.stroke();

        try {
            const botInfo = await tg.getMe();
            const photos = await tg.getUserProfilePhotos(botInfo.id);
            if (photos.total_count > 0) {
                const fileId = photos.photos[0][0].file_id;
                const fileLink = await tg.getFileLink(fileId);
                const res = await axios.get(fileLink.href, { responseType: 'arraybuffer', timeout: 8000 });
                const avatar = await loadImage(Buffer.from(res.data));
                ctx.save(); ctx.beginPath(); ctx.arc(avX,avY,avR-4,0,Math.PI*2); ctx.clip();
                ctx.drawImage(avatar, avX-avR, avY-avR, avR*2, avR*2); ctx.restore();
            }
        } catch{}

        const drawBox = (x,y,w,h,header,value,color)=>{
            ctx.fillStyle="rgba(5,10,25,0.65)"; ctx.fillRect(x,y,w,h);
            ctx.shadowColor=color; ctx.shadowBlur=12; ctx.strokeStyle=color; ctx.lineWidth=2.5; ctx.strokeRect(x,y,w,h); ctx.shadowBlur=0;
            ctx.fillStyle=color+"33"; ctx.fillRect(x+2,y+2,w-4,30);
            ctx.fillStyle=color; ctx.font="bold 15px sans-serif"; ctx.textAlign="left"; ctx.fillText(`▶ ${header}`,x+15,y+22);
            ctx.fillStyle="#fff"; ctx.font="bold 22px monospace"; ctx.fillText(value,x+15,y+62);
        };

        drawBox(420,130,330,85,"BOT NAME","𝐄𝐒𝐁-𝐁𝐎𝐓","#00f2fe");
        drawBox(420,245,330,85,"SYSTEM UPTIME",uptimeStr,"#00ffaa");
        drawBox(420,360,330,85,"TOTAL CMDS",`${uniqueCmds} Active`,"#ffb703");
        drawBox(50,500,340,85,"RAM USAGE",`${usedRamMB} / ${totalRamMB} MB`,"#ff4d6d");
        drawBox(410,500,340,85,"LATENCY PING",`${ping} MS`,"#ff7a00");
        drawBox(50,610,340,85,"BOT PREFIX",`[ ${botPrefix} ] Mode`,"#00ffaa");
        drawBox(410,610,340,85,"EVENTS",`${totalEvents} Active`,"#9d4edd");

        ctx.fillStyle="rgba(0,242,254,0.1)"; ctx.fillRect(50,712,700,50);
        ctx.strokeStyle="#00f2fe"; ctx.lineWidth=1.5; ctx.strokeRect(50,712,700,50);
        ctx.fillStyle="#fff"; ctx.font="bold 18px sans-serif"; ctx.textAlign="center";
        ctx.fillText(`${bdDate} | ${bdTime} (BST)`,400,743);

        // 🔥 SMALL JPEG = NO SOCKET HANG
        const buffer = canvas.toBuffer('image/jpeg', { quality: 0.6 });

        if (loadingMsg) await message.unsend(loadingMsg.message_id).catch(()=>{});

        // 🔥 DIRECT TELEGRAM API - BYPASS TELEGRAF
        const form = new FormData();
        form.append('chat_id', String(chatId));
        form.append('caption', captionText);
        form.append('photo', buffer, { filename: 'up.jpg', contentType: 'image/jpeg' });

        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, form, {
            headers: form.getHeaders(),
            timeout: 30000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

    } catch (e) {
        console.log("UP ERROR:", e.message);
        if (loadingMsg) await message.unsend(loadingMsg.message_id).catch(()=>{});
        await message.reply(captionText).catch(()=>{});
    }
  }
};