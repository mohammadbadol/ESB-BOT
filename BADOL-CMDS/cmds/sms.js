/**
 * 🤖 MCS-BOT COMMAND: SMS BOMBER (PROTECTED)
 * 👤 AUTHOR: MOHAMMAD BADOL
 * 📅 YEAR: 2026
 * ✅ COMPATIBLE WITH BADOL-TG-BOT V8.6 FINAL
 */

const axios = require("axios");

module.exports = {
    config: {
        name: "sms",
        aliases: ["smsbom", "bomber"],
        version: "1.4.6",
        author: "MOHAMMAD BADOL",
        credit: "MOHAMMAD BADOL",
        cooldown: 10,
        role: 0,
        usePrefix: true,
        category: "Tools",
        shortDescription: "Public SMS Bomber",
        guide: "{pn} [ফোন নম্বর]"
    },

    // BADOL-TG-BOT V8.6+ Format
    BADOL: async function ({ event: msg, api: bot, args, message, chatId, userId }) {
        const phoneNumber = args[0];

        // ১. ফোন নম্বর চেক
        if (!phoneNumber || phoneNumber.length < 11) {
            let usage = `⚠️ **「 INVALID INPUT 」**\n━━━━━━━━━━━━━━━━━━━━\n`;
            usage += `📱 সঠিক ১১ ডিজিটের ফোন নম্বর দিন।\n💡 উদাহরণ: \`/smsbom 017xxxxxxxx\``;
            return message.reply(usage);
        }

        // ২. নির্দিষ্ট নম্বর প্রোটেকশন (Blacklist System)
        const protectedNumber = "01782721761";
        if (phoneNumber === protectedNumber) {
            let notice = `🚫 **「 ACCESS DENIED 」**\n━━━━━━━━━━━━━━━━━━━━\n`;
            notice += `⚠️ দুঃখিত, এই নম্বরটি **সিস্টেম দ্বারা সুরক্ষিত।**\n`;
            notice += `❌ এই নম্বরে SMS বোম্বিং করা সম্ভব নয়।`;
            return message.reply(notice);
        }

        // ৩. ওয়েটিং মেসেজ
        const waitMsg = await message.reply("⏳ **বক্স জেনারেট হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...**");

        // ৪. এপিআই কল
        const apiUrl = `https://mahbub-ullash.cyberbot.top/api/sms-bomber?api_key=hello_world&phone=${phoneNumber}`;

        try {
            const response = await axios.get(apiUrl);
            const data = response.data;

            const totalSuccess = data.api2?.raw?.success_count || 0;
            const totalFailed = data.api2?.raw?.failed_count || 0;
            const statusMsg = data.api2?.message || "সম্পন্ন হয়েছে";

            // ৫. রেজাল্ট ফরম্যাটিং
            let resultMsg = `<b>┏━━━━━━ 𝐄𝐒𝐁-𝐓𝐄𝐀𝐌 ━━━━━━┓</b>\n`;
            resultMsg += `┃ 📱 <b>Target:</b> <code>${phoneNumber}</code> \n`;
            resultMsg += `┃ 🚀 <b>Status:</b> ${statusMsg} \n`;
            resultMsg += `┣━━━━━━━━━━━━━━━━━━━━━━━┫\n`;
            resultMsg += `┃ ✅ <b>Total Success:</b> ${totalSuccess} \n`;
            resultMsg += `┃ ❌ <b>Total Failed:</b> ${totalFailed} \n`;
            resultMsg += `┣━━━━━━━━━━━━━━━━━━━━━━━┫\n`;
            resultMsg += `┃ 👤 <b>Credit:</b> ${this.config.credit} \n`;
            resultMsg += `<b>┗━━━━━━━━━━━━━━━━━━━━━━━┛</b>`;

            await bot.editMessageText(resultMsg, {
                chat_id: chatId,
                message_id: waitMsg.message_id,
                parse_mode: "HTML"
            });

        } catch (error) {
            console.error("SMS Bomber Error:", error);
            await bot.editMessageText("❌ **এপিআই সার্ভার ত্রুটি!** পরে আবার চেষ্টা করুন।", {
                chat_id: chatId,
                message_id: waitMsg.message_id,
                parse_mode: "Markdown"
            });
        }
    }
};
