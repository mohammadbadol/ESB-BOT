const fs = require("fs");
const path = require("path");
const axios = require("axios");

const makeBox = (title, lines) => {
  let msg = '╭━❮ ' + title + ' ❯━╮\n';
  const arr = Array.isArray(lines)? lines : lines.split('\n');
  for (const line of arr) { if(line) msg += '├‣ ' + line + '\n'; }
  msg += '├━─━─━━──━─━─━\n├‣ 𝐄𝐒𝐁-𝐁𝐎𝐓\n╰━──━─━─━━─━─━❍';
  return msg;
};

const ROOT = process.cwd();
const formatSize = (b) => b < 1024? b+' B' : b < 1048576? (b/1024).toFixed(1)+' KB' : (b/1048576).toFixed(1)+' MB';
const safe = (p) => path.resolve(ROOT,p).startsWith(ROOT);
const rel = (p) => path.relative(ROOT,p) || '/';

const getList = (dir) => {
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    let folders=[], files=[];
    for(const it of items){
      if(it.name.startsWith('.')) continue;
      const full = path.join(dir, it.name);
      try { const st = fs.statSync(full);
        if(it.isDirectory()) folders.push({ name: it.name, full, isDir: true });
        else files.push({ name: it.name, full, size: st.size, isDir: false });
      }catch(e){}
    }
    folders.sort((a,b)=>a.name.localeCompare(b.name));
    files.sort((a,b)=>a.name.localeCompare(b.name));
    return [...folders,...files];
  } catch(e){ return []; }
};

function loadCommand(fp){
  try{ delete require.cache[require.resolve(fp)]; const c=require(fp); if(!c.config||!c.BADOL) return {success:false}; const n=c.config.name||path.basename(fp,'.js'); if(global.badol.commands.has(n)) global.badol.commands.delete(n); global.badol.commands.set(n,c); return {success:true,name:n}; }catch(e){ return {success:false,error:e.message}; }
}
function loadEvent(fp){
  try{ delete require.cache[require.resolve(fp)]; const e=require(fp); if(!e.config||!e.BADOL) return {success:false}; const n=e.config.name||path.basename(fp,'.js'); global.badol.events.set(n,e); return {success:true,name:n}; }catch(e){ return {success:false,error:e.message}; }
}

if (!global.badol.onCallback) global.badol.onCallback = new Map();
if (!global.badol.onReply) global.badol.onReply = new Map();
if (!global.fmCache) global.fmCache = new Map();
if (!global.fm_pending) global.fm_pending = new Map();

async function sendFiles(api, chatId, filesToSend){
  for(const f of filesToSend){
    try{ await api.sendDocument(chatId, { source: fs.createReadStream(f.full), filename: f.name }); }
    catch(e){ await api.sendMessage(chatId, `❌ Can't send ${f.name}: ${e.message}`); }
  }
}

