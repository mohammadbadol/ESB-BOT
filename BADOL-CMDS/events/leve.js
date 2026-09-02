const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");
const { createCanvas, loadImage } = require("canvas");

const BG_URL = "https://drive.google.com/uc?export=download&id=1vQ8YcgfR0Hi1ov5e8Eh56qU5-eQz3RWN";
const CACHE_DIR = path.join(__dirname, "../../data/BADOL/cache/leave");

function safeName(str, len=18){
  try{
    if(!str) return "Unknown";
    str=String(str).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
    if(!str) return "Unknown";
    const arr=Array.from(str);
    if(arr.length>len) return arr.slice(0,len).join("")+"…";
    return arr.join("");
  }catch{ return "Unknown"; }
}

async function getAvatarUrl(tg, userId) {
  try {
    const p = await tg.getUserProfilePhotos(userId);
    if (p && p.total_count > 0) {
      const f = p.photos[0].at(-1).file_id;
      const link = await tg.getFileLink(f);
      return link.href;
    }
  } catch {}
  return null;
}

async function createBanner(d) {
  const W = 1416, H = 856;
  const c = createCanvas(W, H);
  const ctx = c.getContext("2d");

  try {
    const bgP = path.join(CACHE_DIR, `goodbye_bg.jpg`);
    if (!fs.existsSync(bgP)) {
      const r = await axios({ url: BG_URL, method: "GET", responseType: "arraybuffer", timeout: 15000 });
      fs.writeFileSync(bgP, Buffer.from(r.data));
    }
    const bg = await loadImage(bgP);
    ctx.drawImage(bg, 0, 0, W, H);
  } catch {
    ctx.fillStyle = "#1a0000";
    ctx.fillRect(0, 0, W, H);
  }

  ctx.fillStyle = "rgba(50,0,0,0.6)";
  ctx.fillRect(0, 0, W, H);

  async function loadCircle(url, x, y, s, glow) {
    if (!url) return;
    try {
      const r = await axios.get(url, { responseType: "arraybuffer", timeout: 8000 });
      const img = await loadImage(r.data);
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, s, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, x - s - 15, y - s - 15, (s + 15) * 2, (s + 15) * 2);
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, s + 4, 0, Math.PI * 2);
      ctx.strokeStyle = glow;
      ctx.lineWidth = 9;
      ctx.shadowColor = glow;
      ctx.shadowBlur = 35;
      ctx.stroke();
      ctx.restore();
    } catch {}
  }

  await loadCircle(d.avatarUrl, 260, 320, 145, "#FF0000");
  await loadCircle(d.groupImage, 708, 340, 130, "#A020F0");
  await loadCircle(d.kickerAvatar, 1150, 320, 145, "#FFAA00");

  function drawLabel(x, y, t, n) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(x - 110, y, 220, 75);
    ctx.strokeStyle = "#ff5555";
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 110, y, 220, 75);
    ctx.restore();

    ctx.textAlign = "center";
    ctx.shadowColor = "#ff0000";
    ctx.shadowBlur = 15;
    ctx.fillStyle = "#ff8888";
    ctx.font = "bold 20px Arial";
    ctx.fillText(t, x, y + 22);

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff";
    ctx.font = "bold 22px Arial";
    const displayName = n? n : "Unknown";
    ctx.fillText((displayName.length > 14? displayName.substring(0, 14) + ".." : displayName).toUpperCase(), x, y + 50);
  }

  drawLabel(260, 520, "LEFT USER", d.name);
  drawLabel(708, 520, "GROUP", d.groupName);
  drawLabel(1150, 520, d.kickType, d.kickerName);

  ctx.textAlign = "center";
  ctx.shadowColor = "#ff0000";
  ctx.shadowBlur = 25;
  ctx.fillStyle = "#fff";
  ctx.font = "bold 64px Arial";
  ctx.fillText("GOODBYE", W / 2, 110);

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ff8888";
  ctx.font = "bold 28px Arial";
  ctx.fillText("WE WILL MISS YOU", W / 2, 170);

  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.lineTo(W, 10);
  ctx.strokeStyle = "#FF0000";
  ctx.lineWidth = 5;
  ctx.shadowColor = "#FF0000";
  ctx.shadowBlur = 25;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, H - 10);
  ctx.lineTo(W, H - 10);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#fff";
  ctx.font = "bold 22px Arial";
  ctx.fillText(`𝐄𝐒𝐁-𝐁𝐎𝐓 • ${d.member} Members Left`, W / 2, H - 25);

  // 🔥 JPEG 60% = NO SOCKET HANG
  return c.toBuffer("image/jpeg", { quality: 0.6 });
}

