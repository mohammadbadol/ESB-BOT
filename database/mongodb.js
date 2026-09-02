const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  firstName: String,
  lastName: String,
  username: String,
  pfpUrl: String,
  location: String,
  exp: { type: Number, default: 0 },
  money: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  lastDailyClaim: { type: String, default: '' },
  banned: { type: Boolean, default: false },
  dmApproved: { type: Boolean, default: false },
  warnings: { type: Object, default: {} },
  messageCount: { type: Object, default: {} },
  createdAt: { type: Number, default: Date.now }
}, { strict: false });

const threadSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  type: String,
  totalUsers: { type: Number, default: 0 },
  customPrefix: { type: String, default: '' },
  approved: { type: Boolean, default: false },
  antiOut: { type: Boolean, default: false },
  approvalMode: { type: Boolean, default: false },
  autoApprove: { type: Boolean, default: false },
  lockedName: { type: Boolean, default: false },
  lockedPhoto: { type: Boolean, default: false },
  lockedDescription: { type: Boolean, default: false },
  savedName: { type: String, default: '' },
  savedPhoto: { type: String, default: '' },
  savedDescription: { type: String, default: '' },
  totalMessages: { type: Number, default: 0 },
  userMessages: { type: Object, default: {} },
  isPrivate: { type: Boolean, default: false },
  isGroup: { type: Boolean, default: false },
  isSupergroup: { type: Boolean, default: false },
  isChannel: { type: Boolean, default: false },
  description: { type: String, default: '' },
  username: { type: String, default: '' },
  inviteLink: { type: String, default: '' },
  photoUrl: { type: String, default: '' },
  pinnedMessageId: { type: Number, default: null },
  permissions: { type: Object, default: {} },
  lastActivity: { type: Number, default: Date.now },
  createdAt: { type: Number, default: Date.now },
  leftAt: { type: Number, default: null },
  unapprovedTime: { type: Number, default: null },
  leftReason: { type: String, default: '' },
  reAddedAt: { type: Number, default: null }
}, { strict: false });

const approvalSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  chatId: String,
  chatName: String,
  userId: String,
  userName: String,
  addedBy: String,
  addedByName: String,
  createdAt: { type: Number, default: Date.now }
}, { strict: false });

const banSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  reason: String,
  bannedBy: String,
  bannedAt: { type: Number, default: Date.now }
}, { strict: false });

const settingsSchema = new mongoose.Schema({ key: { type: String, unique: true }, data: Object }, { strict: false });
const lockedCmdSchema = new mongoose.Schema({ name: { type: String, unique: true } }, { strict: false });
const groupCmdSchema = new mongoose.Schema({ groupId: String, mode: String, enabled: [String] }, { strict: false });
const approvedGroupSchema = new mongoose.Schema({ groupId: { type: String, unique: true } }, { strict: false });
const paidCmdSchema = new mongoose.Schema({ name: { type: String, unique: true } }, { strict: false });

class MongoDatabase {
  constructor() {
    this.User = null; this.Thread = null; this.Approval = null; this.Ban = null;
    this.Settings = null; this.LockedCmd = null; this.GroupCmd = null; this.ApprovedGroup = null; this.PaidCmd = null;
    this.connected = false;
  }

  async connect(uri) {
    try {
      await mongoose.connect(uri, { dbName: 'BADOL_TG_BOT' });
      this.User = mongoose.model('User', userSchema);
      this.Thread = mongoose.model('Thread', threadSchema);
      this.Approval = mongoose.model('Approval', approvalSchema);
      this.Ban = mongoose.model('Ban', banSchema);
      this.Settings = mongoose.model('Settings', settingsSchema);
      this.LockedCmd = mongoose.model('LockedCmd', lockedCmdSchema);
      this.GroupCmd = mongoose.model('GroupCmd', groupCmdSchema);
      this.ApprovedGroup = mongoose.model('ApprovedGroup', approvedGroupSchema);
      this.PaidCmd = mongoose.model('PaidCmd', paidCmdSchema);
      this.connected = true;
      console.log("✅ MongoDB Connected - FINAL FIXED V4");
      await this.Thread.updateMany({ approved: { $exists: false } }, { $set: { approved: false } }).catch(()=>{});
      await this.Thread.updateMany({ approved: null }, { $set: { approved: false } }).catch(()=>{});
      console.log("✅ Fixed Old Threads - No Auto OFF on Restart");
      return true;
    } catch (error) { console.error('MongoDB error:', error); return false; }
  }

