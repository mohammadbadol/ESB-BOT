/**
 * 🛠️ BADOL-TG-BOT COMMAND: VOICE (BANGLA TTS)
 * 👤 AUTHOR: MOHAMMAD BADOL
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

module.exports = {
    config: {
        name: "say",
        aliases: ["voice", "x", "speak"],
        version: "1.0.9",
        author: "MOHAMMAD BADOL",
        role: 0,
        cooldown: 5,
        description: "Convert Bangla text to voice",
        category: "utility",
        guide: "voice <text> or reply",
        prefix: true
    },

    BADOL: async function ({ api, chatId, event, args }) {
        const cacheDir = path.join(__dirname, "cache");
        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

        let input = "";
        if (event.reply_to_message && (event.reply_to_message.text || event.reply_to_message.caption)) {
            input = event.reply_to_message.text || event.reply_to_message.caption;
        } else {
            input = args.join(" ");
        }

        if (!input) {
            return await api.sendMessage(chatId, "🔊 Bangla sentence লিখুন বা Reply দিন\n\n💡 Example: /voice Ami tomake bhalobashi");
        }

        if (input.length > 200) {
            return await api.sendMessage(chatId, "❌ 200 Character এর বেশি Support করে না!");
        }

        const wait = await api.sendMessage(chatId, "🎙️ Generating Voice...");

        const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=bn&client=tw-ob&q=${encodeURIComponent(input)}`;
        const filePath = path.join(cacheDir, `tts_${event.from.id}_${Date.now()}.mp3`);
        const file = fs.createWriteStream(filePath);

        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                try { fs.unlinkSync(filePath); } catch {}
                api.deleteMessage(chatId, wait.message_id).catch(()=>{});
                return api.sendMessage(chatId, "❌ TTS Failed! Google Server Error");
            }

            response.pipe(file);

            file.on("finish", async () => {
                file.close(async () => {
                    try {
                        const stats = fs.statSync(filePath);
                        if (stats.size < 100) {
                            try { fs.unlinkSync(filePath); } catch {}
                            await api.deleteMessage(chatId, wait.message_id).catch(()=>{});
                            return await api.sendMessage(chatId, "❌ Audio Generate Failed!");
                        }

                        await api.deleteMessage(chatId, wait.message_id).catch(()=>{});

                        // ✅ Telegram Voice Send
                        await api.sendVoice(chatId, { source: filePath }, {
                            caption: `🎙️ 𝐄𝐒𝐁-𝐓𝐄𝐀𝐌 𝗕𝗮𝗻𝗴𝗹𝗮 𝗧𝗧𝗦\n📝 ${input.slice(0,100)}`
                        });

                        try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}

                    } catch (e) {
                        console.log(e);
                        await api.sendMessage(chatId, "❌ Send Failed!");
                        try { fs.unlinkSync(filePath); } catch {}
                    }
                });
            });

            file.on("error", async () => {
                try { fs.unlinkSync(filePath); } catch {}
                await api.deleteMessage(chatId, wait.message_id).catch(()=>{});
                await api.sendMessage(chatId, "❌ File Write Error!");
            });

        }).on("error", async (err) => {
            console.log("HTTPS Error:", err.message);
            try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
            await api.deleteMessage(chatId, wait.message_id).catch(()=>{});
            await api.sendMessage(chatId, "❌ Network Error!");
        });
    }
};