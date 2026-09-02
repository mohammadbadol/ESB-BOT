const fs = require('fs');
const path = require('path');

class JsonDatabase {
  constructor() {
    this.dataDir = path.join(__dirname, 'data');
    this.usersFile = path.join(this.dataDir, 'users.json');
    this.threadsFile = path.join(this.dataDir, 'threads.json');
    this.approvalsFile = path.join(this.dataDir, 'approvals.json');
    this.bansFile = path.join(this.dataDir, 'bans.json');

    this.users = new Map();
    this.threads = new Map();
    this.approvals = new Map();
    this.bans = new Map();

    this.init();
  }

  init() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    if (fs.existsSync(this.usersFile)) {
      const data = JSON.parse(fs.readFileSync(this.usersFile, 'utf-8'));
      this.users = new Map(Object.entries(data));
    } else {
      fs.writeFileSync(this.usersFile, JSON.stringify({}, null, 2));
    }

    if (fs.existsSync(this.threadsFile)) {
      const data = JSON.parse(fs.readFileSync(this.threadsFile, 'utf-8'));
      this.threads = new Map(Object.entries(data));
    } else {
      fs.writeFileSync(this.threadsFile, JSON.stringify({}, null, 2));
    }

    if (fs.existsSync(this.approvalsFile)) {
      const data = JSON.parse(fs.readFileSync(this.approvalsFile, 'utf-8'));
      this.approvals = new Map(Object.entries(data));
    } else {
      fs.writeFileSync(this.approvalsFile, JSON.stringify({}, null, 2));
    }

