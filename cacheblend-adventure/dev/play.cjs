// Automated playthrough of a world (dev only): walks the recorded route, opens every station, solves it.
const { open, shot, skipDialog, solveStation, goto } = require('./drive.cjs');

const ACTS = {
  async cubes(page) {
    for (let i = 0; i < 6; i++) {
      const done = await page.evaluate(() => window.CBQ.SV.isDone(window.CBQ.GAME.wid, 'cubes'));
      if (done) return;
      const a = await page.evaluate(() => window.CBQ.E.level.anchors.cubes);
      await walkTo(page, a.x, a.z, 0.5);
      await page.waitForTimeout(200);
    }
  },
  async floor(page) {
    const tiles = await page.evaluate(() => window.CBQ.E.level.debug.floor.tiles.filter((t) => t.c <= t.r).map((t) => [t.m.position.x, t.m.position.z]));
    for (const t of tiles) {
      await goto(page, t[0], t[1], { tol: 0.35, jump: false, timeout: 8000 });
      await page.evaluate(() => { window.CBQ.E.auto = null; window.CBQ.E.jumpQ = true; });
      await page.waitForTimeout(1300);
    }
    const a = await page.evaluate(() => window.CBQ.E.level.anchors.floor);
    await goto(page, a.x, a.z, { tol: 1.6, jump: false });
    await page.waitForTimeout(300);
    await page.evaluate(() => window.CBQ.UI.firePrompt(0));
    await page.waitForTimeout(600);
  },
  async fetch(page) {
    const d = await page.evaluate(() => { const f = window.CBQ.E.level.debug.fetch; return { books: f.books.map((b) => ({ id: b.id, x: b.x, z: b.z })), desk: f.desk }; });
    for (const id of ['A', 'B']) {
      const b = d.books.find((q) => q.id === id);
      await goto(page, b.x, b.z, { tol: 1.4, timeout: 12000 });
      await page.waitForTimeout(300);
      await page.evaluate(() => window.CBQ.UI.firePrompt(0));
      await page.waitForTimeout(200);
    }
    await goto(page, d.desk.x, d.desk.z + 1.6, { tol: 0.9, timeout: 12000 });
    await page.waitForTimeout(300);
    await page.evaluate(() => window.CBQ.UI.firePrompt(0));
    await page.waitForTimeout(600);
  },
  async bridge(page) {
    for (let i = 0; i < 60; i++) {
      const st = await page.evaluate(() => { const { E, UI, SV, GAME } = window.CBQ; if (UI.dialogOpen) UI.dialogSkip(); if (SV.isDone(GAME.wid, 'bridge')) return { done: true }; const d = E.level.debug.bridge; const cr = d.crossings.find((c) => c.next < c.segs.length); return { busy: d.state().busy, x: cr.inter.x, z: cr.inter.z, reuse: cr.segs[cr.next].reuse }; });
      if (st.done) return;
      if (st.busy) { await page.waitForTimeout(200); continue; }
      await goto(page, st.x, st.z, { tol: 0.5, jump: false, timeout: 12000 });
      await page.waitForTimeout(250);
      await page.evaluate((r) => window.CBQ.UI.firePrompt(r ? 0 : 1), st.reuse);
      await page.waitForTimeout(st.reuse ? 300 : 2300);
    }
  },
  async hunt(page) {
    const top = await page.evaluate(() => window.CBQ.E.level.debug.hunt.toks.slice().sort((a, b) => b.dev - a.dev).slice(0, 3).map((t) => ({ x: t.x, z: t.z + 1.5 })));
    for (const t of top) {
      await goto(page, t.x, t.z, { tol: 0.45, jump: false, timeout: 12000 });
      await page.waitForTimeout(300);
      await page.evaluate(() => window.CBQ.UI.firePrompt(0));
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(1200);
  },
  async flow(page) {
    for (let i = 0; i < 20; i++) {
      const st = await page.evaluate(() => { const { E, UI, SV, GAME } = window.CBQ; if (UI.dialogOpen) UI.dialogSkip(); if (SV.isDone(GAME.wid, 'flow')) return { done: true }; const d = E.level.debug.flow; const s = d.state(); return { busy: s.busy, step: s.step, pos: d.order[s.step] }; });
      if (st.done) return;
      if (st.busy || !st.pos) { await page.waitForTimeout(200); continue; }
      await goto(page, st.pos.x, st.pos.z, { tol: 0.9, timeout: 15000 });
      await page.waitForTimeout(300);
      await page.evaluate(() => window.CBQ.UI.firePrompt(0));
      await page.waitForTimeout(500);
    }
  },
  async run(page) {
    for (let i = 0; i < 400; i++) {
      const st = await page.evaluate(() => { const { E, UI, SV, GAME } = window.CBQ; if (UI.dialogOpen) UI.dialogSkip(); if (SV.isDone(GAME.wid, 'run')) return { done: true }; const d = E.level.debug.run; const s = d.state(); return Object.assign(s, { z: d.pads[s.expect] ? d.pads[s.expect].z : null, x: d.pads[0].m.position.x }); });
      if (st.done) return;
      if (st.busy || st.z == null) { await page.waitForTimeout(150); continue; }
      await goto(page, st.x, st.z, { tol: 0.5, jump: false, timeout: 6000 });
      await page.waitForTimeout(120);
    }
  }
};

async function routeInfo(page) {
  return page.evaluate(() => window.CBQ.E.level.route.map((r) => ({ x: r.x, z: r.z, w: r.w, d: r.d, island: !!r.island, nojump: !!r.nojump })));
}
let RI = 0;
async function walkTo(page, x, z, tol) {
  const route = await routeInfo(page);
  // which waypoint is the target nearest to (prefer the island that contains it)
  let ti = -1;
  route.forEach((r, i) => { if (r.island && Math.abs(x - r.x) <= r.w / 2 + 0.6 && Math.abs(z - r.z) <= r.d / 2 + 0.6 && ti < 0) ti = i; });
  if (ti < 0) { let bd = 1e9; route.forEach((r, i) => { const d = Math.hypot(x - r.x, z - r.z); if (d < bd) { bd = d; ti = i; } }); }
  while (RI < ti) {
    RI++;
    const r = route[RI];
    if (RI === ti && !r.island) break;
    const res = await goto(page, r.x, r.z, { tol: 0.7, jump: !r.nojump, timeout: r.nojump ? 40000 : 15000 });
    if (!res.ok) { console.log('   ! route step', RI, JSON.stringify(r), JSON.stringify(res)); }
  }
  const res = await goto(page, x, z, { tol: tol || 1.9, timeout: 15000 });
  if (!res.ok) console.log('   ! target', x.toFixed(1), z.toFixed(1), JSON.stringify(res));
  return res;
}

async function playWorld(page, wid, opts = {}) {
  RI = 0;
  await page.evaluate((w) => { window.CBQ.GAME.enterWorld(w); }, wid);
  await page.waitForFunction((w) => window.CBQ.GAME.wid === w && window.CBQ.E.mode === 'play', wid, { timeout: 10000 });
  await page.waitForTimeout(900); await skipDialog(page); await page.waitForTimeout(300);
  if (opts.shots) await shot(page, wid + '-00-start');
  const log = [];
  for (let n = 0; n < 40; n++) {
    await skipDialog(page);
    const goal = await page.evaluate(() => { const g = window.CBQ.GAME.nextGoal(); return g ? { sid: g.sid, text: g.text, pos: g.pos ? { x: g.pos.x, z: g.pos.z } : null } : null; });
    if (!goal) break;
    const kind = await page.evaluate((sid) => { const w = window.CBQ.GAME.world; const s = w.stations.find((q) => q.id === sid); return s ? (s.kind || 'nb') : sid; }, goal.sid);
    process.stdout.write('  [' + goal.sid + '] ');
    if (kind === 'act') {
      if (!ACTS[goal.sid]) { console.log('NO TEST ROUTINE'); return { ok: false, log }; }
      if (goal.pos) await walkTo(page, goal.pos.x, goal.pos.z, 2.2);
      if (opts.shots) { await page.waitForTimeout(400); await shot(page, wid + '-act-' + goal.sid); }
      await ACTS[goal.sid](page);
      await page.waitForTimeout(500); await skipDialog(page);
      if (opts.shots) await shot(page, wid + '-act-' + goal.sid + '-done');
      const ok = await page.evaluate((sid) => window.CBQ.SV.isDone(window.CBQ.GAME.wid, sid), goal.sid);
      console.log(ok ? 'activity ok' : 'ACTIVITY NOT DONE');
      if (!ok) return { ok: false, log };
      await page.waitForTimeout(1800); await skipDialog(page);
      continue;
    }
    if (!goal.pos) { console.log('NO POSITION'); return { ok: false, log }; }
    await walkTo(page, goal.pos.x, goal.pos.z, 2.0);
    await page.waitForTimeout(350);
    const pk = await page.evaluate(() => window.CBQ.UI.promptKey);
    if (!pk) { console.log('NO PROMPT at', JSON.stringify(goal.pos), JSON.stringify(await page.evaluate(() => window.CBQ.E.p.pos.toArray()))); return { ok: false, log }; }
    if (goal.sid === 'portal') {
      if (opts.shots) await shot(page, wid + '-portal');
      await page.evaluate(() => window.CBQ.UI.firePrompt(0));
      await page.waitForTimeout(1500);
      console.log('portal entered');
      if (opts.shots) await shot(page, wid + '-clear');
      return { ok: true, log };
    }
    await page.evaluate(() => window.CBQ.UI.firePrompt(0));
    await page.waitForTimeout(400);
    if (opts.shots) {
      // capture every step of the station for visual review
      for (let k = 0; k < 30; k++) {
        const info = await page.evaluate(() => { const c = window.CBQ.NB.cur; return c ? { done: !!c.done, t: c.step ? c.step.t : '', solved: c.isSolved ? c.isSolved() : false } : null; });
        if (!info || info.done) break;
        if (opts.shots === 'all' || info.t !== 'info' || k === 0) await shot(page, wid + '-' + goal.sid + '-' + String(k).padStart(2, '0') + '-' + info.t);
        const r = await page.evaluate(async () => { const c = window.CBQ.NB.cur; const wait = (ms) => new Promise((r2) => setTimeout(r2, ms)); if (!c.api.solve) return 'NO_SOLVE'; c.api.solve(); for (let q = 0; q < 60; q++) { await wait(60); if (window.CBQ.NB.cur !== c || c.isSolved()) break; } return window.CBQ.NB.cur === c ? (c.isSolved() ? 'solved' : 'STUCK') : 'advanced'; });
        if (r === 'NO_SOLVE' || r === 'STUCK') { console.log(r, info.t); return { ok: false, log }; }
        if (r === 'solved') { if (opts.shots === 'all') await shot(page, wid + '-' + goal.sid + '-' + String(k).padStart(2, '0') + '-' + info.t + '-ok'); await page.evaluate(() => window.CBQ.NB.cur.primary.click()); await page.waitForTimeout(120); }
      }
      await page.waitForTimeout(200);
      await shot(page, wid + '-' + goal.sid + '-zz-finish');
    }
    const r = await solveStation(page);
    const bad = r.filter((x) => /NO_SOLVE|STUCK/.test(x));
    console.log(r.join(',') || '(done)');
    if (bad.length) return { ok: false, log };
    await page.waitForTimeout(2400); await skipDialog(page); await page.waitForTimeout(400);
  }
  return { ok: false, log };
}
module.exports = { playWorld, walkTo, ACTS };

if (require.main === module) {
  (async () => {
    const worlds = (process.argv[2] || 'w1').split(',');
    const shots = process.argv[3] || '';
    const { browser, page, logs } = await open({ init: 'try{localStorage.clear()}catch(e){}' });
    await page.evaluate(() => { window.CBQ.SV.d.opt.free = 1; window.CBQ.SV.d.opt.music = 0; window.CBQ.READY.push('w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9'); });
    let allOk = true;
    for (const w of worlds) {
      console.log('== ' + w);
      const t0 = Date.now();
      const res = await playWorld(page, w, { shots });
      console.log('== ' + w + (res.ok ? ' OK ' : ' FAILED ') + ((Date.now() - t0) / 1000).toFixed(0) + 's');
      if (!res.ok) { allOk = false; await shot(page, w + '-FAIL'); break; }
      await page.evaluate(() => { const t = window.CBQ.UI.topModal(); if (t) { t.opts.onClose = null; window.CBQ.UI.closeModal(t); } });
    }
    const st = await page.evaluate(() => ({ st: window.CBQ.SV.d.st, cleared: window.CBQ.SV.d.cleared }));
    console.log(JSON.stringify(st));
    console.log('LOGS', logs.length, logs.slice(0, 12).join('\n'));
    await browser.close();
    process.exit(allOk && !logs.length ? 0 : 1);
  })().catch((e) => { console.error('FAIL', e); process.exit(1); });
}
