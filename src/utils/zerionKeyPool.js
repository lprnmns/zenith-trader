// src/utils/zerionKeyPool.js
const AdminNotification = require('../services/adminNotificationService');

class ZerionKeyPool {
  constructor(keys = [], opts = {}) {
    const arr = (Array.isArray(keys) ? keys : String(keys || '').split(',')).map(s => String(s || '').trim()).filter(Boolean);
    this.cooldownMs = Number(opts.cooldownMs || process.env.ZERION_KEY_COOLDOWN_MS || 120000); // 2 min per-key default
    this.notify = String(opts.notify ?? process.env.ZERION_NOTIFY_ON_THROTTLE ?? 'true').toLowerCase() === 'true';
    this.notifyCooldownMs = Number(opts.notifyCooldownMs || process.env.ZERION_NOTIFY_COOLDOWN_MS || 300000); // 5 min
    this.globalRetryMs = Number(opts.globalRetryMs || process.env.ZERION_GLOBAL_RETRY_MS || 3600000); // 1 hour
    this.globalCooldownUntil = 0;
    this.globalLastNotifiedAt = 0;
    this.pointer = 0;
    this.keys = arr.map((k, i) => ({ id: i, key: k, nextAvailableAt: 0, hits: 0, throttles: 0, lastNotifiedAt: 0, invalid: false }));
  }

  hasKeys() { return (this.keys?.length || 0) > 0; }

  now() { return Date.now(); }

  inGlobalCooldown() { return this.globalCooldownUntil && this.now() < this.globalCooldownUntil; }

  readyForGlobalRetry() { return this.globalCooldownUntil && this.now() >= this.globalCooldownUntil; }

  // Pick next available key in round-robin fashion
  getActiveKey() {
    if (!this.hasKeys()) return null;
    const now = this.now();
    for (let i = 0; i < this.keys.length; i++) {
      const idx = (this.pointer + i) % this.keys.length;
      const k = this.keys[idx];
      if (!k.invalid && (k.nextAvailableAt || 0) <= now) {
        this.pointer = (idx + 1) % this.keys.length;
        k.hits++;
        return k;
      }
    }
    // all throttled/invalid; pick earliest available (even if invalid)
    const earliest = this.keys.reduce((a, b) => (a.nextAvailableAt <= b.nextAvailableAt ? a : b));
    return earliest; // caller may wait or still use it
  }

  markThrottle(keyId, meta = {}) {
    const k = this.keys.find((x) => x.id === keyId);
    if (!k) return;
    const now = this.now();
    k.throttles++;
    k.nextAvailableAt = now + this.cooldownMs;

    if (this.notify) {
      if (!k.lastNotifiedAt || now - k.lastNotifiedAt > this.notifyCooldownMs) {
        k.lastNotifiedAt = now;
        try {
          const detail = meta?.detail || 'Too many requests (429)';
          const ctx = `Key#${keyId} throttled. Cooldown: ${Math.round(this.cooldownMs/1000)}s. ${detail}`;
          AdminNotification.sendEmail({
            subject: 'Zerion API throttle detected',
            html: `<p>${ctx}</p>`,
            text: ctx,
          }).catch(() => {});
        } catch (_) {}
      }
    }
  }

  markInvalid(keyId, meta = {}) {
    const k = this.keys.find((x) => x.id === keyId);
    if (!k) return;
    const now = this.now();
    // Mark as invalid and push availability far into the future (24h)
    k.invalid = true;
    k.nextAvailableAt = now + (meta.cooldownMs || 24*60*60*1000);
    try {
      const detail = meta?.detail || 'Unauthorized (401): invalid API key';
      const ctx = `Key#${keyId} marked invalid. Disabled for 24h. ${detail}`;
      AdminNotification.sendEmail({
        subject: 'Zerion API invalid key detected',
        html: `<p>${ctx}</p>`,
        text: ctx,
      }).catch(() => {});
    } catch (_) {}
  }

  startGlobalCooldown(meta = {}) {
    const now = this.now();
    this.globalCooldownUntil = now + this.globalRetryMs;
    const ctx = meta?.message || `All Zerion API keys exhausted. Pausing for ${Math.round(this.globalRetryMs/60000)} minutes.`;
    try {
      AdminNotification.sendEmail({ subject: 'Zerion API: all keys exhausted', html: `<p>${ctx}</p>`, text: ctx }).catch(() => {});
    } catch (_) {}
  }

  extendGlobalCooldown() {
    // Schedule next retry after the configured interval
    this.globalCooldownUntil = this.now() + this.globalRetryMs;
  }

  clearGlobalCooldown(opts = { notify: true }) {
    if (this.globalCooldownUntil) {
      this.globalCooldownUntil = 0;
      if (opts?.notify) {
        try {
          const msg = 'Zerion API keys reactivated. Resuming requests.';
          AdminNotification.sendEmail({ subject: 'Zerion API: keys reactivated', html: `<p>${msg}</p>`, text: msg }).catch(() => {});
        } catch (_) {}
      }
    }
  }
}

module.exports = ZerionKeyPool;

