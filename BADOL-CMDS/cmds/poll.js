// ╔════════════════════════════════════════════════════╗
// ║ BADOL-CMDS/cmds/poll.js - V9.0 MONGODB FIXED ║
// ╚════════════════════════════════════════════════════╝

const mongoose = require('mongoose');

// ✅ MongoDB Poll Model
let PollModel;
try {
  PollModel = mongoose.models.Poll || mongoose.model('Poll', new mongoose.Schema({
    pollId: { type: String, required: true, unique: true },
    question: String,
    options: [{ name: String, votes: Number }],
    voters: { type: Object, default: {} },
    creatorId: String,
    chatId: String,
    createdAt: String
  }));
} catch {
  PollModel = mongoose.models.Poll;
}

async function getPoll(pollId) {
  try { return await PollModel.findOne({ pollId }).lean(); } catch { return null; }
}
async function getAllPolls() {
  try { const all = await PollModel.find({}).lean(); let obj = {}; all.forEach(p=> obj[p.pollId]=p); return obj; } catch { return {}; }
}
async function savePoll(pollId, data) {
  try { await PollModel.findOneAndUpdate({ pollId }, { $set: data }, { upsert: true }); return true; } catch(e){ console.log("poll save err", e.message); return false; }
}
async function updatePoll(pollId, pollData) {
  try { await PollModel.findOneAndUpdate({ pollId }, { $set: pollData }, { upsert: true }); } catch(e){ console.log(e.message); }
}

module.exports = {
  config: {
    name: "poll",
    aliases: ["vote", "polls"],
    author: "MOHAMMAD BADOL",
    version: "9.0-MONGODB-FIXED",
    description: "Poll with | and - separator - MongoDB Permanent",
    category: "utility",
    usePrefix: true,
    role: 0,
    cooldown: 5
  },

  BADOL: async function({ api, chatId, userId, event, args, ctx }) {
    const senderId = userId || event?.from?.id || ctx?.from?.id || 0;
    const chat = chatId || event?.chat?.id || ctx?.chat?.id;
    const rawText = (args || []).join(" ").trim();

    if (!rawText) {
      return api.sendMessage(chat,
`╭─❖─〔 Poll Create 〕─❖─╮
│
│ 2 ভাবে বানাও:
│ /poll প্রশ্ন | Opt1 | Opt2
│ /poll প্রশ্ন - Opt1 - Opt2
│
│ Ex:
│ /poll Best Bot? - BADOL - Mirza
╰─❖─〔 𝐄𝐒𝐁-𝐁𝐎𝐓 〕─❖─╯
`);
    }

    let parts = [];
    if (rawText.includes("|")) {
      parts = rawText.split("|").map(s => s.trim()).filter(s => s);
    } else if (rawText.includes(" - ")) {
      parts = rawText.split(" - ").map(s => s.trim()).filter(s => s);
    } else if (rawText.includes("-")) {
      parts = rawText.split("-").map(s => s.trim()).filter(s => s);
    }

    if (parts.length < 3) {
      return api.sendMessage(chat, `❌ কমপক্ষে 2 টা Option লাগবে!\n\n✅ Ex:\n/poll Best Game? - Free Fire - PUBG\n/poll Best Game? | Free Fire | PUBG`);
    }

    const question = parts[0];
    const options = parts.slice(1).slice(0, 8);
    const pollId = Date.now().toString();

    const pollData = {
      pollId,
      question,
      options: options.map(name => ({ name, votes: 0 })),
      voters: {},
      creatorId: String(senderId),
      chatId: String(chat),
      createdAt: new Date().toLocaleString("en-BD", { timeZone: "Asia/Dhaka" })
    };

    await savePoll(pollId, pollData);
    console.log(`[POLL] Created ${pollId} - MongoDB Saved`);

    const { text, keyboard } = buildPollContent(pollData, pollId);
    try {
      await api.sendMessage(chat, text, { parse_mode: "HTML", reply_markup: { inline_keyboard: keyboard } });
    } catch (e) {
      console.log("Poll Send Error:", e.message);
      await api.sendMessage(chat, text).catch(()=>{});
    }
  },

  onCallback: async function({ event, api, ctx }) {
    const query = event;
    const data = query?.data || query?.callback_query?.data;
    if (!data ||!data.startsWith("poll_")) return;

    const parts = data.split("_");
    const pollId = parts[1];
    const optIndex = parseInt(parts[2]);

    let poll = await getPoll(pollId);
    if (!poll) {
      try { await ctx.answerCbQuery("❌ Poll Expired! (MongoDB Not Found)", { show_alert: true }); } catch {}
      return;
    }

    const userId = String(query.from.id);
    const oldVote = poll.voters[userId];

    if (oldVote === optIndex) {
      poll.options[optIndex].votes--;
      delete poll.voters[userId];
      try { await ctx.answerCbQuery(`❌ Vote Removed!`); } catch {}
    } else {
      if (oldVote!== undefined) poll.options[oldVote].votes = Math.max(0, poll.options[oldVote].votes - 1);
      poll.options[optIndex].votes++;
      poll.voters[userId] = optIndex;
      try { await ctx.answerCbQuery(`✅ Voted: ${poll.options[optIndex].name}`); } catch {}
    }

    await updatePoll(pollId, poll);

    const { text, keyboard } = buildPollContent(poll, pollId);
    try {
      await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: { inline_keyboard: keyboard } });
    } catch {}
  }
};

function buildPollContent(poll, pollId) {
  const totalVotes = poll.options.reduce((a, b) => a + b.votes, 0);
  let text = `📊 <b>${poll.question}</b>\n━━━━━━━━━━━━━━━━━━\n\n`;
  poll.options.forEach((opt, i) => {
    const percent = totalVotes === 0? 0 : Math.round((opt.votes / totalVotes) * 100);
    const filled = Math.round(percent / 10);
    const bar = "█".repeat(filled) + "░".repeat(10 - filled);
    text += `${i + 1}. <b>${opt.name}</b>\n ${bar} ${percent}% (${opt.votes} vote)\n\n`;
  });
  text += `━━━━━━━━━━━━━━━━━━\n🗳️ Total Votes: ${totalVotes} জন\n💾 MongoDB Permanent\n💡 Button চেপে Vote দাও!`;

  const keyboard = poll.options.map((opt, i) => {
    const percent = totalVotes === 0? 0 : Math.round((opt.votes / totalVotes) * 100);
    return [{ text: `${opt.name} [${opt.votes} - ${percent}%]`, callback_data: `poll_${pollId}_${i}` }];
  });

  return { text, keyboard };
}