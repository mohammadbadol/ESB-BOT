const axios = require('axios');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

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

const checkSyntax = (code) => {
  try { new vm.Script(code, { filename: 'check.js' }); return { ok: true }; }
  catch (e) { return { ok: false, error: e.message }; }
};

module.exports = {
  config: {
    name: "cmd",
    aliases: ["command"],
    author: "MOHAMMAD BADOL",
    version: "8.0 LIST REPLY",
    cooldown: 3,
    role: 2,
    description: "Premium Command Manager",
    category: "system",
    usePrefix: true
  },

  BADOL: async function ({ event, api, args, message, ctx }) {
    try {
      if (event.reply_to_message && event.reply_to_message.document) {
        const doc = event.reply_to_message.document;
        if (!doc.file_name.endsWith('.js')) return message.reply(makeBox('⚠️ ERROR', 'Only.js files allowed!'));
        let fileName = doc.file_name;
        if (args[0] && args[0].endsWith('.js')) fileName = args[0];
        try {
          const fileLink = await ctx.telegram.getFileLink(doc.file_id);
          const response = await axios.get(fileLink.href);
          let code = response.data;
          const syntax = checkSyntax(code);
          if(!syntax.ok) return message.reply(makeBox('❌ SYNTAX ERROR', ['File Name: ' + fileName, 'Error: ' + syntax.error]));
          const filePath = path.join(__dirname, fileName);
          if (fs.existsSync(filePath)) {
            const buttons = [[{ text: '✅ REPLACE', callback_data: 'cmd_replace_' + fileName }, { text: '📝 RENAME', callback_data: 'cmd_rename_' + fileName }],[{ text: '❌ CANCEL', callback_data: 'cmd_cancel' }]];
            global.badol.onCallback.set('cmd_install_' + fileName, { fileName, code, userId: event.from.id });
            return await api.sendMessage(event.chat.id, makeBox('⚠️ FILE EXISTS', ['File Name: ' + fileName, 'Already exists!']), { reply_markup: { inline_keyboard: buttons } });
          }
          const result = global.installCommandFile(fileName, code);
          if (result.success) {
            try{
              await global.reloadCommand(fileName.replace('.js',''));
              return message.reply(makeBox('✅ INSTALLED', ['File Name: ' + fileName, 'Installed ✅']));
            }catch(e){
              fs.unlinkSync(path.join(__dirname, fileName));
              return message.reply(makeBox('❌ LOAD FAILED', ['File Name: ' + fileName, 'Error: ' + e.message]));
            }
          }
        } catch (e) { return message.reply(makeBox('❌ FAILED', ['Failed: ' + e.message])); }
      }

      if (args.length === 0) {
        return message.reply(makeBox('⚙️ CMD MANAGER', ['load <name>','unload <name>','loadall','del <name>','add <name.js> <code>','list','\nReply to list:','get 1 2 3 -> send file','del 1 2 3 -> delete']));
      }

      const action = args[0].toLowerCase();

      if (action === 'add') {
        const fileName = args[1];
        if (!fileName ||!fileName.endsWith('.js')) return message.reply(makeBox('❌ ERROR', ['Valid filename required','Ex: /cmd add test.js <code>']));
        const code = args.slice(2).join(' ');
        if (!code) return message.reply(makeBox('❌ ERROR', 'Provide code after filename!'));
        const syntax = checkSyntax(code);
        if (!syntax.ok) return message.reply(makeBox('❌ SYNTAX ERROR', ['File: ' + fileName, 'Error: ' + syntax.error]));
        const filePath = path.join(__dirname, fileName);
        if (fs.existsSync(filePath)) return message.reply(makeBox('⚠️ ERROR', ['File exists! Delete first']));
        try {
          const result = global.installCommandFile(fileName, code);
          if (result && result.success) {
            await global.reloadCommand(fileName.replace('.js', ''));
            return message.reply(makeBox('✅ ADDED & LOADED', ['File: ' + fileName, 'Loaded ✅']));
          }
        } catch (e) {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          return message.reply(makeBox('❌ LOAD FAILED', ['Error: ' + e.message]));
        }
      }

      if (action === 'loadall') {
        const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.js'));
        let failed = [];
        const selfFile = 'cmd.js';
        const otherFiles = files.filter(f => f!== selfFile);
        for(const file of otherFiles){
          try{ await global.reloadCommand(file.replace('.js','')); }
          catch(e){ failed.push(file); }
        }
        try {
          let savePath = path.join(__dirname, "..", "..", "data", "prefixmode.json");
          if (!fs.existsSync(savePath)) savePath = path.join(__dirname, "..", "data", "prefixmode.json");
          if (fs.existsSync(savePath)) {
            const saved = JSON.parse(fs.readFileSync(savePath, "utf8"));
            if (saved.mode === true) {
              if (!global.config._originalUsePrefix) global.config._originalUsePrefix = saved.original || {};
              global.config.prefixMode = true;
              for (const cmd of global.badol.commands.values()) {
                if (cmd.config && cmd.config.name) {
                  const name = cmd.config.name;
                  if (!(name in global.config._originalUsePrefix)) {
                    global.config._originalUsePrefix[name] =!!cmd.config.usePrefix;
                  }
                  cmd.config.usePrefix = false;
                }
              }
            }
          }
        } catch(e) {}
        const total = files.length;
        let lines = [
          'Total: ' + total,
          'Reloaded: ' + total + ' ✅',
          'PrefixMode: ' + (global.config.prefixMode? 'ON (No-Prefix)' : 'OFF'),
          'All Commands Active ✅'
        ];
        if (failed.length > 0) lines.push('Failed: ' + failed.length + ' -> ' + failed.join(', '));
        return message.reply(makeBox('🔄 LOADALL', lines));
      }

      if (action === 'list') {
        const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.js')).sort();
        const listText = files.map((n,i) => `${i+1}. ${n}`).join('\n');
        const sent = await api.sendMessage(event.chat.id, makeBox('📜 CMD LIST ['+files.length+']', ['Total: ' + files.length, '','Reply with:','get 1 2 3','del 1 2 3','', listText]), { reply_to_message_id: event.message_id });
        global.badol.onReply.set(sent.message_id, { commandName: "cmd", action: "list_handle", files: files, author: event.from.id });
        return;
      }

      if (action === 'load') {
        try{
          const r = await global.reloadCommand(args[1].replace('.js',''));
          return message.reply(r.success? makeBox('✅ LOADED', ['File: ' + args[1]]) : makeBox('❌ FAILED', r.message));
        }catch(e){ return message.reply(makeBox('❌ FAILED', e.message)); }
      }
      if (action === 'unload') { const r = global.unloadCommand(args[1].replace('.js','')); return message.reply(r.success? makeBox('✅ UNLOADED', [args[1]]) : makeBox('❌ FAILED', r.message)); }
      if (action === 'delete' || action === 'del') { const r = global.deleteCommandFile(args[1]); return message.reply(r.success? makeBox('🗑️ DELETED', [args[1]]) : makeBox('❌ FAILED', r.message)); }

    } catch (error) { return message.reply(makeBox('❌ ERROR', error.message)); }
  },

  onCallback: async function (data) {
    try {
      const event = data.event; const ctx = data.ctx;
      const callbackData = event.data;
      const userId = event.from.id;
      if (callbackData === 'cmd_cancel') {
        try{ await ctx.answerCbQuery('❌ Cancelled'); }catch(e){}
        try{ await ctx.editMessageText(makeBox('❌ CANCELLED', 'Cancelled')); }catch(e){}
        return;
      }
      if (callbackData.startsWith('cmd_replace_')) {
        const fileName = callbackData.replace('cmd_replace_', '');
        const stored = global.badol.onCallback.get('cmd_install_' + fileName);
        if (!stored || stored.userId!== userId) return;
        try{ await ctx.answerCbQuery('✅ Replacing...'); }catch(e){}
        const syntax = checkSyntax(stored.code);
        if(!syntax.ok){ try{ await ctx.editMessageText(makeBox('❌ SYNTAX ERROR', [syntax.error])); }catch(e){} return; }
        const result = global.installCommandFile(fileName, stored.code);
        if (result.success) {
          try { await global.reloadCommand(fileName.replace('.js','')); await ctx.editMessageText(makeBox('✅ REPLACED', [fileName])); }
          catch (e) { await ctx.editMessageText(makeBox('❌ LOAD FAILED', [e.message])); fs.unlinkSync(path.join(__dirname, fileName)); }
        }
        global.badol.onCallback.delete('cmd_install_' + fileName);
      }
      if (callbackData.startsWith('cmd_rename_')) {
        const fileName = callbackData.replace('cmd_rename_', '');
        const stored = global.badol.onCallback.get('cmd_install_' + fileName);
        if (!stored || stored.userId!== userId) return;
        try{ await ctx.editMessageText(makeBox('📝 RENAME', ['Reply with new filename'])); }catch(e){}
        global.badol.onReply.set(event.message.message_id, { commandName: 'cmd', action: 'rename_install', code: stored.code, userId });
        global.badol.onCallback.delete('cmd_install_' + fileName);
      }
    } catch (e) {}
  },

  onReply: async function (data) {
    try {
      const event = data.event; const message = data.message; const api = data.api || event.api;
      const replyInfo = global.badol.onReply.get(event.reply_to_message.message_id);
      if (!replyInfo || replyInfo.commandName!== 'cmd') return;

      if (replyInfo.action === 'list_handle') {
        if (replyInfo.author && replyInfo.author!== event.from.id) return;
        const text = (event.text || "").trim().toLowerCase();
        const parts = text.split(/\s+/);
        const cmdType = parts[0];
        const nums = parts.slice(1).map(n => parseInt(n)).filter(n =>!isNaN(n));

        if (nums.length === 0) return message.reply(makeBox('❌ ERROR', ['Example: get 1 2 3','or: del 1 2 3']));

        const files = replyInfo.files;
        const selected = nums.map(i => files[i-1]).filter(Boolean);

        if (selected.length === 0) return message.reply(makeBox('❌ ERROR', 'Invalid numbers!'));

        if (cmdType === 'get') {
          for (const fileName of selected) {
            const filePath = path.join(__dirname, fileName);
            try {
              await api.sendDocument(event.chat.id, { source: fs.readFileSync(filePath), filename: fileName }, { caption: `📄 ${fileName}`, reply_to_message_id: event.message_id });
            } catch (e) {
              await message.reply(makeBox('❌ FAILED', `Failed to send ${fileName}: ${e.message}`));
            }
          }
          return;
        }

        if (cmdType === 'del' || cmdType === 'delete') {
          let ok = [], fail = [];
          for (const fileName of selected) {
            try {
              const r = global.deleteCommandFile(fileName);
              if (r.success) ok.push(fileName);
              else fail.push(fileName);
            } catch { fail.push(fileName); }
          }
          let lines = [];
          if (ok.length) lines.push(`Deleted [${ok.length}]:`,...ok.map(n=>`• ${n}`));
          if (fail.length) lines.push('', `Failed [${fail.length}]:`,...fail.map(n=>`• ${n}`));
          return message.reply(makeBox('🗑️ DELETE RESULT', lines));
        }

        return message.reply(makeBox('❌ ERROR', ['Use: get 1 2 3','or: del 1 2 3']));
      }

      if (replyInfo.action === 'rename_install') {
        const newFileName = event.text.trim();
        if (!newFileName.endsWith('.js')) return message.reply(makeBox('❌ ERROR', 'Must end with.js'));
        if (fs.existsSync(path.join(__dirname, newFileName))) return message.reply(makeBox('❌ ERROR', 'File exists'));
        const syntax = checkSyntax(replyInfo.code);
        if(!syntax.ok) return message.reply(makeBox('❌ SYNTAX ERROR', [syntax.error]));
        let code = replyInfo.code.replace(/name:\s*["'][^"']+["']/, 'name: "' + newFileName.replace('.js','') + '"');
        const result = global.installCommandFile(newFileName, code);
        if (result.success) {
          try { await global.reloadCommand(newFileName.replace('.js','')); await message.reply(makeBox('✅ INSTALLED', [newFileName])); }
          catch (e) { await message.reply(makeBox('❌ LOAD FAILED', [e.message])); fs.unlinkSync(path.join(__dirname, newFileName)); }
        }
        global.badol.onReply.delete(event.reply_to_message.message_id);
      }
    } catch (e) { console.log(e); }
  }
};