module.exports = {
  config: {
    name: "file",
    aliases: ["fm", "sendfile", "filesend"],
    author: "MOHAMMAD BADOL",
    version: "2.1.0",
    description: "bot ar file send js json all",
    category: "general",
    usePrefix: true,
    cooldown: 5,
    role: 0,
    guide: "{pn}file"
  },

  BADOL: async function ({ event, api, args }) {
    const uid = String(event.from.id);
    const chatId = event.chat.id;
    if (!global.config.adminUID.map(String).includes(uid)) return api.sendMessage(chatId, '❌ Owner only');
    const reply = event.reply_to_message;

    // DEL
    if (args[0]?.toLowerCase() === 'del' && args[1]) {
      const fp = path.resolve(ROOT, args.slice(1).join(' '));
      if(!safe(fp)) return api.sendMessage(chatId,'❌ Outside root');
      if(!fs.existsSync(fp)) return api.sendMessage(chatId,`❌ Not found: ${rel(fp)}`);
      fs.rmSync(fp,{recursive:true,force:true});
      return api.sendMessage(chatId,`🗑️ Deleted: ${rel(fp)}`);
    }

    // ADD - cmd.js style: reply to file with /fm add path
    if (args[0]?.toLowerCase() === 'add' && args[1]) {
      const dest = path.resolve(ROOT, args.slice(1).join(' '));
      if(!safe(dest)) return api.sendMessage(chatId,'❌ Outside root');
      if(reply){
        try{
          if(reply.document){
            const file=await api.getFile(reply.document.file_id);
            const url=`https://api.telegram.org/file/bot${api.token}/${file.file_path}`;
            const res=await axios.get(url,{responseType:'arraybuffer'});
            fs.mkdirSync(path.dirname(dest),{recursive:true});
            fs.writeFileSync(dest,Buffer.from(res.data));
          } else if(reply.text || reply.caption){
            fs.mkdirSync(path.dirname(dest),{recursive:true});
            fs.writeFileSync(dest, reply.text||reply.caption, 'utf8');
          } else return api.sendMessage(chatId,'❌ Reply এ ফাইল পাইনি');
          let m=''; if(dest.includes('scripts/commands')){ const r=loadCommand(dest); m=r.success?`✅ Auto Loaded: ${r.name}`:`❌ ${r.error}`; }
          else if(dest.includes('scripts/events')){ const r=loadEvent(dest); m=r.success?`✅ Event: ${r.name}`:`❌ ${r.error}`; }
          else m='⚠️ Saved, /restart দাও';
          return api.sendMessage(chatId,`✅ Added: ${rel(dest)}\n${m}`);
        }catch(e){ return api.sendMessage(chatId,`❌ ${e.message}`); }
      }
      global.fm_pending.set(uid,{path:dest});
      return api.sendMessage(chatId,`📝 ADD MODE\n📂 ${rel(dest)}\nএখন এই মেসেজে Reply দিয়ে কোড/ফাইল পাঠাও`);
    }

    // GET
    if (args[0]?.toLowerCase() === 'get') {
      const cache = global.fmCache.get(chatId);
      if (!cache) return api.sendMessage(chatId, '❌ আগে /fm দাও');
      const nums = args.slice(1).join(' ').split(/[\s,]+/).map(n=>parseInt(n)).filter(n=>!isNaN(n));
      if (!nums.length) return api.sendMessage(chatId, '💡 fm get 1 2 3');
      const files = nums.map(i=>cache.items[i-1]).filter(Boolean).filter(f=>!f.isDir);
      if (!files.length) return api.sendMessage(chatId, '❌ ফাইল সিলেক্ট করো');
      await api.sendMessage(chatId, `📤 ${files.length} টা ফাইল পাঠাচ্ছি...`);
      return await sendFiles(api, chatId, files);
    }

    let target = ROOT;
    if (args[0] && ['up','home'].includes(args[0].toLowerCase())) {
      const cache = global.fmCache.get(chatId);
      if (cache) target = args[0].toLowerCase()==='up'? path.dirname(cache.path) : ROOT;
    } else if (args[0]?.toLowerCase() === 'cmds') target = path.join(ROOT, "scripts", "cmds");
    else if (args[0] &&!['add','del','get'].includes(args[0].toLowerCase()) && fs.existsSync(path.join(ROOT, args.join(' ')))) target = path.join(ROOT, args.join(' '));

    return await this.sendFM(api, event, target);
  },

  sendFM: async function(api, event, dirPath){
    const chatId = event.chat.id;
    const userId = String(event.from.id);
    const items = getList(dirPath);
    global.fmCache.set(chatId, { path: dirPath, items });

    let lines = [
      `📂 Path: ~/${rel(dirPath)}`,
      `📁 Folders: ${items.filter(i=>i.isDir).length} | 📄 Files: ${items.filter(i=>!i.isDir).length}`,
      '---',
      '💡 বাটনে চাপ দাও / fm get 1 / রিপ্লাই get 1',
      '💡 এড: ফাইল আপলোড করে Reply /fm add path',
      '---'
    ];
    items.slice(0,50).forEach((it, idx)=>{
      if(it.isDir) lines.push(`${idx+1}. 📁 ${it.name}/`);
      else lines.push(`${idx+1}. 📄 ${it.name} (${formatSize(it.size)})`);
    });

    let buttons = []; let row = [];
    items.filter(i=>i.isDir).slice(0,8).forEach(f=>{
      const cbId = `fm_${Date.now().toString().slice(-5)}_${Math.random().toString(36).slice(2,4)}`;
      global.badol.onCallback.set(cbId, { path: f.full, userId, action: 'open' });
      row.push({ text: '📁 '+f.name.slice(0,10), callback_data: cbId });
      if(row.length===2){ buttons.push(row); row=[]; }
    });
    if(row.length) buttons.push(row);

    const upId = `fm_up_${Date.now().toString().slice(-6)}`;
    const homeId = `fm_hm_${Date.now().toString().slice(-6)}`;
    global.badol.onCallback.set(upId, { path: path.dirname(dirPath), userId, action: 'open' });
    global.badol.onCallback.set(homeId, { path: ROOT, userId, action: 'open' });
    buttons.push([{ text: '⬆️ Up', callback_data: upId }, { text: '🏠 Home', callback_data: homeId }]);

    const sent = await api.sendMessage(chatId, makeBox('📂 FILE MANAGER', lines), { reply_markup: { inline_keyboard: buttons } });
    try{ global.badol.onReply.set(sent.message_id, { commandName: 'fm', path: dirPath, items, userId }); }catch(e){}
    return sent;
  },

  onReply: async function({ event, api, Reply }){
    const uid = String(event.from.id);
    if(global.fm_pending.has(uid)){
      const pending = global.fm_pending.get(uid);
      try{
        fs.mkdirSync(path.dirname(pending.path),{recursive:true});
        if(event.document){
          const file=await api.getFile(event.document.file_id);
          const url=`https://api.telegram.org/file/bot${api.token}/${file.file_path}`;
          const res=await axios.get(url,{responseType:'arraybuffer'});
          fs.writeFileSync(pending.path,Buffer.from(res.data));
        } else fs.writeFileSync(pending.path, event.text||event.caption||'', 'utf8');
        let m=''; if(pending.path.includes('scripts/commands')){ const r=loadCommand(pending.path); m=r.success?`✅ Loaded ${r.name}`:`❌ ${r.error}`; } else m='⚠️ Saved';
        await api.sendMessage(event.chat.id,`✅ ${rel(pending.path)}\n${m}`);
        global.fm_pending.delete(uid);
      }catch(e){ await api.sendMessage(event.chat.id,`❌ ${e.message}`); }
      return;
    }

    const text = (event.text || '').toLowerCase().trim();
    if (!text.startsWith('get')) return;
    const nums = text.replace('get','').trim().split(/[\s,]+/).map(n=>parseInt(n)).filter(n=>!isNaN(n));
    if (!nums.length) return;
    const files = nums.map(i=>Reply.items[i-1]).filter(Boolean).filter(f=>!f.isDir);
    if (!files.length) return api.sendMessage(event.chat.id, '❌ ফাইল সিলেক্ট করো');
    await api.sendMessage(event.chat.id, `📤 ${files.length} টা ফাইল পাঠাচ্ছি...`);
    return await sendFiles(api, event.chat.id, files);
  },

  onCallback: async function (data) {
    const { event, ctx, api } = data;
    const callbackData = event.data;
    if (!callbackData ||!callbackData.startsWith('fm_')) return;
    const stored = global.badol.onCallback.get(callbackData);
    if (!stored) { try{ await ctx.answerCbQuery('❌ Expired, /fm again'); }catch(e){} return; }
    const { path: targetPath, userId } = stored;
    if (String(event.from.id)!==String(userId)) { try{ await ctx.answerCbQuery('❌ Only owner'); }catch(e){} return; }
    const chatId = event.message?.chat?.id; const messageId = event.message?.message_id;
    try{ await ctx.answerCbQuery('📂 '+path.basename(targetPath)); }catch(e){}
    if (!fs.existsSync(targetPath)) { try{ await ctx.answerCbQuery('❌ Not found'); }catch(e){} return; }

    if (!fs.statSync(targetPath).isDirectory()) {
      let content = ''; try { content = fs.readFileSync(targetPath, 'utf8').slice(0,2000); } catch(e){ content = '[Binary]'; }
      const lines = ['📄 '+path.basename(targetPath), '---',...content.split('\n').slice(0,20)];
      const backId = `fm_up_${Date.now().toString().slice(-6)}`;
      global.badol.onCallback.set(backId, { path: path.dirname(targetPath), userId, action: 'open' });
      try{ await api.editMessageText(chatId, messageId, undefined, makeBox('📄 FILE VIEW', lines), { reply_markup: { inline_keyboard: [[{ text: '⬅️ Back', callback_data: backId }]] } }); }catch(e){ await api.sendMessage(chatId, makeBox('📄 FILE VIEW', lines)); }
      return;
    }

    const items = getList(targetPath);
    global.fmCache.set(chatId, { path: targetPath, items });
    let lines = [`📂 Path: ~/${rel(targetPath)}`, `📁 Folders: ${items.filter(i=>i.isDir).length} | 📄 Files: ${items.filter(i=>!i.isDir).length}`, '---'];
    items.slice(0,50).forEach((it, idx)=>{ if(it.isDir) lines.push(`${idx+1}. 📁 ${it.name}/`); else lines.push(`${idx+1}. 📄 ${it.name} (${formatSize(it.size)})`); });
    let buttons = []; let row = [];
    items.filter(i=>i.isDir).slice(0,8).forEach(f=>{
      const cbId = `fm_${Date.now().toString().slice(-5)}_${Math.random().toString(36).slice(2,4)}`;
      global.badol.onCallback.set(cbId, { path: f.full, userId, action: 'open' });
      row.push({ text: '📁 '+f.name.slice(0,10), callback_data: cbId });
      if(row.length===2){ buttons.push(row); row=[]; }
    });
    if(row.length) buttons.push(row);
    const upId = `fm_up_${Date.now().toString().slice(-6)}`; const homeId = `fm_hm_${Date.now().toString().slice(-6)}`;
    global.badol.onCallback.set(upId, { path: path.dirname(targetPath), userId, action: 'open' });
    global.badol.onCallback.set(homeId, { path: ROOT, userId, action: 'open' });
    buttons.push([{ text: '⬆️ Up', callback_data: upId }, { text: '🏠 Home', callback_data: homeId }]);
    try{
      await api.editMessageText(chatId, messageId, undefined, makeBox('📂 FILE MANAGER', lines), { reply_markup: { inline_keyboard: buttons } });
      try{ global.badol.onReply.set(messageId, { commandName: 'fm', path: targetPath, items, userId }); }catch(e){}
    }catch(e){
      const sent = await api.sendMessage(chatId, makeBox('📂 FILE MANAGER', lines), { reply_markup: { inline_keyboard: buttons } });
      try{ global.badol.onReply.set(sent.message_id, { commandName: 'fm', path: targetPath, items, userId }); }catch(e){}
    }
  }
};