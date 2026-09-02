// BADOL/util.js - v4.0 Dual Owner + Multi BotAdmin Fix
// Path: BADOL/util.js

const moment = require('moment-timezone');
const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { Markup } = require('telegraf');

const regCheckURL = /^(http|https):\/\/[^ "]+$/;
const CACHE_DIR = path.join(__dirname, '..', 'BADOL-CMDS', 'cache');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

class MessageUtils {
  constructor(ctx) {
    this.ctx = ctx;
    this.api = ctx.telegram;
    this.event = ctx.message || ctx.callbackQuery?.message || ctx.update;
    this.Markup = Markup;
    const msg = ctx.message || ctx.callbackQuery?.message;
    if (msg) {
      this.chatId = msg.chat?.id;
      this.chatType = msg.chat?.type;
      this.chatTitle = msg.chat?.title || null;
      this.isGroup = msg.chat?.type === 'group' || msg.chat?.type === 'supergroup';
      this.isPrivate = msg.chat?.type === 'private';
      this.senderID = msg.from?.id;
      this.senderName = msg.from? `${msg.from.first_name || ''} ${msg.from.last_name || ''}`.trim() : null;
      this.senderUsername = msg.from?.username || null;
      this.hasText =!!msg.text;
      this.hasPhoto =!!msg.photo;
      this.hasVideo =!!msg.video;
      this.hasAudio =!!msg.audio;
      this.hasVoice =!!msg.voice;
      this.hasDocument =!!msg.document;
      this.hasSticker =!!msg.sticker;
      this.hasAnimation =!!msg.animation;
      this.messageText = msg.text || msg.caption || '';
      this.messageId = msg.message_id;
    }
    this.db = {
      getUser: (userId) => global.db.getUser(String(userId)),
      updateUser: (userId, data) => global.db.updateUser(String(userId), data),
      getThread: (chatId) => global.db.getThread(String(chatId)),
      updateThread: (chatId, data) => global.db.updateThread(String(chatId), data),
      incrementMessageCount: (userId, chatId) => global.db.incrementMessageCount(String(userId), String(chatId)),
      getUserMessageCount: (userId, chatId) => global.db.getUserMessageCount(String(userId), String(chatId)),
      getThreadMessageStats: (chatId) => global.db.getThreadMessageStats(String(chatId)),
      incrementUserExp: (userId, amount) => global.db.incrementUserExp(String(userId), amount),
      getAllUsers: () => global.db.getAllUsers(),
      getAllThreads: () => global.db.getAllThreads(),
      banUser: (userId, reason, bannedBy) => global.db.banUser(String(userId), reason, bannedBy),
      unbanUser: (userId) => global.db.unbanUser(String(userId)),
      isUserBanned: (userId) => global.db.isUserBanned(String(userId)),
      addWarning: (userId, chatId, reason, warnedBy) => global.db.addWarning(String(userId), String(chatId), reason, warnedBy),
      getWarnings: (userId, chatId) => global.db.getWarnings(String(userId), String(chatId)),
      clearWarnings: (userId, chatId) => global.db.clearWarnings(String(userId), String(chatId))
    };
    this._bindTelegrafMethods();
  }

  _bindTelegrafMethods() {
    const telegramApi = this.ctx.telegram;
    const defaultChatId = this.ctx.chat?.id;
    const allMethods = new Set();
    let currentObj = telegramApi;
    while (currentObj && currentObj!== Object.prototype) {
      Object.getOwnPropertyNames(currentObj).forEach(name => {
        if (name!== 'constructor' && typeof telegramApi[name] === 'function') {
          allMethods.add(name);
        }
      });
      currentObj = Object.getPrototypeOf(currentObj);
    }
    allMethods.forEach(methodName => {
      const originalMethod = telegramApi[methodName];
      const sendMethodsThatNeedChatId = [
        'sendMessage', 'sendPhoto', 'sendVideo', 'sendAudio', 'sendDocument',
        'sendAnimation', 'sendVoice', 'sendVideoNote', 'sendMediaGroup',
        'sendLocation', 'sendVenue', 'sendContact', 'sendPoll', 'sendDice',
        'sendSticker', 'sendChatAction', 'getChat', 'getChatMember',
        'getChatAdministrators', 'getChatMembersCount', 'setChatTitle',
        'setChatDescription', 'setChatPhoto', 'deleteChatPhoto', 'pinChatMessage',
        'unpinChatMessage', 'unpinAllChatMessages', 'leaveChat', 'setChatPermissions',
        'banChatMember', 'unbanChatMember', 'restrictChatMember', 'promoteChatMember',
        'exportChatInviteLink', 'createChatInviteLink', 'revokeChatInviteLink',
        'approveChatJoinRequest', 'declineChatJoinRequest', 'forwardMessage', 'copyMessage'
      ];
      if (sendMethodsThatNeedChatId.includes(methodName)) {
        this[methodName] = (...args) => {
          if (args.length === 0 || (typeof args[0] === 'string' &&!args[0].match(/^-?\d+$/))) {
            if (defaultChatId) {
              return originalMethod.call(telegramApi, defaultChatId,...args);
            }
          }
          return originalMethod.call(telegramApi,...args);
        };
      } else {
        this[methodName] = originalMethod.bind(telegramApi);
      }
    });
  }

  async reply(text, options = {}) {
    try {
      if (typeof text === 'object' && text.body!== undefined) {
        const { body, attachment,...restOptions } = text;
        if (attachment) {
          return await this.sendAttachment({
            body, attachment, replyTo: this.ctx.message?.message_id,...restOptions
          });
        }
        text = body;
        options = restOptions;
      }
      return await this.ctx.reply(text, {
        reply_to_message_id: this.ctx.message?.message_id,...options
      });
    } catch (error) {
      if (error.message.includes('not enough rights')) return null;
      console.error('Error in message.reply():', error.message);
      throw error;
    }
  }

  async send(text, chatId = null, options = {}) {
    try {
      const targetChat = chatId || this.ctx.chat.id;
      return await this.api.sendMessage(targetChat, text, options);
    } catch (error) {
      if (error.message.includes('not enough rights')) return null;
      throw error;
    }
  }

  async sendAttachment(options = {}) {
    try {
      const { body, attachment, chatId, replyTo } = options;
      const targetChat = chatId || this.ctx.chat.id;
      const extraOptions = replyTo? { reply_to_message_id: replyTo } : {};
      if (!attachment) {
        return await this.api.sendMessage(targetChat, body || '', extraOptions);
      }
      if (Array.isArray(attachment)) {
        const mediaGroup = [];
        for (let i = 0; i < attachment.length; i++) {
          const att = attachment[i];
          let mediaInput;
          let fileName = '';
          if (typeof att === 'string') {
            if (att.startsWith('http')) {
              mediaInput = att;
              fileName = path.basename(att);
            } else if (fs.existsSync(att)) {
              mediaInput = { source: fs.createReadStream(att) };
              fileName = path.basename(att);
            } else throw new Error(`File not found: ${att}`);
          } else {
            mediaInput = { source: att };
            fileName = 'file';
          }
          const ext = path.extname(fileName).toLowerCase();
          const isVideo = ['.mp4', '.avi', '.mov', '.mkv'].includes(ext);
          mediaGroup.push({
            type: isVideo? 'video' : 'photo',
            media: mediaInput,
            caption: i === 0? (body || '') : undefined
          });
        }
        return await this.api.sendMediaGroup(targetChat, mediaGroup, extraOptions);
      }
      let fileStream;
      let fileName;
      if (typeof attachment === 'string') {
        if (attachment.startsWith('http')) {
          fileStream = attachment;
          fileName = path.basename(attachment);
        } else if (fs.existsSync(attachment)) {
          fileStream = fs.createReadStream(attachment);
          fileName = path.basename(attachment);
        } else throw new Error('File not found');
      } else {
        fileStream = attachment;
        fileName = 'file';
      }
      const caption = body || '';
      const ext = path.extname(fileName).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
        return await this.api.sendPhoto(targetChat, typeof fileStream === 'string'? fileStream : { source: fileStream }, { caption,...extraOptions });
      } else if (['.mp4', '.avi', '.mov', '.mkv'].includes(ext)) {
        return await this.api.sendVideo(targetChat, typeof fileStream === 'string'? fileStream : { source: fileStream }, { caption,...extraOptions });
      } else if (['.mp3', '.wav', '.ogg', '.m4a'].includes(ext)) {
        return await this.api.sendAudio(targetChat, typeof fileStream === 'string'? fileStream : { source: fileStream }, { caption,...extraOptions });
      } else {
        return await this.api.sendDocument(targetChat, typeof fileStream === 'string'? fileStream : { source: fileStream }, { caption,...extraOptions });
      }
    } catch (error) {
      console.error('Error in message.sendAttachment():', error.message);
      throw error;
    }
  }

  getAttachment(type = 'any') {
    try {
      const msg = this.ctx.message?.reply_to_message || this.ctx.message;
      if (!msg) return null;
      if ((type === 'photo' || type === 'any') && msg.photo?.length > 0) return { type: 'photo', data: msg.photo[msg.photo.length - 1] };
      if ((type === 'video' || type === 'any') && msg.video) return { type: 'video', data: msg.video };
      if ((type === 'document' || type === 'any') && msg.document) return { type: 'document', data: msg.document };
      if ((type === 'voice' || type === 'any') && msg.voice) return { type: 'voice', data: msg.voice };
      if ((type === 'sticker' || type === 'any') && msg.sticker) return { type: 'sticker', data: msg.sticker };
      if ((type === 'animation' || type === 'any') && msg.animation) return { type: 'animation', data: msg.animation };
      return null;
    } catch (error) { return null; }
  }

  async downloadAttachment(attachment, savePath = null) {
    try {
      if (!attachment) return null;
      const fileData = attachment.data || attachment;
      const fileId = fileData.file_id;
      const file = await this.api.getFile(fileId);
      const fileUrl = `https://api.telegram.org/file/bot${global.config.token}/${file.file_path}`;
      if (!savePath) {
        savePath = path.join(CACHE_DIR, `${Date.now()}_${path.basename(file.file_path)}`);
      }
      const response = await axios({ method: 'GET', url: fileUrl, responseType: 'stream' });
      const writer = fs.createWriteStream(savePath);
      response.data.pipe(writer);
      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(savePath));
        writer.on('error', reject);
      });
    } catch (error) {
      console.error('Error in message.downloadAttachment():', error.message);
      throw error;
    }
  }

  async unsend(messageId, chatId = null) {
    try {
      const targetChat = chatId || this.ctx.chat.id;
      await this.api.deleteMessage(targetChat, messageId);
      return true;
    } catch { return false; }
  }

  async react(emoji, messageId = null, isBig = false) {
    try {
      const targetMessageId = messageId || this.ctx.message?.message_id;
      const targetChatId = this.ctx.chat?.id;
      if (!targetChatId ||!targetMessageId ||!emoji) return false;
      const reaction = [{ type: 'emoji', emoji: emoji.trim() }];
      await this.api.setMessageReaction(targetChatId, targetMessageId, reaction, isBig);
      return true;
    } catch { return false; }
  }
}

