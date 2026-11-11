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

// ===== account copy of the save =====
// When the page runs inside the Claude viewer, progress is also kept in the viewer's own private
// document (data/users/<id>/save), so it survives a different device, browser or cleared site data.
// Everything here is optional: without the capability the game simply stays on browser storage.
const CLOUD = {
  doc: null, on: false, busy: false, again: false, sent: '', timer: null, fail: 0,
  // what counts as progress (play time and per-device options are left out on purpose)
  sig(d) { const c = Object.assign({}, d); delete c.t; delete c.opt; return JSON.stringify(c); },
  // union of two saves: never drops a star, a crystal or a cleared world
  merge(a, b) {
    const m = JSON.parse(JSON.stringify(a));
    if (!b || typeof b !== 'object') return m;
    const mx = (x, y) => Math.max(Number(x) || 0, Number(y) || 0);
    Object.keys(b.st || {}).forEach((k) => { m.st[k] = mx(m.st[k], b.st[k]); });
    Object.keys(b.cr || {}).forEach((w) => { const s = m.cr[w] || (m.cr[w] = []); (b.cr[w] || []).forEach((id) => { if (s.indexOf(id) < 0) s.push(id); }); });
    ['cleared', 'seen', 'sec'].forEach((f) => Object.keys(b[f] || {}).forEach((k) => { if (b[f][k]) m[f][k] = m[f][k] || b[f][k]; }));
    Object.keys(b.gt || {}).forEach((k) => { m.gt[k] = mx(m.gt[k], b.gt[k]); });
    m.intro = mx(m.intro, b.intro); m.done = mx(m.done, b.done); m.t = mx(m.t, b.t);
    if (!m.last && b.last) m.last = b.last;
    return m;
  },
  async init() {
    try {
      const c = window.claude;
      if (!c || typeof c.use !== 'function') return;
      const db = await c.use('db'), user = await c.use('user');
      if (!db || !user) return;
      const id = await user.id();
      if (!id) return;
      this.doc = db.doc('data/users/' + id + '/save');
      const snap = await Promise.race([this.doc.get(), new Promise((r) => setTimeout(() => r(null), 10000))]);
      if (!snap) return;
      let remote = null;
      if (snap.exists) { try { const body = snap.data(); remote = body && typeof body.json === 'string' ? JSON.parse(body.json) : null; } catch (e) { remote = null; } }
      const before = this.sig(SV.d);
      this.sent = remote ? this.sig(remote) : '';
      this.on = true;
      if (remote) {
        const merged = this.merge(SV.d, remote);
        if (this.sig(merged) !== before) { SV.d = merged; SV.save(); bus.emit('cloud:merged'); }
      }
      bus.emit('cloud:state');
      this.queue();
    } catch (e) { this.on = false; }
  },
  queue() {
    if (!this.on) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 2000);
  },
  async flush() {
    if (!this.on || !this.doc) return;
    clearTimeout(this.timer);
    const s = this.sig(SV.d);
    if (s === this.sent) return;
    if (this.busy) { this.again = true; return; }
    this.busy = true;
    try { await this.doc.set({ v: 1, json: JSON.stringify(SV.d) }); this.sent = s; this.fail = 0; }
    catch (e) {
      this.fail++;
      const code = e && e.code;
      if (code === 'invalid_argument' || code === 'revoked' || code === 'not_granted' || code === 'quota_exceeded' || code === 'capability_disabled' || code === 'capability_removed' || this.fail >= 3) { this.on = false; bus.emit('cloud:state'); }
    }
    this.busy = false;
    if (this.again) { this.again = false; this.queue(); }
  }
};