  async ensureUserAndThread(ctx) {
    try {
      const from = ctx.from; const chat = ctx.chat; if (!from) return;
      const uid = String(from.id);
      await this.User.updateOne(
        { id: uid },
        { $set: { firstName: from.first_name||'', lastName: from.last_name||'', username: from.username||'' }, $setOnInsert: { id: uid, createdAt: Date.now() } },
        { upsert: true }
      ).catch(()=>{});
      if (chat) {
        const tid = String(chat.id);
        const isGroup = chat.type==='group'||chat.type==='supergroup';
        if(isGroup){
          const existing = await this.Thread.findOne({ id: tid }).lean().catch(()=>null);
          if(!existing){
            await this.Thread.create({
              id: tid, name: chat.title||'', type: chat.type, isGroup: true, approved: false, createdAt: Date.now(), lastActivity: Date.now(), leftAt: null, leftReason: ''
            }).catch(()=>{});
          } else {
            await this.Thread.updateOne({ id: tid }, { $set: { name: chat.title||existing.name, lastActivity: Date.now() } }).catch(()=>{});
          }
        } else {
          await this.Thread.updateOne(
            { id: tid },
            { $set: { name: from.first_name||'', type: chat.type, lastActivity: Date.now() }, $setOnInsert: { id: tid, approved: false, createdAt: Date.now() } },
            { upsert: true }
          ).catch(()=>{});
        }
      }
    } catch {}
  }

