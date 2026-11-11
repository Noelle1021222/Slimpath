// ===== game flow =====
function buildTitleLevel() {
  const lv = B.begin('title');
  B.island(0, 0, 14, 12, 0);
  B.tree(-4.8, -3.6, 0, 1.3); B.tree(5, -2.8, 0, 1.0); B.tree(-5.4, 2.6, 0, 0.9); B.bush(3.4, 4.2, 0, 1.2); B.bush(-2.6, 4.6, 0, 1); B.rock(5.2, 3, 0, 0.9);
  [COL.blue, COL.orange, COL.green].forEach((c, i) => {
    const g = tokenCube('KV ' + (i + 1), null, c, 1.1);
    g.position.set(-2.6 + i * 1.6, 1.3, -1.6); lv.group.add(g);
    lv.anims.push((dt, t) => { g.position.y = 1.3 + Math.sin(t * 1.5 + i * 1.1) * 0.22; g.rotation.y = Math.sin(t * 0.6 + i) * 0.5; });
  });
  B.crystals(4, -0.4, 0, 1.1);
  B.stone(-9.5, -2, 1.2, 2.4); B.stone(9.6, 1.5, 2.2, 2.2); B.gem(-9.5, 2.5, -2, 't0'); B.gem(9.6, 3.5, 1.5, 't1');
  lv.spawn = { x: 0.9, y: 0, z: 1.8 };
  lv.cam = { yaw: 0.4, pitch: 0.4, dist: 15 };
  lv.camLift = 3.2;
  lv.updates.push((dt, t) => {
    const m = E.p.model; if (!m) return;
    m.position.set(0.9, 0, 1.8); m.rotation.y = 0.5; m.scale.set(1, 1, 1); animRobot(m, t, 0, true, dt);
    if (E.kv) { E.kv.position.set(2.0, 2.1 + Math.sin(t * 2.4) * 0.14, 2.0); E.kv.rotation.y += dt * 1.6; if (E.kv.userData.ring) E.kv.userData.ring.rotation.x += dt * 2.2; }
    if (E.blob) { E.blob.visible = true; E.blob.position.set(0.9, 0.03, 1.8); E.blob.scale.set(1, 1, 1); }
  });
  B.backdrop({ seed: 3, clouds: 8, bits: 34 });
  return lv;
}

const READY = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6'];
const isReady = (w) => READY.indexOf(w.id) >= 0;

