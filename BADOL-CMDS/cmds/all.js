// ✅ BADOL TG BOT - ALL TAG - HTML FIXED V3.1 - NO UTF-16 ERROR

module.exports = {
    config: {
        name: "all",
        version: "3.1-TG-FIXED",
        author: "MOHAMMAD BADOL",
        role: 1,
        description: "Tag everyone - HTML Fixed",
        category: "box chat",
        usage: "/all [message]",
        cooldown: 10,
        prefix: true
    },

    BADOL: async function({ api, chatId, args, message }) {
        const text = args.join(" ").trim();
        if (!message.isGroup) return await api.sendMessage(chatId, "❌ Group only!");

        try { await api.sendChatAction(chatId, 'typing'); } catch {}

        try {
            // ✅ DB থেকে Members
            let members = [];
            try {
                const thread = await message.db.getThread(chatId);
                if (thread?.members) members = thread.members;
                else if (thread?.userMessages) members = Object.keys(thread.userMessages);
            } catch {}

            if (members.length === 0) {
                try {
                    const admins = await api.getChatAdministrators(chatId);
                    members = admins.filter(a =>!a.user.is_bot).map(a => String(a.user.id));
                } catch {}
            }

            if (members.length === 0) {
                return await api.sendMessage(chatId,
                    `╭─⊰ 𝐄𝐒𝐁-𝐁𝐎𝐓 ⊱─╮\n`+
                    `│ ❌ Members not found!\n`+
                    `│ সবাই 1 টা মেসেজ দাও!\n`+
                    `╰──────────────────────╯`
                );
            }

            // ✅ HTML MENTION - UTF-16 Error 0%
            let mentionText = text? `${text}\n\n` : "";
            mentionText += `📢 Attention Everyone!\n━━━━━━━━━━━━\n`;

            let count = 0;
            let htmlText = "";

            for (const uid of members) {
                try {
                    const user = await message.db.getUser(uid).catch(()=>null);
                    const name = (user?.firstName || "User").replace(/[<>&]/g, ""); // HTML safe
                    htmlText += `<a href="tg://user?id=${uid}">${name}</a> `;
                    count++;
                    if (count % 5 === 0) htmlText += "\n";
                } catch {}
            }

            // 5 জন করে ভাগ করে পাঠাও (Telegram 4096 limit)
            const chunks = [];
            const names = htmlText.split(" ");
            let temp = "";
            for (let n of names) {
                if ((temp + n).length > 3500) {
                    chunks.push(temp);
                    temp = "";
                }
                temp += n + " ";
            }
            if (temp) chunks.push(temp);

            // First chunk with main text
            if (chunks.length > 0) {
                await api.sendMessage(chatId, mentionText + chunks[0], {
                    parse_mode: 'HTML',
                    reply_to_message_id: message.message_id
                });
                await new Promise(r => setTimeout(r, 700));

                // Rest chunks
                for (let i = 1; i < chunks.length; i++) {
                    await api.sendMessage(chatId, chunks[i], { parse_mode: 'HTML' });
                    await new Promise(r => setTimeout(r, 700));
                }
            }

            await api.sendMessage(chatId,
                `╭─⊰ 𝐄𝐒𝐁-𝐓𝐄𝐀𝐌 ⊱─╮\n`+
                `│ ✅ ${count} জনকে Tag!\n`+
                `│ 📝 ${text || "No message"}\n`+
                `╰──────────────────────╯`
            );

        } catch (e) {
            console.error("ALL Error:", e.message);
            return await api.sendMessage(chatId, `❌ Error: ${e.message}`);
        }
    }
};