function getTime(timezone = null) {
  const tz = timezone || global.config.timezone || 'Asia/Dhaka';
  return moment().tz(tz).format('YYYY-MM-DD HH:mm:ss');
}
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  let result = [];
  if (days > 0) result.push(`${days}d`);
  if (hours > 0) result.push(`${hours}h`);
  if (minutes > 0) result.push(`${minutes}m`);
  if (secs > 0) result.push(`${secs}s`);
  return result.join(' ') || '0s';
}

// ════════ DUAL OWNER + MULTI BOTADMIN SYSTEM ════════
function getAllOwnerIDs() {
  const cfg = global.config;
  if (!cfg) return ["6954597258"];
  let owners = cfg.ownerInfo?.mainOwner || [];
  if (!Array.isArray(owners)) owners = [owners];
  return owners.map(o => String(o.id || o));
}
function getAllBotAdminIDs() {
  const cfg = global.config;
  if (!cfg) return ["6954597258"];
  const botAdmins = cfg.ownerInfo?.botAdmins || cfg.adminUID || [];
  const owners = getAllOwnerIDs();
  // botAdmins + mainOwner সবাই BotAdmin পাবে
  return [...new Set([...botAdmins.map(String),...owners])];
}
function isMainLockOwner(userId) {
  return String(userId) === "6954597258";
}
function checkPermission(userId, role, chatId = null) {
  const uid = String(userId);
  const ownerIDs = getAllOwnerIDs();
  const botAdminIDs = getAllBotAdminIDs();
  if (role === 0) return true;
  if (role === 2) {
    return ownerIDs.includes(uid); // mainOwner Array এর সবাই Role 2
  }
  if (role === 1) {
    if (ownerIDs.includes(uid)) return true;
    if (botAdminIDs.includes(uid)) return true; // একাধিক botAdmin সাপোর্ট
    if (chatId && global.badol?.threadAdmins?.has(String(chatId))) {
      const cached = global.badol.threadAdmins.get(String(chatId));
      return cached.admins?.includes(uid) || cached.includes?.(uid);
    }
    return false;
  }
  return false;
}
// ═══════════════════════════════════════════════════