const GAME = {
  wid: null, world: null, lv: null, hooks: {}, mode3d: false, combo: 0, comboT: 0, titleEl: null, playT: 0,

  boot(data) {
    SV.load();
    UI.build();
    AU.setSfx(!!SV.d.opt.sfx); AU.setMusic(!!SV.d.opt.music);
    this.mode3d = E.init($('#gl'));
    if (this.mode3d) {
      E.p.model = makeRobot({}); E.p.model.visible = false;
      E.kv = makeKV(); E.kv.visible = false;
      E.blob = new THREE.Mesh(new THREE.CircleGeometry(0.46, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.26, depthWrite: false }));
      E.blob.rotation.x = -Math.PI / 2; E.blob.visible = false; E.scene.add(E.blob);
      E.start();
    } else {
      $('#gl').hidden = true;
      $('#app').prepend(h('div#nogl-bg'));
    }
    this.bind();
    const ld = $('#loading'); if (ld) ld.remove();
    if (data && data.wid && WORLDS.some((w) => w.id === data.wid)) this.enterWorld(data.wid, true);
    else this.showTitle();
    setInterval(() => { if (this.wid && !document.hidden) { SV.d.t += 5; } }, 5000);
  },

  bind() {
    bus.on('station', (st) => this.openStation(st));
    bus.on('portal', () => this.finishWorld());
    bus.on('gem', (g) => {
      const now = performance.now();
      this.combo = now - this.comboT < 1600 ? this.combo + 1 : 0; this.comboT = now;
      AU.sfx('coin', this.combo);
      E.fx.burst(g.x, g.y, g.z, COL.cyan, 16, 3.5, 0.7);
      SV.addCrystal(this.wid || 'title', g.id);
      this.refreshHud();
    });
    bus.on('fell', () => UI.toast('掉下去了！凱薇把你拉回剛才的位置。', 'warn', 1800));
    bus.on('ui:map', () => this.showMap());
    bus.on('ui:codex', () => this.showCodex());
    bus.on('ui:menu', () => this.showSettings());
    bus.on('ui:quest', (p) => this.renderQuest(p));
    bus.on('key', (k, e) => {
      if (UI.dialogOpen) { if (k === 'Enter' || k === ' ' || k === 'e') { e.preventDefault(); UI.dialogNext(); } else if (k === 'Escape') UI.dialogSkip(); return; }
      const top = UI.topModal();
      if (top) {
        if (k === 'Escape' && top.opts.dismissible !== false) top.close();
        else if (k === 'Enter') { const b = $('#nb-primary', top.el) || $('.btn.go', top.el); if (b && !b.hidden && !b.disabled) { e.preventDefault(); b.click(); } }
        return;
      }
      if (this.titleEl) { if (k === 'Enter') { const b = $('.btn', this.titleEl); if (b) b.click(); } return; }
      if (k === 'e' || k === 'Enter') UI.firePrompt(0);
      else if (k === 'q') UI.firePrompt(1);
      else if (k === 'm') this.showMap();
      else if (k === 'n') this.showCodex();
      else if (k === 'Escape') this.showSettings();
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) SV.save(); });
    try { if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => { SV.save(); return { wid: this.wid }; }); } catch (e) { /* not inside a viewer */ }
  },

  // ---------- title ----------
  showTitle() {
    this.closeAll();
    this.wid = null; this.world = null; this.lv = null;
    UI.showHud(false); UI.actHud(null);
    if (this.mode3d) { E.mode = 'title'; E.setLevel(buildTitleLevel()); }
    const has = SV.totalStars() > 0;
    const again = h('button.btn.alt', { onclick: () => {
      if (again.dataset.sure) { SV.reset(); this.showTitle(); UI.toast('進度已清空，重新出發。'); }
      else { again.dataset.sure = '1'; again.textContent = '再按一次：清空進度'; }
    } }, '從頭開始');
    this.titleEl = h('div#title',
      h('div.title-box',
        h('div.title-kicker', 'Transformer · KV Cache · RAG'),
        h('h1.title-name', 'CacheBlend', h('span', '大冒險')),
        h('div.title-legend', { 'aria-hidden': 'true' }, h('i', { style: { background: 'var(--blue)' } }), h('i', { style: { background: 'var(--orange)' } }), h('i', { style: { background: 'var(--green)' } }), h('i', { style: { background: 'var(--reuse)' } }), h('i', { style: { background: 'var(--recomp)' } })),
        h('p.title-tag', '從一個 token 出發，一路打到論文最後一頁。九個世界，帶你讀懂 CacheBlend 和它需要的所有基礎。'),
        h('div.title-btns',
          h('button.btn', { onclick: () => { AU.init(); AU.music(MUSIC.title); has ? this.showMap() : this.newGame(); } }, has ? '繼續冒險' : '開始冒險'),
          has ? again : null,
          h('button.btn.alt', { onclick: () => { AU.init(); this.showSettings(); } }, '設定')),
        h('p.title-foot', '內容依據論文〈CacheBlend: Fast Large Language Model Serving for RAG with Cached Knowledge Fusion〉與講義《從零理解 CacheBlend》。' + (this.mode3d ? '' : '（這台裝置無法啟動 3D，已改用筆記本模式，內容完全相同。）'))));
    UI.app.append(this.titleEl);
    UI.fade(false);
  },
  async newGame() {
    await UI.fade(true);
    if (this.titleEl) { this.titleEl.remove(); this.titleEl = null; }
    await UI.fade(false);
    await UI.say([
      ['sys', '推論王國的居民每天向<b>神諭 LLM</b>發問。為了答得準，神諭每次都要先讀完一大疊資料……'],
      ['sys', '於是大家越等越久。傳說<b>延遲魔龍 普利菲爾</b>盤踞在王國深處，吞掉了每一次回答前的寶貴時間。'],
      ['kv', '嗨！我是凱薇。聽說有一把<b>融合之刃 CacheBlend</b>能對付牠，但它碎成了八片，散落在八個世界。'],
      ['kv', '每個世界都藏著一塊必要的知識。集滿八片，你就能讀懂整篇論文，也能打倒魔龍。出發吧！']
    ]);
    SV.d.intro = 1; SV.save();
    this.enterWorld('w1');
  },
  closeAll() {
    UI.modals.slice().forEach((m) => { m.opts.onClose = null; UI.closeModal(m); });
    if (this.titleEl) { this.titleEl.remove(); this.titleEl = null; }
  },

  // ---------- map ----------
  unlocked(i) { return isReady(WORLDS[i]) && (i === 0 || !!SV.d.opt.free || !!SV.d.cleared[WORLDS[i - 1].id]); },
  fragments() { return WORLDS.filter((w) => w.no <= 8 && SV.d.cleared[w.id]).length; },
  showMap() {
    if (UI.dialogOpen) return;
    if (UI.modals.some((m) => m.opts.tag === 'map')) return;
    if (this.titleEl) { this.titleEl.remove(); this.titleEl = null; }
    const m = UI.sheet('世界地圖', '推論王國的九個世界', { cls: 'map-sheet', tag: 'map', dismissible: !!this.wid });
    const frag = this.fragments();
    m.body.classList.remove('sheet-body'); m.body.classList.add('map-wrap');
    m.body.append(h('div.map-top',
      h('div.tot', h('span', '★ ' + SV.totalStars()), h('span', '◆ ' + SV.totalCrystals()), h('span.row', '融合之刃 ' + frag + '/8 ', h('span.shards', Array.from({ length: 8 }, (_, i) => h('i' + (i < frag ? '.on' : ''))))) ),
      h('div.row', h('button.btn.small.alt', { onclick: () => this.showCodex() }, '筆記本'), this.wid ? null : h('button.btn.small.alt', { onclick: () => { m.close(); this.showTitle(); } }, '回標題'))));
    const grid = h('div.map-grid');
    WORLDS.forEach((w, i) => {
      const open = this.unlocked(i), cleared = !!SV.d.cleared[w.id];
      const maxS = (w.stations.length + 1) * 3;
      const gt = (SV.d.gt && SV.d.gt[w.id]) || 0;
      grid.append(h('button.map-node' + (open ? '' : '.locked') + (cleared ? '.cleared' : '') + (this.wid === w.id ? '.cur' : ''), { disabled: !open, onclick: () => { AU.init(); this.enterWorld(w.id); } },
        h('span.no', { style: { background: w.color } }, String(w.no)),
        h('span', h('div.nm', w.name), h('div.ds', open ? w.desc : !isReady(w) ? '建造中，很快開放' : '通過上一個世界後開放'), h('div.pr', h('span', '★ ' + SV.worldStars(w.id) + '/' + maxS), gt ? h('span', '◆ ' + SV.crystals(w.id).length + '/' + gt) : null, h('span', w.lessons)))));
    });
    m.body.append(grid);
  },

  // ---------- world ----------
  makeCtx(world, lv) {
    const self = this, wid = world.id;
    const defOf = (sid) => (sid === 'gate' ? world.gate : world.stations.find((s) => s.id === sid));
    return {
      wid, lv, world,
      done: (sid) => SV.isDone(wid, sid),
      station(sid, x, z, y, o) { const st = B.station(defOf(sid), x, z, y || 0, o); st.setDone(SV.isDone(wid, sid)); lv.anchors[sid] = { x, z, y: y || 0 }; return st; },
      complete: (sid, stars) => self.completeStation(sid, stars),
      onDone(sid, fn) { (self.hooks[sid] = self.hooks[sid] || []).push(fn); },
      anchor(sid, x, z, y) { lv.anchors[sid] = { x, z, y: y || 0 }; },
      defOf
    };
  },
  async enterWorld(wid, instant) {
    const world = WORLDS.find((w) => w.id === wid);
    if (!world) return;
    if (!instant) await UI.fade(true);
    this.closeAll();
    this.wid = wid; this.world = world; this.hooks = {};
    SV.d.last = wid; SV.save();
    if (!this.mode3d) { UI.fade(false); this.flatWorld(world); return; }
    const lv = B.begin(wid);
    this.lv = lv;
    const ctx = this.makeCtx(world, lv);
    this.ctx = ctx;
    world.build(ctx);
    B.backdrop({ seed: world.no * 7 });
    if (!SV.d.gt) SV.d.gt = {};
    SV.d.gt[wid] = lv.gems.length;
    const have = SV.crystals(wid);
    lv.gems.forEach((g) => { if (have.indexOf(g.id) >= 0) { g.got = true; g.mesh.visible = false; } });
    // guide arrow
    const arrow = mesh('cone', COL.gold, { basic: true }); arrow.scale.set(0.24, 0.7, 0.24); arrow.rotation.order = 'YXZ'; arrow.rotation.x = Math.PI / 2; lv.group.add(arrow);
    lv.updates.push((dt, t) => {
      const g = this.nextGoal();
      if (!g || !g.pos) { arrow.visible = false; return; }
      const p = E.p.pos, dx = g.pos.x - p.x, dz = g.pos.z - p.z, d = Math.hypot(dx, dz);
      arrow.visible = d > 5.5;
      if (!arrow.visible) return;
      const r = 1.5 + Math.sin(t * 5) * 0.14;
      arrow.position.set(p.x + (dx / d) * r, p.y + 0.5, p.z + (dz / d) * r);
      arrow.rotation.y = Math.atan2(dx, dz);
    });
    E.setLevel(lv); E.mode = 'play';
    this.refreshGates(true);
    if (SV.isDone(wid, 'gate') && lv.portal) lv.portal.activate(true);
    UI.showHud(true); this.refreshHud();
    AU.music(MUSIC[wid]);
    await UI.fade(false);
    if (!SV.d.seen) SV.d.seen = {};
    if (!SV.d.seen[wid]) { SV.d.seen[wid] = 1; SV.save(); await UI.say(world.intro); }
  },
  allStationsDone() { return this.world.stations.every((s) => SV.isDone(this.wid, s.id)); },
  nextGoal() {
    const w = this.world, lv = this.lv; if (!w) return null;
    const s = w.stations.find((q) => !SV.isDone(w.id, q.id));
    if (s) return { sid: s.id, text: '下一站：' + s.name, pos: lv && lv.anchors[s.id] };
    if (!SV.isDone(w.id, 'gate')) return { sid: 'gate', text: '挑戰：' + w.gate.name, pos: lv && lv.anchors.gate };
    return { sid: 'portal', text: '走進傳送門', pos: lv && lv.portal };
  },
  refreshHud() {
    const w = this.world; if (!w) return;
    const g = this.nextGoal();
    UI.setQuest(w.no + '　' + w.name, g ? g.text : '');
    const total = this.lv ? this.lv.gems.length : 0;
    UI.setCounters(SV.crystals(w.id).length, total, SV.worldStars(w.id));
    if (!$('#quest-panel').hidden) this.renderQuest($('#quest-panel'));
  },
  renderQuest(p) {
    const w = this.world; if (!w) return;
    p.innerHTML = '';
    const list = h('ol');
    const row = (s, isGate) => {
      const st = SV.stars(w.id, s.id);
      const li = h('li' + (st ? '.done' : ''), h('span.box', { html: st ? '✓' : '' }), h('span.t', s.name), h('span.st', st ? '★'.repeat(st) : ''));
      list.append(li);
      if (!st && s.kind === 'act' && s.fallback && SV.d.miss >= 0) {
        list.append(h('li', h('span'), h('button', { style: { textDecoration: 'underline', fontSize: '12.5px', textAlign: 'left', opacity: 0.85 }, onclick: () => this.assist(s) }, '卡關了？改用筆記本完成這一站'), h('span')));
      }
    };
    w.stations.forEach((s) => row(s));
    row(w.gate, true);
    p.append(h('h3', w.name + '　任務清單'), list, h('div.qp-note', '金色箭頭會指向下一站。M：地圖　N：筆記本'));
  },
  async assist(s) {
    UI.toggleQuest(false);
    const res = await NB.run(Object.assign({ id: s.id + '-fb', title: s.title }, s.fallback), { key: this.wid + '.' + s.id + '.fb' });
    if (res.done) this.completeStation(s.id, 1);
  },
  refreshGates(quiet) {
    let first = null;
    if (!this.lv) return null;
    this.lv.gates.forEach((g) => {
      if (!g.isOpen && g.need.every((sid) => SV.isDone(this.wid, sid))) { g.open(quiet); if (!first) first = g; }
    });
    return first;
  },
  async openStation(st) {
    const def = st.def, wid = this.wid;
    if (def.id === 'gate' && !this.allStationsDone()) {
      const left = this.world.stations.filter((s) => !SV.isDone(wid, s.id)).map((s) => s.name);
      UI.toast('先完成這個世界的所有站點（還差：' + left.join('、') + '）', 'warn', 3000);
      return;
    }
    const res = await NB.run(def, { key: wid + '.' + def.id, kicker: def.id === 'gate' ? '通過關主考驗' : '站點完成' });
    if (res.done) this.completeStation(def.id, res.stars);
  },
  completeStation(sid, stars) {
    const wid = this.wid, lv = this.lv;
    const first = SV.setStation(wid, sid, stars);
    if (lv && lv.stations[sid]) lv.stations[sid].setDone(true);
    this.refreshHud();
    if (!first) return;
    (this.hooks[sid] || []).forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
    if (!lv) return;
    const opened = this.refreshGates(false);
    if (sid === 'gate') this.worldGateCleared();
    else if (opened) E.focus(opened.x, opened.y + 1.5, opened.z, 1.4);
    else { const p = E.p.pos; E.fx.burst(p.x, p.y + 1.5, p.z, COL.gold, 30, 4, 1); }
  },
  async worldGateCleared() {
    const w = this.world, lv = this.lv;
    SV.d.cleared[w.id] = 1; SV.save();
    AU.sfx('win');
    if (lv && lv.portal) { lv.portal.activate(); await E.focus(lv.portal.x, lv.portal.y + 2, lv.portal.z, 1.8); }
    await UI.say(w.outro);
    if (w.no <= 8) UI.toast('獲得融合之刃碎片　' + this.fragments() + ' / 8', 'good', 3200);
    this.refreshHud();
  },
  async finishWorld() {
    const w = this.world;
    AU.sfx('warp');
    await UI.fade(true);
    E.mode = 'idle'; UI.showHud(false); UI.setPrompt(null); UI.actHud(null);
    await UI.fade(false);
    if (w.no === 9) { this.ending(); return; }
    this.worldClearSheet(w);
  },
  worldClearSheet(w) {
    const i = WORLDS.indexOf(w), next = WORLDS[i + 1];
    const maxS = (w.stations.length + 1) * 3, got = SV.worldStars(w.id);
    const learned = Object.keys(CODEX).filter((k) => CODEX[k].w === w.id).map((k) => CODEX[k]);
    const m = UI.sheet(w.name + '　通關！', '第 ' + w.no + ' 世界', { dismissible: false });
    m.body.append(
      h('div.center', h('div.kicker', '融合之刃碎片 ' + this.fragments() + ' / 8'), h('div.row', { style: { justifyContent: 'center' } }, h('span.shards', Array.from({ length: 8 }, (_, k) => h('i' + (k < this.fragments() ? '.on' : ''))))),
        h('div.cert', h('div.stats', h('div', '★ ' + got + ' / ' + maxS, h('small', '星星')), h('div', '◆ ' + SV.crystals(w.id).length + ' / ' + ((SV.d.gt && SV.d.gt[w.id]) || 0), h('small', 'KV 晶體'))))),
      h('div.kicker', { style: { marginTop: '12px' } }, '這個世界你學會了'),
      h('div.codex-list', learned.map((c) => h('div.codex-item', h('h4', c.t, h('small', c.en)), h('p', { html: c.d })))));
    const foot = h('div.sheet-foot', h('div.foot-row', h('button.btn.alt', { onclick: () => { m.close(); this.leaveWorld(); } }, '世界地圖'), next && isReady(next) ? h('button.btn.go', { onclick: () => this.enterWorld(next.id) }, '前往：' + next.name) : null));
    if (next && !isReady(next)) m.body.append(h('p.note', { style: { marginTop: '12px' } }, '下一個世界「' + next.name + '」還在建造中，開放後從世界地圖就能進入，進度會保留。'));
    m.sheet.append(foot);
    AU.sfx('win');
  },
  ending() {
    SV.d.done = 1; SV.save();
    const total = SV.totalStars(), maxS = WORLDS.reduce((a, w) => a + (w.stations.length + 1) * 3, 0);
    const pct = total / maxS;
    const rank = pct >= 0.95 ? '融合大師' : pct >= 0.8 ? '資深快取工程師' : pct >= 0.6 ? '快取工程師' : '見習快取工程師';
    const mins = Math.max(1, Math.round(SV.d.t / 60));
    const m = UI.sheet('結業證書', '推論王國恢復了速度', { dismissible: false });
    m.body.append(h('div.cert',
      h('div.kicker', 'CacheBlend 大冒險'),
      h('h3', '你讀懂了整篇論文'),
      h('div.rank', rank),
      h('div.stats', h('div', '★ ' + total + ' / ' + maxS, h('small', '星星')), h('div', '◆ ' + SV.totalCrystals(), h('small', 'KV 晶體')), h('div', mins + ' 分鐘', h('small', '冒險時間'))),
      h('div.kicker', { style: { marginTop: '10px' } }, '用四句話說完這篇論文'),
      h('ol', FOUR.map((s) => h('li', s))),
      h('p.note', '接下來可以打開論文原稿，搭配筆記本裡的「論文圖表導覽」逐圖對照；讀原稿時的五個提醒也收在筆記本裡。')));
    m.sheet.append(h('div.sheet-foot', h('div.foot-row', h('button.btn.alt', { onclick: () => this.showCodex() }, '打開筆記本'), h('button.btn.go', { onclick: () => { m.close(); this.leaveWorld(); } }, '回世界地圖'))));
    AU.sfx('win');
  },

  // ---------- notebook-only mode (no WebGL) ----------
  flatWorld(world) {
    const wid = world.id;
    const m = UI.sheet('第 ' + world.no + ' 世界　' + world.name, world.desc + '　' + world.lessons, { dismissible: false, tag: 'flat' });
    const draw = () => {
      m.body.innerHTML = '';
      m.body.append(h('p.note', '筆記本模式：依序完成每一站。'));
      const list = h('div.codex-list');
      let prevDone = true;
      const add = (s, def, isGate) => {
        const st = SV.stars(wid, s.id), open = prevDone || SV.d.opt.free || st;
        list.append(h('button.map-node' + (open ? '' : '.locked'), { disabled: !open, onclick: async () => {
          const res = await NB.run(def, { key: wid + '.' + s.id });
          if (res.done) { SV.setStation(wid, s.id, res.stars); if (isGate) { SV.d.cleared[wid] = 1; SV.save(); } draw(); }
        } }, h('span.no', { style: { background: world.color } }, st ? '✓' : isGate ? '★' : '·'), h('span', h('div.nm', s.name), h('div.pr', h('span', st ? '★'.repeat(st) : '尚未完成')))));
        prevDone = !!st;
      };
      world.stations.forEach((s) => add(s, s.kind === 'act' ? Object.assign({ id: s.id, title: s.title }, s.fallback || { steps: [{ t: 'info', title: s.title, html: '<p>這一站是 3D 小遊戲，筆記本模式下自動完成。</p>' }] }) : s));
      add(world.gate, world.gate, true);
      m.body.append(list);
      const i = WORLDS.indexOf(world), next = WORLDS[i + 1];
      m.body.append(h('div.row', { style: { marginTop: '14px' } }, h('button.btn.alt', { onclick: () => { m.close(); this.wid = null; this.showMap(); } }, '世界地圖'),
        SV.d.cleared[wid] && next && isReady(next) ? h('button.btn', { onclick: () => { m.close(); this.enterWorld(next.id); } }, '前往：' + next.name) : null,
        SV.d.cleared[wid] && !next ? h('button.btn', { onclick: () => { m.close(); this.ending(); } }, '結業') : null));
    };
    draw();
  },

  // ---------- notebook / settings ----------
  showCodex() {
    if (UI.dialogOpen || UI.modals.some((m) => m.opts.tag === 'codex')) return;
    const m = UI.sheet('筆記本', '走過的每一站都會留下一則筆記', { tag: 'codex' });
    const tabs = h('div.tabs');
    m.sheet.insertBefore(tabs, m.body);
    const show = (k) => {
      $$('button', tabs).forEach((b) => b.classList.toggle('on', b.dataset.k === k));
      m.body.innerHTML = ''; m.body.scrollTop = 0;
      if (k === 'notes') {
        let any = false;
        WORLDS.forEach((w) => {
          const ids = [];
          w.stations.concat([w.gate]).forEach((s) => { if (SV.isDone(w.id, s.id)) (s.codex || []).forEach((id) => ids.push(id)); });
          const all = Object.keys(CODEX).filter((id) => CODEX[id].w === w.id);
          if (!all.length) return;
          m.body.append(h('div.codex-group', '第 ' + w.no + ' 世界　' + w.name + '　' + ids.length + ' / ' + all.length));
          const list = h('div.codex-list');
          all.forEach((id) => { const c = CODEX[id], on = ids.indexOf(id) >= 0; if (on) any = true; list.append(on ? h('div.codex-item', h('h4', c.t, h('small', c.en)), h('p', { html: c.d })) : h('div.codex-item.locked', h('h4', '？？？'), h('p', '完成對應的站點後解鎖'))); });
          m.body.append(list);
        });
        if (!any) m.body.prepend(h('p.note', '還沒有筆記。完成第一站之後，新觀念會自動寫進這裡。'));
      } else if (k === 'figs') {
        m.body.append(h('p.note', '讀論文時逐圖對照：先找橫軸、縱軸、比較的方法和固定條件，再問它支持哪一個主張。頁碼是原稿頁碼。'));
        const list = h('div.codex-list');
        FIGS.forEach((f) => { const w = WORLDS.find((x) => x.id === f[4]); list.append(h('div.codex-item', h('h4', f[0], h('small', f[1] + (w ? '　第 ' + w.no + ' 世界' : ''))), h('p', { html: '<b>' + f[2] + '</b>　' + f[3] }))); });
        m.body.append(list);
      } else {
        m.body.append(h('p.note', '講義整理的五個提醒：原稿有幾處寫法需要特別辨認。'));
        const list = h('div.codex-list');
        CAUTIONS.forEach((c, i) => list.append(h('div.codex-item', h('h4', '提醒 ' + (i + 1)), h('p', c))));
        m.body.append(list);
      }
    };
    [['notes', '我的筆記'], ['figs', '論文圖表導覽'], ['care', '讀原稿的提醒']].forEach((t) => tabs.append(h('button', { data: { k: t[0] }, onclick: () => show(t[0]) }, t[1])));
    show('notes');
  },
  showSettings() {
    if (UI.dialogOpen || UI.modals.some((m) => m.opts.tag === 'set')) return;
    const m = UI.sheet('設定', '', { tag: 'set' });
    const seg = (opts, cur, fn) => { const s = h('div.seg'); opts.forEach((o) => { const b = h('button' + (o[0] === cur ? '.on' : ''), { onclick: () => { $$('button', s).forEach((x) => x.classList.remove('on')); b.classList.add('on'); AU.sfx('tap'); fn(o[0]); } }, o[1]); s.append(b); }); return s; };
    const o = SV.d.opt;
    const list = h('div.set-list',
      h('div.set-row', h('div', h('b', '音效')), seg([[1, '開'], [0, '關']], o.sfx ? 1 : 0, (v) => { o.sfx = v; AU.setSfx(!!v); SV.save(); })),
      h('div.set-row', h('div', h('b', '背景音樂')), seg([[1, '開'], [0, '關']], o.music ? 1 : 0, (v) => { o.music = v; AU.setMusic(!!v); SV.save(); })),
      this.mode3d ? h('div.set-row', h('div', h('b', '畫質'), h('div.d', '如果畫面卡頓，改成「省電」')), seg([['auto', '自動'], ['high', '高'], ['low', '省電']], o.q, (v) => { o.q = v; E.setQuality(v); SV.save(); })) : null,
      h('div.set-row', h('div', h('b', '自由模式'), h('div.d', '直接開放全部九個世界，方便複習')), seg([[0, '關'], [1, '開']], o.free ? 1 : 0, (v) => { o.free = v; SV.save(); })),
      h('div.set-row', h('div', h('b', '操作方式'), h('div.keys', h('kbd', 'WASD / 方向鍵'), h('span', '移動（觸控：左下搖桿）'), h('kbd', '空白鍵'), h('span', '跳（觸控：右下按鈕）'), h('kbd', 'E'), h('span', '互動'), h('kbd', '點地面'), h('span', '自動走過去'), h('kbd', '拖曳 / 滾輪'), h('span', '轉動視角 / 拉遠拉近'), h('kbd', 'M · N'), h('span', '地圖 · 筆記本')))),
      this.wid ? h('div.set-row', h('div', h('b', '離開這個世界'), h('div.d', '已完成的站點都會保留')), h('button.btn.small.alt', { onclick: () => { m.close(); this.leaveWorld(); } }, '回世界地圖')) : null);
    m.body.append(list);
  },
  async leaveWorld() {
    await UI.fade(true);
    if (this.mode3d) { E.mode = 'title'; E.setLevel(buildTitleLevel()); }
    UI.showHud(false); UI.actHud(null); UI.setPrompt(null);
    this.wid = null; this.world = null; this.lv = null;
    AU.music(MUSIC.title);
    await UI.fade(false);
    this.showMap();
  }
};
const FOUR = [
  'RAG 經常在不同問題裡重複使用相同的文字區塊，所以有重用 KV 快取的機會。',
  '但完整前綴不相同時，直接重用區塊的 KV 會缺少跨區塊的上下文影響（cross-attention）。',
  'CacheBlend 挑出少數高偏差（HKVD）token 重算，讓融合後的表示接近完整重算的結果。',
  '系統再把逐層載入和重算重疊（pipelining）來降低 TTFT，並用品質與效能實驗確認取捨。'
];

// ---------- boot ----------
function whenThree(cb) {
  if (window.THREE) { cb(); return; }
  let done = false, triedLocal = false;
  const finish = () => { if (!done) { done = true; cb(); } };
  const local = () => {
    if (window.THREE) { finish(); return; }
    if (triedLocal) return;
    triedLocal = true;
    const s = document.createElement('script');
    s.src = 'vendor/three.min.js'; s.onload = finish; s.onerror = finish;
    document.head.appendChild(s);
    setTimeout(finish, 6000);
  };
  const tag = document.querySelector('script[data-three]');
  if (tag) { tag.addEventListener('load', finish); tag.addEventListener('error', local); } else local();
  setTimeout(local, 7000);
  const iv = setInterval(() => { if (window.THREE) finish(); if (done) clearInterval(iv); }, 120);
}
function startGame(data) { whenThree(() => { try { GAME.boot(data || {}); } catch (e) { console.error(e); const ld = document.getElementById('loading'); if (ld) ld.textContent = '啟動失敗：' + e.message; } }); }
window.CBQ = { E, SV, UI, NB, GAME, WORLDS, AU, B, ACT, bus, READY };
if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(startGame);
else startGame((window.claude && window.claude.hot && window.claude.hot.data) || {});