    if (fs.existsSync(this.bansFile)) {
      const data = JSON.parse(fs.readFileSync(this.bansFile, 'utf-8'));
      this.bans = new Map(Object.entries(data));
    } else {
      fs.writeFileSync(this.bansFile, JSON.stringify({}, null, 2));
    }
  }

  save() {
    const usersObj = Object.fromEntries(this.users);
    const threadsObj = Object.fromEntries(this.threads);
    const approvalsObj = Object.fromEntries(this.approvals);
    const bansObj = Object.fromEntries(this.bans);

    fs.writeFileSync(this.usersFile, JSON.stringify(usersObj, null, 2));
    fs.writeFileSync(this.threadsFile, JSON.stringify(threadsObj, null, 2));
    fs.writeFileSync(this.approvalsFile, JSON.stringify(approvalsObj, null, 2));
    fs.writeFileSync(this.bansFile, JSON.stringify(bansObj, null, 2));
  }

  async getUser(userId) {
    userId = String(userId);
    if (!this.users.has(userId)) {
      this.users.set(userId, {
        id: userId,
        firstName: '',
        lastName: '',
        username: '',
        pfpUrl: '',
        location: '',
        exp: 0,
        money: 0,
        level: 1,
        lastDailyClaim: '',
        banned: false,
        dmApproved: false,
        warnings: {},
        messageCount: {},
        lastSeen: Date.now(),
        createdAt: Date.now()
      });
      this.save();
    }
    return this.users.get(userId);
  }

  async updateUser(userId, data) {
    userId = String(userId);
    const user = await this.getUser(userId);
    Object.assign(user, data);
    user.lastSeen = Date.now();
    this.users.set(userId, user);
    this.save();
    return user;
  }

  async getThread(threadId) {
    threadId = String(threadId);
    if (!this.threads.has(threadId)) {
      const isGroup = threadId.startsWith("-");
      this.threads.set(threadId, {
        id: threadId,
        threadID: threadId,
        name: '',
        type: isGroup? 'supergroup' : 'private',
        totalUsers: 0,
        customPrefix: '',
        approved: true,
        antiOut: false,
        approvalMode: false,
        autoApprove: false,
        lockedName: false,
        lockedPhoto: false,
        lockedDescription: false,
        savedName: '',
        savedPhoto: '',
        savedDescription: '',
        totalMessages: 0,
        userMessages: {},
        isPrivate:!isGroup,
        isGroup: isGroup,
        isSupergroup: isGroup,
        isChannel: false,
        description: '',
        username: '',
        inviteLink: '',
        photoUrl: '',
        pinnedMessageId: null,
        permissions: {},
        lastActivity: Date.now(),
        createdAt: Date.now()
      });
      this.save();
    }
    return this.threads.get(threadId);
  }

  async updateThread(threadId, data) {
    threadId = String(threadId);
    const thread = await this.getThread(threadId);
    Object.assign(thread, data);
    if (threadId.startsWith("-")) {
      thread.isGroup = true;
      thread.isPrivate = false;
    }
    thread.lastActivity = Date.now();
    this.threads.set(threadId, thread);
    this.save();
    return thread;
  }

  async incrementMessageCount(userId, threadId) {
    userId = String(userId);
    threadId = String(threadId);

    const user = await this.getUser(userId);
    if (!user.messageCount || typeof user.messageCount!== 'object') {
      user.messageCount = {};
    }
    const currentUserCount = user.messageCount[threadId] || 0;
    user.messageCount[threadId] = currentUserCount + 1;
    user.lastSeen = Date.now();
    this.users.set(userId, user);

    const thread = await this.getThread(threadId);
    if (!thread.userMessages || typeof thread.userMessages!== 'object') {
      thread.userMessages = {};
    }
    const currentThreadTotal = thread.totalMessages || 0;
    const currentUserThreadCount = thread.userMessages[userId] || 0;

    thread.totalMessages = currentThreadTotal + 1;
    thread.userMessages[userId] = currentUserThreadCount + 1;
    thread.lastActivity = Date.now();
    if (threadId.startsWith("-")) thread.isGroup = true;

    this.threads.set(threadId, thread);
    this.save();

    return {
      userCount: user.messageCount[threadId],
      threadTotal: thread.totalMessages
    };
  }

  async getUserMessageCount(userId, threadId) {
    userId = String(userId);
    threadId = String(threadId);
    const user = await this.getUser(userId);
    return user.messageCount?.[threadId] || 0;
  }

  async getThreadMessageStats(threadId) {
    threadId = String(threadId);
    const thread = await this.getThread(threadId);
    return {
      totalMessages: thread.totalMessages || 0,
      userMessages: thread.userMessages || {}
    };
  }

  // ✅ NEW: getStats() - ckuser & noti এর জন্য মাস্ট
  async getStats() {
    const users = Array.from(this.users.values());
    const threads = Array.from(this.threads.values());
    const groups = threads.filter(t => t.isGroup || String(t.id).startsWith("-"));
    const privates = threads.filter(t =>!t.isGroup &&!String(t.id).startsWith("-"));
    return {
      users: users,
      threads: threads,
      totalUsers: users.length,
      totalThreads: threads.length,
      totalGroups: groups.length,
      totalPrivate: privates.length,
      groups: groups,
      privates: privates
    };
  }

  async getTotalMessages() {
    let total = 0;
    for (let t of this.threads.values()) total += (t.totalMessages || 0);
    return total;
  }

  async deleteThread(threadId) {
    threadId = String(threadId);
    this.threads.delete(threadId);
    this.save();
  }

  async deleteUser(userId) {
    userId = String(userId);
    this.users.delete(userId);
    this.save();
  }

  async incrementUserExp(userId, amount = 5) {
    userId = String(userId);
    const user = await this.getUser(userId);
    user.exp += amount;
    const expNeeded = user.level * 100;
    if (user.exp >= expNeeded) {
      user.level++;
      user.exp = user.exp - expNeeded;
    }
    this.users.set(userId, user);
    this.save();
    return user;
  }

  async getAllUsers() {
    return Array.from(this.users.values());
  }

  async getAllThreads() {
    return Array.from(this.threads.values());
  }

  async addApproval(type, data) {
    const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.approvals.set(id, { id, type,...data, createdAt: Date.now() });
    this.save();
    return id;
  }

  async getApproval(id) { return this.approvals.get(id); }
  async removeApproval(id) { this.approvals.delete(id); this.save(); }
  async getAllApprovals(type = null) {
    const all = Array.from(this.approvals.values());
    if (type) return all.filter(a => a.type === type);
    return all;
  }

  async banUser(userId, reason = '', bannedBy = '') {
    userId = String(userId);
    this.bans.set(userId, { userId, reason, bannedBy, bannedAt: Date.now() });
    await this.updateUser(userId, { banned: true });
    this.save();
  }
  async unbanUser(userId) {
    userId = String(userId);
    this.bans.delete(userId);
    await this.updateUser(userId, { banned: false });
    this.save();
  }
  async isUserBanned(userId) { return this.bans.has(String(userId)); }
  async getAllBans() { return Array.from(this.bans.values()); }

  async addUnbanRequest(userId, reason = '', chatId = null) {
    const id = `unban_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.approvals.set(id, { id, type: 'unban', userId: String(userId), reason, chatId: chatId? String(chatId) : null, createdAt: Date.now() });
    this.save();
    return id;
  }
  async getUnbanRequests() { return Array.from(this.approvals.values()).filter(a => a.type === 'unban'); }

  async addWarning(userId, chatId, reason = '', warnedBy = '') {
    userId = String(userId); chatId = String(chatId);
    const user = await this.getUser(userId);
    if (!user.warnings || typeof user.warnings!== 'object') user.warnings = {};
    if (!user.warnings[chatId]) user.warnings[chatId] = [];
    user.warnings[chatId].push({ reason, warnedBy, warnedAt: Date.now() });
    await this.updateUser(userId, { warnings: user.warnings });
    return user.warnings[chatId].length;
  }
  async getWarnings(userId, chatId) {
    const user = await this.getUser(String(userId));
    if (!user.warnings || typeof user.warnings!== 'object') return [];
    return user.warnings[String(chatId)] || [];
  }
  async clearWarnings(userId, chatId) {
    const user = await this.getUser(String(userId));
    if (user.warnings && user.warnings[String(chatId)]) {
      delete user.warnings[String(chatId)];
      await this.updateUser(String(userId), { warnings: user.warnings });
    }
  }
}

module.exports = JsonDatabase;