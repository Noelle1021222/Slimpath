// ===== save (browser storage; every access guarded) =====
const SV = {
  key: 'cacheblend-adventure-v1',
  d: null,
  fresh() {
    return { v: 1, st: {}, cr: {}, cleared: {}, sec: {}, opt: { sfx: 1, music: 1, q: 'auto', free: 0 }, last: '', intro: 0, done: 0, t: 0, miss: 0, seen: {}, gt: {} };
  },
  load() {
    let d = null;
    try { const raw = window.localStorage.getItem(this.key); if (raw) d = JSON.parse(raw); } catch (e) { d = null; }
    const f = this.fresh();
    if (!d || typeof d !== 'object' || d.v !== 1) d = f;
    for (const k in f) if (d[k] == null) d[k] = f[k];
    for (const k in f.opt) if (d.opt[k] == null) d.opt[k] = f.opt[k];
    this.d = d;
    return d;
  },
  save() {
    try { window.localStorage.setItem(this.key, JSON.stringify(this.d)); } catch (e) { /* storage unavailable: progress lasts for this visit only */ }
    bus.emit('saved');
  },
  reset() { const opt = this.d ? this.d.opt : null; this.d = this.fresh(); if (opt) this.d.opt = opt; this.save(); },
  stars(wid, sid) { return this.d.st[wid + '.' + sid] || 0; },
  isDone(wid, sid) { return !!this.d.st[wid + '.' + sid]; },
  setStation(wid, sid, stars) {
    const k = wid + '.' + sid;
    const first = !this.d.st[k];
    this.d.st[k] = Math.max(this.d.st[k] || 0, stars);
    this.save();
    return first;
  },
  crystals(wid) { return this.d.cr[wid] || (this.d.cr[wid] = []); },
  addCrystal(wid, id) { const a = this.crystals(wid); if (a.indexOf(id) < 0) { a.push(id); this.save(); return true; } return false; },
  totalStars() { let n = 0; for (const k in this.d.st) n += this.d.st[k]; return n; },
  totalCrystals() { let n = 0; for (const k in this.d.cr) n += this.d.cr[k].length; return n; },
  worldStars(wid) { let n = 0; for (const k in this.d.st) if (k.indexOf(wid + '.') === 0) n += this.d.st[k]; return n; }
};
