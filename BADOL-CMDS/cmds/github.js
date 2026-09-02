// ✅ BADOL TG BOT - GITHUB INFO - CONVERTED V4.2

const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
    config: {
        name: "github",
        version: "4.2.0-TG",
        author: "MOHAMMAD BADOL",
        cooldown: 5,
        role: 0,
        prefix: true,
        category: "information",
        description: "GitHub profile info",
        usage: "/github [username]",
        aliases: ["gh", "git"]
    },

    BADOL: async function({ api, chatId, args, message }) {
        if (!args[0]) {
            return await api.sendMessage(chatId,
                `╭─[ 🐙 GITHUB SYSTEM ]─╮\n`+
                `│ ❌ GitHub username দাও!\n│\n`+
                `│ 💡 Example:\n`+
                `│ /github torvalds\n`+
                `│ /github mohammadbadol\n`+
                `╰───────────────╯`,
                { reply_to_message_id: message.message_id }
            );
        }

        const username = args[0];
        const waitMsg = await api.sendMessage(chatId, "⏳ Fetching GitHub data...", { reply_to_message_id: message.message_id });

        try {
            const url = `https://api.github.com/users/${username}`;
            const res = await axios.get(url, {
                headers: { "User-Agent": "Eren-AI" },
                timeout: 15000
            });

            const u = res.data;

            const box = `╭─────────────────╮\n`+
                `│ 🤖 𝐄𝐒𝐁-𝐁𝐎𝐓 │\n`+
                `├─────────────────┤\n`+
                `│ 🐙 Username: ${u.login}\n`+
                `│ 🆔 ID: ${u.id}\n`+
                `│ 🔖 Type: ${u.type}\n`+
                `│ 📝 Bio: ${u.bio || "N/A"}\n`+
                `│ 🏢 Company: ${u.company || "N/A"}\n`+
                `│ 📍 Location: ${u.location || "N/A"}\n`+
                `│ 🌐 Blog: ${u.blog || "N/A"}\n`+
                `│ 📧 Email: ${u.email || "Hidden"}\n`+
                `├─────────────────┤\n`+
                `│ 📦 Repos: ${u.public_repos}\n`+
                `│ ⭐ Gists: ${u.public_gists}\n`+
                `│ 👥 Followers: ${u.followers}\n`+
                `│ ➡️ Following: ${u.following}\n`+
                `│ 🟢 Hireable: ${u.hireable? "Yes" : "No"}\n`+
                `├─────────────────┤\n`+
                `│ 📅 Created: ${new Date(u.created_at).toDateString()}\n`+
                `│ 🕒 Updated: ${new Date(u.updated_at).toDateString()}\n`+
                `╰─────────────────╯\n\n`+
                `🔗 ${u.html_url}`;

            try { await api.deleteMessage(chatId, waitMsg.message_id); } catch {}

            if (u.avatar_url) {
                try {
                    // ✅ TG FIXED - sendPhoto with URL direct
                    await api.sendPhoto(chatId, u.avatar_url, {
                        caption: box,
                        reply_to_message_id: message.message_id
                    });
                } catch {
                    await api.sendMessage(chatId, box, { reply_to_message_id: message.message_id });
                }
            } else {
                await api.sendMessage(chatId, box, { reply_to_message_id: message.message_id });
            }

        } catch (e) {
            try { await api.deleteMessage(chatId, waitMsg.message_id); } catch {}

            if (e.response?.status === 404) {
                return await api.sendMessage(chatId,
                    `╭─[ ❌ ERROR ]─╮\n│ GitHub user not found!\n│ Check username\n╰───────────────╯`,
                    { reply_to_message_id: message.message_id }
                );
            }

            return await api.sendMessage(chatId,
                `╭─[ ⚠️ ERROR ]─╮\n│ API Fail!\n│ Try again later\n╰───────────────╯`,
                { reply_to_message_id: message.message_id }
            );
        }
    }
};