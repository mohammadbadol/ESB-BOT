const axios = require('axios');
const fs = require('fs');
const path = require('path');

const makeBox = (title, lines) => {
  let msg = '╭━❮ ' + title + ' ❯━╮\n';
  const arr = Array.isArray(lines)? lines : lines.split('\n');
  for (const line of arr) {
    if(line) msg += '├‣ ' + line + '\n';
  }
  msg += '├━─━─━━──━─━─━\n';
  msg += '├‣ 𝐄𝐒𝐁-𝐁𝐎𝐓\n';
  msg += '╰━──━─━─━━─━─━❍';
  return msg;
};

module.exports = {
  config: {
    name: "event",
    aliases: ["ev"],
    author: "MOHAMMAD BADOL",
    version: "6.0 LIST+BUTTON FIXED",
    cooldown: 5,
    role: 2,
    description: "Premium Event Manager",
    category: "system",
    usePrefix: true
  },

  BADOL: async function ({ event, api, args, message, ctx }) {
    try {
      const eventsPath = path.join(__dirname, '..', 'events');

      if (event.reply_to_message && event.reply_to_message.document) {
        const doc = event.reply_to_message.document;
        if (!doc.file_name.endsWith('.js')) return message.reply(makeBox('⚠️ ERROR', 'Only.js files allowed!'));
        let fileName = doc.file_name;
        if (args[0] && args[0].endsWith('.js')) fileName = args[0];
        try {
          const fileLink = await ctx.telegram.getFileLink(doc.file_id);
          const response = await axios.get(fileLink.href);
          let code = response.data;
          const filePath = path.join(eventsPath, fileName);
          if (fs.existsSync(filePath)) {
            const buttons = [[{ text: '✅ REPLACE', callback_data: 'evt_replace_' + fileName }, { text: '📝 RENAME', callback_data: 'evt_rename_' + fileName }],[{ text: '❌ CANCEL', callback_data: 'evt_cancel' }]];
            global.badol.onCallback.set('evt_install_' + fileName, { fileName: fileName, code: code, userId: event.from.id });
            return await api.sendMessage(event.chat.id, makeBox('⚠️ FILE EXISTS', ['File Name: ' + fileName, 'Already exists!']), { reply_markup: { inline_keyboard: buttons } });
          }
          const result = global.installEventFile(fileName, code);
          if (result.success) {
            await global.reloadEvent(fileName.replace('.js',''));
            return message.reply(makeBox('✅ INSTALLED', ['File Name: ' + fileName, 'Installed ✅']));
          }
        } catch (e) { return message.reply(makeBox('❌ FAILED', ['Failed: ' + e.message])); }
      }

      if (args.length === 0) {
        return message.reply(makeBox('⚙️ EVENT MANAGER', ['install <name.js>','load <name>','unload <name>','loadall','del <name>','list','','Reply to list:','get 1 2 3','del 1 2 3']));
      }

      const action = args[0].toLowerCase();

      if (action === 'install' || action === 'add') {
        if (args.length < 2) return message.reply(makeBox('❌ USAGE', 'Usage: event install <file.js> <code|url>'));
        const fileName = args[1];
        if (!fileName.endsWith('.js')) return message.reply(makeBox('❌ ERROR', 'Filename must end with.js'));
        const codeOrUrl = args.slice(2).join(' ');
        let code = codeOrUrl;
        if (codeOrUrl.startsWith('http')) {
          try { const r = await axios.get(codeOrUrl); code = r.data; }
          catch (e) { return message.reply(makeBox('❌ FAILED', ['Fetch Failed: ' + e.message])); }
        }
        if (!code) return message.reply(makeBox('❌ ERROR', 'Provide code/URL'));
        const filePath = path.join(eventsPath, fileName);
        if (fs.existsSync(filePath)) {
          const buttons = [[{ text: '✅ REPLACE', callback_data: 'evt_replace_' + fileName }, { text: '📝 RENAME', callback_data: 'evt_rename_' + fileName }],[{ text: '❌ CANCEL', callback_data: 'evt_cancel' }]];
          global.badol.onCallback.set('evt_install_' + fileName, { fileName: fileName, code: code, userId: event.from.id });
          return await api.sendMessage(event.chat.id, makeBox('⚠️ FILE EXISTS', [fileName]), { reply_markup: { inline_keyboard: buttons } });
        }
        const result = global.installEventFile(fileName, code);
        if (result.success) {
          await global.reloadEvent(fileName.replace('.js', ''));
          return message.reply(makeBox('✅ INSTALLED', [fileName]));
        } else return message.reply(makeBox('❌ FAILED', result.message));
      }

      if (action === 'load') {
        const r = await global.reloadEvent(args[1].replace('.js',''));
        return message.reply(r.success? makeBox('✅ LOADED', [args[1]]) : makeBox('❌ FAILED', r.message));
      }
      if (action === 'unload') {
        const r = global.unloadEvent(args[1].replace('.js',''));
        return message.reply(r.success? makeBox('✅ UNLOADED', [args[1]]) : makeBox('❌ FAILED', r.message));
      }
      if (action === 'loadall') {
        const files = fs.readdirSync(eventsPath).filter(f=>f.endsWith('.js'));
        let s=0; for(const f of files){ try{ await global.reloadEvent(f.replace('.js','')); s++; }catch{}}
        return message.reply(makeBox('🔄 LOADALL', ['Total: ' + files.length, 'Reloaded: ' + s + ' ✅']));
      }
      if (action === 'delete' || action === 'del') {
        const r = global.deleteEventFile(args[1]);
        return message.reply(r.success? makeBox('🗑️ DELETED', [args[1]]) : makeBox('❌ FAILED', r.message));
      }

      if (action === 'list') {
        const files = fs.readdirSync(eventsPath).filter(f=>f.endsWith('.js')).sort();
        const listText = files.map((n,i) => `${i+1}. ${n}`).join('\n');
        const sent = await api.sendMessage(event.chat.id, makeBox('📜 EVENT LIST ['+files.length+']', ['Total: ' + files.length,'','Reply with:','get 1 2 3','del 1 2 3','', listText]), { reply_to_message_id: event.message_id });
        global.badol.onReply.set(sent.message_id, { commandName: "event", action: "list_handle", files: files, author: event.from.id });
        return;
      }

    } catch (error) {
      return message.reply(makeBox('❌ ERROR', error.message));
    }
  },

  onCallback: async function (data) {
    try {
      const event = data.event;
      const api = data.api;
      const ctx = data.ctx;
      const callbackData = event.data;
      const userId = event.from.id;

      if (callbackData === 'evt_cancel') {
        try{ await ctx.answerCbQuery('❌ Cancelled'); }catch{}
        try{ await ctx.editMessageText(makeBox('❌ CANCELLED', 'Cancelled')); }catch{ try{ await api.deleteMessage(event.message.chat.id, event.message.message_id); }catch{}}
        return;
      }
      if (callbackData.startsWith('evt_replace_')) {
        const fileName = callbackData.replace('evt_replace_', '');
        const storedData = global.badol.onCallback.get('evt_install_' + fileName);
        if (!storedData || storedData.userId!== userId) { try{ await ctx.answerCbQuery('❌ Expired'); }catch{} return; }
        try{ await ctx.answerCbQuery('✅ Replacing...'); }catch{}
        const result = global.installEventFile(fileName, storedData.code);
        if (result.success) {
          try{ await global.reloadEvent(fileName.replace('.js', '')); await ctx.editMessageText(makeBox('✅ REPLACED', [fileName])); }catch(e){ await ctx.editMessageText(makeBox('⚠️ WARNING', ['Replaced but load failed: ' + e.message])); }
        } else {
          await ctx.editMessageText(makeBox('❌ FAILED', result.message));
        }
        global.badol.onCallback.delete('evt_install_' + fileName);
      }
      if (callbackData.startsWith('evt_rename_')) {
        const fileName = callbackData.replace('evt_rename_', '');
        const storedData = global.badol.onCallback.get('evt_install_' + fileName);
        if (!storedData || storedData.userId!== userId) { try{ await ctx.answerCbQuery('❌ Expired'); }catch{} return; }
        try{ await ctx.answerCbQuery('📝 Rename...'); }catch{}
        try{ await ctx.editMessageText(makeBox('📝 RENAME', ['Reply with new filename'])); }catch{}
        global.badol.onReply.set(event.message.message_id, {
          commandName: 'event',
          action: 'rename_install',
          code: storedData.code,
          userId: userId
        });
        global.badol.onCallback.delete('evt_install_' + fileName);
      }
    } catch (error) {
      try{ await data.ctx.answerCbQuery('❌ Error: ' + error.message); }catch{}
    }
  },

  onReply: async function (data) {
    try {
      const event = data.event;
      const message = data.message;
      const api = event.api || data.api;
      const replyData = global.badol.onReply.get(event.reply_to_message.message_id);
      if (!replyData || replyData.commandName!== 'event') return;
      if (replyData.userId && replyData.userId!== event.from.id) return;
      if (replyData.author && replyData.author!== event.from.id) return;

      if (replyData.action === 'list_handle') {
        const text = (event.text || "").trim().toLowerCase();
        const parts = text.split(/\s+/);
        const cmdType = parts[0];
        const nums = parts.slice(1).map(n => parseInt(n)).filter(n =>!isNaN(n));
        if (nums.length === 0) return message.reply(makeBox('❌ ERROR', ['Example: get 1 2 3','or: del 1 2 3']));

        const files = replyData.files;
        const selected = nums.map(i => files[i-1]).filter(Boolean);
        if (selected.length === 0) return message.reply(makeBox('❌ ERROR', 'Invalid numbers!'));

        const eventsPath = path.join(__dirname, '..', 'events');

        if (cmdType === 'get') {
          for (const fileName of selected) {
            const filePath = path.join(eventsPath, fileName);
            try {
              await api.sendDocument(event.chat.id, { source: fs.readFileSync(filePath), filename: fileName }, { caption: `📄 ${fileName}`, reply_to_message_id: event.message_id });
            } catch (e) {
              await message.reply(makeBox('❌ FAILED', `Failed ${fileName}: ${e.message}`));
            }
          }
          return;
        }
        if (cmdType === 'del' || cmdType === 'delete') {
          let ok=[], fail=[];
          for (const fileName of selected) {
            try { const r = global.deleteEventFile(fileName); if(r.success) ok.push(fileName); else fail.push(fileName); } catch { fail.push(fileName); }
          }
          let lines=[]; if(ok.length) lines.push(`Deleted [${ok.length}]:`,...ok.map(n=>`• ${n}`)); if(fail.length) lines.push('',`Failed [${fail.length}]:`,...fail.map(n=>`• ${n}`));
          return message.reply(makeBox('🗑️ DELETE RESULT', lines));
        }
        return message.reply(makeBox('❌ ERROR', ['Use: get 1 2 3','or: del 1 2 3']));
      }

      if (replyData.action === 'rename_install') {
        const newFileName = event.text.trim();
        if (!newFileName.endsWith('.js')) return message.reply(makeBox('❌ ERROR', 'Must end with.js'));
        const eventsPath = path.join(__dirname, '..', 'events');
        const filePath = path.join(eventsPath, newFileName);
        if (fs.existsSync(filePath)) return message.reply(makeBox('❌ ERROR', [newFileName + ' Already exists!']));
        let updatedCode = replyData.code;
        const nameMatch = updatedCode.match(/name:\s*["']([^"']+)["']/);
        if (nameMatch) {
          updatedCode = updatedCode.replace(/name:\s*["']([^"']+)["']/, 'name: "' + newFileName.replace('.js', '') + '"');
        }
        const result = global.installEventFile(newFileName, updatedCode);
        if (result.success) {
          try{ await global.reloadEvent(newFileName.replace('.js', '')); await message.reply(makeBox('✅ INSTALLED', [newFileName])); }
          catch(e){ await message.reply(makeBox('⚠️ WARNING', e.message)); }
        } else await message.reply(makeBox('❌ FAILED', result.message));
        global.badol.onReply.delete(event.reply_to_message.message_id);
      }
    } catch (error) { return data.message.reply(makeBox('❌ ERROR', error.message)); }
  }
};