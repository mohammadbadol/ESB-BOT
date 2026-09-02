// BADOL/referralSystem.js - V10 MONGODB FAST FIXED - NO FS SCAN
const path = require('path');

class ReferralSystem {
  constructor() {
    this.NEW_USER_CREDIT = 2;
    this.REFERRER_BONUS = 5;
    this.REFEREE_BONUS = 2;
    this._paidCache = { list: [], time: 0 };
    this._realNameCache = new Map();
    this._realNameCacheTime = 0;
  }

  async getPaidList() {
    try {
      if (Date.now() - this._paidCache.time < 60000) {
        return this._paidCache.list;
      }
      if (global.db?.getSettings) {
        const s = await global.db.getSettings();
        if(s?.paidCommands && Array.isArray(s.paidCommands)){
          this._paidCache = { list: s.paidCommands || [], time: Date.now() };
          return s.paidCommands;
        }
      }
      return this._paidCache.list || [];
    } catch { return this._paidCache.list || []; }
  }

  // ✅ FAST - Cached + No FS
  getRealName(input) {
    if (!input) return input;
    const name = String(input).toLowerCase();
    
    // Cache 1 min
    if(Date.now() - this._realNameCacheTime < 60000 && this._realNameCache.has(name)) {
      return this._realNameCache.get(name);
    }

    try {
      if (global.badol?.commands) {
        const direct = global.badol.commands.get(name);
        if (direct) {
          this._realNameCache.set(name, direct.config.name);
          return direct.config.name;
        }
        for (const [_, c] of global.badol.commands) {
          if (c.config.aliases && c.config.aliases.map(a=>a.toLowerCase()).includes(name)) {
            this._realNameCache.set(name, c.config.name);
            return c.config.name;
          }
        }
      }
    } catch {}
    
    // Not found, return input itself
    this._realNameCache.set(name, input);
    return input;
  }

  async isPaid(inputName) {
    if (!inputName) return false;
    const paidList = (await this.getPaidList()).map(v => String(v).toLowerCase());
    if(paidList.length === 0) return false;
    const realName = this.getRealName(inputName).toLowerCase();
    const input = String(inputName).toLowerCase();
    return paidList.includes(realName) || paidList.includes(input);
  }

  isPaidSync(inputName) {
    if (!inputName) return false;
    const list = this._paidCache.list.map(v => String(v).toLowerCase());
    if (list.length === 0) return false;
    const input = String(inputName).toLowerCase();
    const real = this.getRealName(inputName).toLowerCase();
    return list.includes(input) || list.includes(real);
  }

  async getUser(userId) {
    userId = String(userId);
    let user = await global.db.getUser(userId).catch(()=>null);
    if (!user || !user.id) {
      const newUser = {
        id: userId,
        credits: this.NEW_USER_CREDIT,
        referrals: 0,
        referredBy: null,
        joinedAt: Date.now()
      };
      await global.db.updateUser(userId, newUser).catch(()=>{});
      return newUser;
    }
    if (user.credits === undefined || user.credits === null) user.credits = this.NEW_USER_CREDIT;
    if (user.referrals === undefined) user.referrals = 0;
    return user;
  }

  async useCredit(userId, cmdName) {
    const realName = this.getRealName(cmdName);
    const isPaid = await this.isPaid(realName);
    if (!isPaid) return { ok: true, bypass: true };
    
    const user = await this.getUser(userId);
    if ((user.credits || 0) > 0) {
      const newCredits = (user.credits || 0) - 1;
      await global.db.updateUser(String(userId), { credits: newCredits }).catch(()=>{});
      return { ok: true, left: newCredits };
    }
    return { ok: false, left: 0 };
  }

  async handleReferral(newId, refId) {
    newId = String(newId);
    refId = String(refId);

    if (newId === refId) {
      return { ok: false, success: false, reason: "self" };
    }

    const newUser = await this.getUser(newId);
    if (newUser.referredBy || newUser.referrer) {
      return { ok: false, success: false, reason: "already referred" };
    }

    const refUser = await this.getUser(refId);

    const refNewCredits = (refUser.credits || 0) + this.REFERRER_BONUS;
    const refNewReferrals = (refUser.referrals || 0) + 1;
    const newUserCredits = (newUser.credits || 0) + this.REFEREE_BONUS;

    await global.db.updateUser(refId, { credits: refNewCredits, referrals: refNewReferrals }).catch(()=>{});
    await global.db.updateUser(newId, { credits: newUserCredits, referredBy: refId, referrer: refId }).catch(()=>{});

    console.log(`✅ REFER SUCCESS: ${newId} -> ${refId} | Ref: ${refNewCredits} | New: ${newUserCredits}`);

    return {
      ok: true,
      success: true,
      refUser: { ...refUser, credits: refNewCredits },
      newUser: { ...newUser, credits: newUserCredits }
    };
  }

  // For paid.js command to refresh cache
  clearCache() {
    this._paidCache.time = 0;
    this._realNameCache.clear();
    this._realNameCacheTime = 0;
  }
}

module.exports = new ReferralSystem();