  async getUser(userId) {
    userId = String(userId);
    let user = await this.User.findOne({ id: userId }).lean();
    if (!user) {
      await this.User.updateOne({ id: userId }, { $setOnInsert: { id: userId, createdAt: Date.now() } }, { upsert: true });
      user = await this.User.findOne({ id: userId }).lean();
    }
    return user;
  }
  async updateUser(userId, data) {
    userId = String(userId);
    return await this.User.findOneAndUpdate({ id: userId }, { $set: data }, { new: true, upsert: true }).lean();
  }
  async setUser(userId, data) { return await this.updateUser(userId, data); }
  async getThread(threadId) {
    threadId = String(threadId);
    let thread = await this.Thread.findOne({ id: threadId }).lean();
    if (!thread) {
      await this.Thread.updateOne({ id: threadId }, { $setOnInsert: { id: threadId, approved: false, createdAt: Date.now() } }, { upsert: true });
      thread = await this.Thread.findOne({ id: threadId }).lean();
    }
    return thread;
  }
  async updateThread(threadId, data) {
    threadId = String(threadId);
    if(data.approved === true) console.log(`[APPROVAL] ${threadId} ON - leftAt cleared`);
    if(data.approved === false) console.log(`[APPROVAL] ${threadId} OFF`);
    return await this.Thread.findOneAndUpdate({ id: threadId }, { $set: data, $unset: data.approved===true? { leftAt: "", leftReason: "", reAddedAt: "" } : {} }, { new: true, upsert: true }).lean();
  }
  async incrementUserExp(userId, amount = 5) {
    userId = String(userId);
    const user = await this.getUser(userId);
    let exp = (user.exp||0) + amount;
    let level = user.level||1;
    if (exp >= level * 100) { level++; exp = exp - level*100; }
    return await this.updateUser(userId, { exp, level });
  }
  async getAllUsers() { return await this.User.find({}).lean(); }
  async getAllThreads() { return await this.Thread.find({}).lean(); }
  async addApproval(type, data) {
    const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await this.Approval.create({ id, type,...data, createdAt: Date.now() });
    return id;
  }
  async getApproval(id) { return await this.Approval.findOne({ id }).lean() || null; }
  async removeApproval(id) { await this.Approval.deleteOne({ id }); }
  async getAllApprovals(type = null) { return await this.Approval.find(type? { type } : {}).lean(); }
  async banUser(userId, reason = '', bannedBy = '') {
    userId = String(userId);
    await this.Ban.findOneAndUpdate({ userId }, { userId, reason, bannedBy, bannedAt: Date.now() }, { upsert: true });
    await this.updateUser(userId, { banned: true });
  }
  async unbanUser(userId) { await this.Ban.deleteOne({ userId: String(userId) }); await this.updateUser(String(userId), { banned: false }); }
  async isUserBanned(userId) { return!!(await this.Ban.findOne({ userId: String(userId) }).lean()); }
  async getBanInfo(userId) { const b = await this.Ban.findOne({ userId: String(userId) }).lean(); return { reason: b?.reason||'Violation' }; }
  async getAllBans() { return await this.Ban.find({}).lean(); }
  async addWarning(userId, chatId, reason = '', warnedBy = '') {
    userId = String(userId); chatId = String(chatId);
    const user = await this.getUser(userId);
    const warnings = user.warnings||{};
    if (!warnings[chatId]) warnings[chatId]=[];
    warnings[chatId].push({ reason, warnedBy, warnedAt: Date.now() });
    await this.updateUser(userId, { warnings });
    return warnings[chatId].length;
  }
  async getWarnings(userId, chatId) { return (await this.getUser(String(userId))).warnings?.[String(chatId)]||[]; }
  async clearWarnings(userId, chatId) { const u = await this.getUser(String(userId)); const w = u.warnings||{}; delete w[String(chatId)]; await this.updateUser(String(userId), { warnings: w }); }
  async incrementMessageCount(userId, threadId) {
    this.User.updateOne({ id: String(userId) }, { $inc: { [`messageCount.${threadId}`]: 1 } }).exec().catch(()=>{});
    this.Thread.updateOne({ id: String(threadId) }, { $inc: { totalMessages: 1, [`userMessages.${userId}`]: 1 } }).exec().catch(()=>{});
    return { userCount: 1, threadTotal: 1 };
  }
  async getUserMessageCount(userId, threadId) { return (await this.getUser(String(userId))).messageCount?.[String(threadId)]||0; }
  async getThreadMessageStats(threadId) { const t = await this.getThread(String(threadId)); return { totalMessages: t.totalMessages||0, userMessages: t.userMessages||{} }; }
  async getSettings() { return (await this.Settings.findOne({ key: 'global' }).lean())?.data||{}; }
  async updateSettings(data) { return await this.Settings.updateOne({ key: 'global' }, { $set: { data } }, { upsert: true }); }
  async getLockedCommands() { return (await this.LockedCmd.find({}).lean()).map(x=>x.name); }
  async getAllGroupCommands() { const all = await this.GroupCmd.find({}).lean(); const obj={}; all.forEach(x=>obj[x.groupId]=x); return obj; }
  async getApprovedGroups() { return (await this.ApprovedGroup.find({}).lean()).map(x=>x.groupId); }
  async getPaidCommands() { return (await this.PaidCmd.find({}).lean()).map(x=>x.name); }
  async isPaid(name) { return!!(await this.PaidCmd.findOne({ name: String(name).toLowerCase() }).lean()); }
  async deleteThread(threadId) {
    threadId = String(threadId);
    await this.Thread.deleteOne({ id: threadId }).catch(()=>{});
  }
  async deleteGroup(groupId) { return await this.deleteThread(groupId); }
  async removeThread(threadId) { return await this.deleteThread(threadId); }
  async removeGroup(groupId) { return await this.deleteThread(groupId); }
  get db() { return { collection: (name) => mongoose.connection.db.collection(name) }; }
}
module.exports = MongoDatabase;