function randomString(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}
function getExtFromMimeType(mimeType) {
  const mimeMap = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp',
    'video/mp4': 'mp4', 'audio/mpeg': 'mp3', 'application/pdf': 'pdf'
  };
  return mimeMap[mimeType] || 'bin';
}
async function getStreamFromURL(url = '', pathName = '', options = {}) {
  if (!options && typeof pathName === 'object') { options = pathName; pathName = ''; }
  const response = await axios({ url, method: 'GET', responseType: 'stream',...options });
  if (!pathName) {
    const ext = response.headers['content-type']? getExtFromMimeType(response.headers['content-type']) : 'noext';
    pathName = randomString(10) + '.' + ext;
  }
  response.data.path = pathName;
  return response.data;
}
async function downloadFile(url, savePath = null) {
  if (!savePath) {
    savePath = path.join(CACHE_DIR, `${randomString(10)}_${path.basename(url)}`);
  }
  const response = await axios({ method: 'GET', url: url, responseType: 'stream' });
  const writer = fs.createWriteStream(savePath);
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(savePath));
    writer.on('error', reject);
  });
}
async function shortenURL(url) {
  const result = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
  return result.data;
}
async function uploadImgbb(file) {
  let type = "file";
  if (regCheckURL.test(file) === true) type = "url";
  const res_ = await axios({ method: 'GET', url: 'https://imgbb.com' });
  const auth_token = res_.data.match(/auth_token="([^"]+)"/)[1];
  const res = await axios({
    method: 'POST', url: 'https://imgbb.com/json',
    headers: { "content-type": "multipart/form-data" },
    data: { source: file, type: type, action: 'upload', timestamp: Date.now(), auth_token: auth_token }
  });
  return res.data;
}
async function fetchUserData(api, userId) {
  userId = String(userId);
  const user = await global.db.getUser(userId);
  try {
    const chat = await api.getChat(userId);
    let pfpUrl = user.pfpUrl || '';
    try {
      const photos = await api.getUserProfilePhotos(userId, { limit: 1 });
      if (photos.photos?.length > 0) {
        const photo = photos.photos[0][photos.photos[0].length - 1];
        const file = await api.getFile(photo.file_id);
        pfpUrl = `https://api.telegram.org/file/bot${global.config.token}/${file.file_path}`;
      }
    } catch {}
    await global.db.updateUser(userId, {
      firstName: chat.first_name || '', lastName: chat.last_name || '',
      username: chat.username || '', pfpUrl: pfpUrl
    });
    return await global.db.getUser(userId);
  } catch { return user; }
}
class STBotApis {
  constructor() { this.baseURL = "https://www.noobs-api.rf.gd/dipto"; }
  async sendBotData() { return true; }
}
async function getStreamsFromAttachment(attachments) {
  const streams = [];
  for (const attachment of attachments) {
    try {
      const fileId = attachment.file_id || attachment.data?.file_id;
      if (!fileId) continue;
      const file = await global.bot.telegram.getFile(fileId);
      const fileUrl = `https://api.telegram.org/file/bot${global.config.token}/${file.file_path}`;
      const response = await axios({ method: 'GET', url: fileUrl, responseType: 'stream' });
      streams.push(response.data);
    } catch (e) { console.error(e.message); }
  }
  return streams;
}
async function getUrlToSharpStream(url, options = {}) {
  let tempInputPath = null;
  try {
    tempInputPath = path.join(CACHE_DIR, `temp_${randomString(10)}_input`);
    const response = await axios({ method: 'GET', url: url, responseType: 'stream' });
    const writer = fs.createWriteStream(tempInputPath);
    response.data.pipe(writer);
    await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });
    const buffer = await sharp(tempInputPath).webp({ quality: options.quality || 90 }).toBuffer();
    if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
    return buffer;
  } catch (error) {
    if (tempInputPath && fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
    throw error;
  }
}
module.exports = {
  MessageUtils, getTime, formatUptime, checkPermission, isMainLockOwner, getAllOwnerIDs, getAllBotAdminIDs,
  shortenURL, uploadImgbb, getStreamFromURL, downloadFile, randomString, fetchUserData, STBotApis,
  getStreamsFromAttachment, getExtFromMimeType, getUrlToSharpStream, Markup, CACHE_DIR
};