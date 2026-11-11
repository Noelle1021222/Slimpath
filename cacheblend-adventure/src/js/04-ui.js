// ===== HUD, dialog, toasts, modal shell =====
const WHO = {
  kv: { name: '凱薇', color: '#8fd3ff' },
  me: { name: '你', color: '#f4f6fb' },
  tok: { name: '分詞師傅 托克', color: '#58b06c' },
  att: { name: '祭司 艾坦', color: '#f2b632' },
  cac: { name: '礦工 卡許', color: '#8fd3ff' },
  rag: { name: '館長 芮格', color: '#c58be0' },
  pre: { name: '橋匠 普雷', color: '#ec8b3c' },
  ble: { name: '鍛造師 布蘭德', color: '#d9544f' },
  pip: { name: '碼頭長 派普', color: '#5b7fd6' },
  eva: { name: '裁判長 伊娃', color: '#f2b632' },
  boss: { name: '延遲魔龍 普利菲爾', color: '#7a3b8f' },
  sys: { name: '旁白', color: '#55608a' }
};

const UI = {
  modals: [], dialogOpen: false, promptKey: '', promptActs: null,
  blocking() { return this.modals.length > 0 || this.dialogOpen; },

  build() {
    const app = $('#app');
    this.app = app;
    this.hud = h('div#hud', { hidden: true },
      h('div.hud-top',
        h('button#btn-quest.chip', { 'aria-label': '任務清單', onclick: () => this.toggleQuest() }, h('span.q-world'), h('span.q-goal')),
        h('div.hud-right',
          h('div#ct-gem.chip.counter', { html: IC.gem + '<span>0</span>', title: 'KV 晶體' }),
          h('div#ct-star.chip.counter', { html: IC.star + '<span>0</span>', title: '星星' }),
          h('button#btn-ask.chip.icon-btn', { html: IC.ask, 'aria-label': '問凱薇', title: '問凱薇', hidden: true, onclick: () => bus.emit('ui:ask') }),
          h('button#btn-codex.chip.icon-btn', { html: IC.book, 'aria-label': '筆記本', title: '筆記本', onclick: () => bus.emit('ui:codex') }),
          h('button#btn-map.chip.icon-btn', { html: IC.map, 'aria-label': '世界地圖', title: '世界地圖', onclick: () => bus.emit('ui:map') }),
          h('button#btn-menu.chip.icon-btn', { html: IC.gear, 'aria-label': '設定', title: '設定', onclick: () => bus.emit('ui:menu') }))),
      h('div#quest-panel', { hidden: true }),
      h('div#act-hud', { hidden: true }),
      h('div#prompt', { hidden: true }),
      h('div#touch', h('div#stick', h('div#stick-knob')), h('button#btn-jump', { 'aria-label': '跳' }, '跳')));
    this.dlg = h('div#dialog', { hidden: true },
      h('div.face'),
      h('div', h('div.who'), h('div.txt')),
      h('div.more', h('button.skip', { onclick: (e) => { e.stopPropagation(); this.dialogSkip(); } }, '跳過對話'), h('span.tap', '點一下繼續 ▼')));
    this.dlg.addEventListener('click', () => this.dialogNext());
    this.toasts = h('div#toasts', { 'aria-live': 'polite' });
    this.modalRoot = h('div#modal-root');
    this.fadeEl = h('div#fade');
    app.append(this.hud, this.dlg, this.modalRoot, this.toasts, this.fadeEl);
    if (isCoarse()) app.classList.add('touch');
    window.addEventListener('touchstart', () => app.classList.add('touch'), { passive: true, once: true });
  },

  showHud(on) { this.hud.hidden = !on; },
  setQuest(world, goal) { $('.q-world', this.hud).textContent = world; $('.q-goal', this.hud).textContent = goal; },
  setCounters(gems, gemTotal, stars) {
    const g = $('#ct-gem span'), s = $('#ct-star span');
    const gt = gems + '/' + gemTotal, st = String(stars);
    if (g.textContent !== gt) { g.textContent = gt; this.bump($('#ct-gem')); }
    if (s.textContent !== st) { s.textContent = st; this.bump($('#ct-star')); }
  },
  bump(el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); },
  toggleQuest(force) {
    const p = $('#quest-panel');
    const show = force == null ? p.hidden : force;
    if (show) bus.emit('ui:quest', p);
    p.hidden = !show;
  },
  actHud(html) {
    const el = $('#act-hud');
    if (html == null) { if (!el.hidden) { el.hidden = true; el.innerHTML = ''; this.app.classList.remove('has-act'); } this._act = null; return; }
    if (this._act !== html) { el.innerHTML = html; this._act = html; }
    if (el.hidden) { el.hidden = false; this.app.classList.add('has-act'); }
  },
  // acts: [{label, fn, cls, key}] (at most two) or null
  setPrompt(acts) {
    const el = $('#prompt');
    const key = acts ? acts.map((a) => a.label + '|' + (a.cls || '')).join('~') : '';
    this.promptActs = acts;
    if (key === this.promptKey) return;
    this.promptKey = key;
    el.innerHTML = '';
    if (!acts || !acts.length) { el.hidden = true; return; }
    el.hidden = false;
    el.classList.toggle('two', acts.length > 1);
    acts.forEach((a, i) => {
      const k = a.key || (i === 0 ? 'E' : 'Q');
      if (acts.length === 1) {
        el.append(h('button#btn-interact', { onclick: () => this.firePrompt(i) }, h('span.key', k), h('span.lbl', a.label)));
      } else {
        el.append(h('button.act-btn.' + (a.cls || (i === 0 ? 'a' : 'b')), { onclick: () => this.firePrompt(i) }, h('span.key.mono', k), ' ', a.label));
      }
    });
  },
  firePrompt(i) {
    const a = this.promptActs && this.promptActs[i];
    if (a && !this.blocking()) { AU.init(); a.fn(); }
  },

  toast(msg, kind, ms) {
    const t = h('div.toast' + (kind ? '.' + kind : ''), { html: msg });
    this.toasts.append(t);
    while (this.toasts.children.length > 3) this.toasts.firstChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, ms || 2600);
  },

  fade(on) {
    this.fadeEl.classList.toggle('on', !!on);
    return sleep(on ? 380 : 60);
  },

  // ----- dialog -----
  say(lines) {
    if (!lines || !lines.length) return Promise.resolve();
    return new Promise((resolve) => {
      this.dq = lines.slice(); this.dResolve = resolve; this.dialogOpen = true;
      this.dlg.hidden = false; this.setPrompt(null);
      $('#touch').style.visibility = 'hidden';
      this.dialogShow();
    });
  },
  dialogShow() {
    const ln = this.dq.shift();
    const who = WHO[ln[0]] || WHO.sys;
    $('.who', this.dlg).textContent = who.name;
    $('.face', this.dlg).style.background = who.color;
    const txt = $('.txt', this.dlg);
    const rich = ln[1];
    const plain = rich.replace(/<[^>]+>/g, '');
    let i = 0;
    clearInterval(this.dTimer);
    this.dTyping = true;
    this.dFinish = () => { clearInterval(this.dTimer); txt.innerHTML = rich; this.dTyping = false; };
    txt.textContent = '';
    this.dTimer = setInterval(() => {
      i += 2;
      if (i >= plain.length) { this.dFinish(); return; }
      txt.textContent = plain.slice(0, i);
      if (i % 6 === 0) AU.sfx('tick');
    }, 28);
  },
  dialogNext() {
    if (!this.dialogOpen) return;
    AU.init();
    if (this.dTyping) { this.dFinish(); return; }
    if (this.dq.length) { this.dialogShow(); return; }
    this.dialogEnd();
  },
  dialogSkip() { if (this.dialogOpen) { clearInterval(this.dTimer); this.dialogEnd(); } },
  dialogEnd() {
    this.dialogOpen = false; this.dlg.hidden = true; this.dTyping = false;
    $('#touch').style.visibility = '';
    const r = this.dResolve; this.dResolve = null;
    if (r) r();
  },

  // ----- modal shell -----
  modal(sheet, opts) {
    opts = opts || {};
    const wrap = h('div.modal', sheet);
    const m = { el: wrap, sheet, opts, close: () => this.closeModal(m) };
    if (opts.dismissible !== false) wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap && opts.backdropClose) m.close(); });
    this.modals.push(m);
    this.modalRoot.append(wrap);
    this.setPrompt(null);
    this.toggleQuest(false);
    return m;
  },
  closeModal(m) {
    const i = this.modals.indexOf(m);
    if (i < 0) return;
    this.modals.splice(i, 1);
    m.el.remove();
    if (m.opts.onClose) m.opts.onClose();
  },
  topModal() { return this.modals[this.modals.length - 1]; },
  // generic sheet with header and close button
  sheet(title, sub, opts) {
    opts = opts || {};
    const body = h('div.sheet-body.nb');
    const head = h('div.sheet-head', h('h2', title, sub ? h('span.sub', sub) : null));
    const sheet = h('div.sheet' + (opts.cls ? '.' + opts.cls : ''), { role: 'dialog', 'aria-label': title }, head, body);
    const m = this.modal(sheet, opts);
    if (opts.dismissible !== false) head.append(h('button.x', { html: IC.x, 'aria-label': '關閉', onclick: () => m.close() }));
    m.body = body; m.head = head;
    return m;
  }
};
