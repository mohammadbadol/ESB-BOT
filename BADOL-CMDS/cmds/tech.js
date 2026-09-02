const axios = require('axios');

module.exports = {
    config: {
        name: "tech",
        aliases: ["th"],
        version: "1.0 BADOL TG",
        author: "MOHAMMAD BADOL",
        role: 0,
        cooldown: 5,
        prefix: true,
        description: "Teach sim",
        category: "sim",
        guide: "/tech question - answer"
    },

    BADOL: async function ({ api, chatId, event, args }) {
        const info = args.join(" ");

        if (!info ||!info.includes("-")) {
            return await api.sendMessage(chatId,
`╭─❏ 𝐄𝐒𝐁-𝐓𝐄𝐀𝐌
│ ⚠️ Wrong Format!
│ 🛠 Usage:
│ /tech question - answer
│
│ Ex: /tech hi - hello jan
╰──────────────`,
                { reply_to_message_id: event.message_id }
            );
        }

        const msg = info.split("-");
        const ask = msg[0].trim();
        const ans = msg.slice(1).join("-").trim(); // Answer এ - থাকলেও কাজ করবে

        if (!ask ||!ans) {
            return await api.sendMessage(chatId, "❌ Question & Answer দুটোই দিতে হবে!", { reply_to_message_id: event.message_id });
        }

        try {
            const apis = await axios.get('https://raw.githubusercontent.com/MOHAMMAD-NAYAN-OFFICIAL/Nayan/main/api.json');
            const teach = apis.data.sim;

            await axios.get(`${teach}/sim?type=teach&ask=${encodeURIComponent(ask)}&ans=${encodeURIComponent(ans)}`);

            return await api.sendMessage(chatId,
`╭─❏ DATA SAVED! ✅
│ 📝 Question: ${ask}
│ 💬 Answer: ${ans}
│ 🤖 𝐄𝐒𝐁-𝐁𝐎𝐓
╰──────────────`,
                { reply_to_message_id: event.message_id }
            );

        } catch (error) {
            console.error("TECH ERROR:", error.message);
            return await api.sendMessage(chatId,
`╭─❏ ERROR! ❌
│ Failed to save data
│ ${error.message}
╰──────────────`,
                { reply_to_message_id: event.message_id }
            );
        }
    }
};