module.exports = {
  config: {
    name: "leave",
    author: "MOHAMMAD BADOL",
    version: "5.0 SOCKET FIX",
    description: "Goodbye kick+leave - Premium Box",
    eventType: "left_member"
  },
  BADOL: async function ({ event, api, leftMember, ctx }) {
    try {
      const tg = api.telegram? api.telegram : (api || ctx?.telegram || (global.bot && global.bot.telegram));
      const chat = event?.chat || ctx?.chat;
      if (!chat) return;

      const chatId = chat.id;
      const chatTitle = chat.title || "group";
      const BOT_TOKEN = api.token || tg.token || global.config.botToken;

      await fs.promises.mkdir(CACHE_DIR, { recursive: true });

      const member = leftMember || event?.left_chat_member || (event?.message && event.message.left_chat_member) || ctx?.left_chat_member;
      if (!member || member.is_bot) return;

      const rawName = member.first_name? (member.first_name + (member.last_name? ' ' + member.last_name : '')) : "User";
      const userName = safeName(rawName, 16);
      const botName = global.config.botInfo?.name || global.config.botName || 'Eren-AI';
      const safeGroup = safeName(chatTitle, 18);

      let kickerName = "Unknown", kickType = "LEFT";
      try {
        const actor = event?.from || ctx?.from;
        if (actor) {
          kickerName = safeName(actor.first_name || "Unknown", 12);
          if (actor.id === member.id) {
            kickType = "SELF LEAVE";
          } else {
            kickType = "KICKED BY";
          }
        }
      } catch {}

      let groupImageUrl = null;
      try {
        const cp = await tg.getChat(chatId);
        if (cp && cp.photo) {
          const link = await tg.getFileLink(cp.photo.big_file_id);
          groupImageUrl = link.href;
        }
      } catch {}

      const avatarUrl = await getAvatarUrl(tg, member.id);
      const actorId = (event?.from?.id || ctx?.from?.id);
      const kickerAvatarUrl = actorId? await getAvatarUrl(tg, actorId) : null;

      let memberCount = 0;
      try { memberCount = await tg.getChatMembersCount(chatId); } catch {}

      const buffer = await createBanner({
        name: rawName,
        kickerName,
        groupName: chatTitle,
        member: memberCount,
        avatarUrl,
        kickerAvatar: kickerAvatarUrl,
        groupImage: groupImageUrl || avatarUrl,
        kickType
      });

      const bdTime = new Date().toLocaleString("en-BD", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit", hour12: true });
      const reason = kickType === "KICKED BY"? `👢 Kicked: ${kickerName}` : `🚶 ${kickType}`;

      const msg =
`╭─❖─〔 ${botName} 〕─❖─╮
│ 👋 𝐆𝐎𝐃𝐁𝐘𝐄 𝐅𝐀𝐌𝐈𝐋𝐘!
├──────────────────────┤
│ 👤 𝐍𝐚𝐦𝐞: ${userName}
│ 🆔 𝐈𝐃: ${member.id}
│ 🏠 𝐆𝐫𝐨𝐮𝐩: ${safeGroup}
│ ${reason}
│ ⏰ ${bdTime}
│ 🔢 𝐋𝐞𝐟𝐭: ${memberCount} Members
├──────────────────────┤
│ 😢 Miss you 🌙
╰─❖─〔 𝐄𝐒𝐁-𝐓𝐄𝐀𝐌 〕─❖─╯`;

      // 🔥 DIRECT SEND - SAME AS UP & WELCOME
      try {
        const form = new FormData();
        form.append('chat_id', String(chatId));
        form.append('caption', msg);
        form.append('photo', buffer, { filename: 'leave.jpg', contentType: 'image/jpeg' });

        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, form, {
          headers: form.getHeaders(),
          timeout: 30000,
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        });
      } catch (e) {
        console.log("Leave Photo Fail:", e.message);
        await tg.sendMessage(chatId, msg).catch(()=>{});
      }

    } catch (e) {
      console.log("[LEAVE ERROR FIXED]", e.message);
    }
  }
};