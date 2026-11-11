// Test driver for the game (dev only).
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const GAME_DIR = path.join(__dirname, '..');
const THREE_PATH = path.join(GAME_DIR, 'vendor/three.min.js');
const SHOTS = path.join(require('os').tmpdir(), 'cacheblend-shots');

async function open(opts = {}) {
  const browser = await chromium.launch({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1100, height: 700 }, deviceScaleFactor: 1 }, opts.context || {}));
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' || m.type() === 'warning') { if (!/GPU stall|WebGL|GroupMarkerNotSet|swiftshader/i.test(t)) logs.push(m.type() + ': ' + t.slice(0, 300)); } });
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  await page.route('https://cdnjs.cloudflare.com/**', (route) => opts.blockCdn ? route.abort() : route.fulfill({ path: THREE_PATH, contentType: 'application/javascript' }));
  if (opts.noFonts) await page.route('https://fonts.googleapis.com/**', (r) => r.abort());
  if (opts.init) await page.addInitScript(opts.init);
  await page.goto('file://' + path.join(GAME_DIR, opts.file || 'index.html'));
  await page.waitForFunction(() => window.CBQ && (document.getElementById('title') || window.CBQ.GAME.wid), null, { timeout: 20000 });
  await page.waitForTimeout(opts.settle == null ? 1200 : opts.settle);
  return { browser, page, logs, ctx };
}
async function shot(page, name) { const p = path.join(SHOTS, name + '.png'); await page.screenshot({ path: p }); return p; }
async function skipDialog(page) {
  for (let i = 0; i < 40; i++) {
    const open = await page.evaluate(() => window.CBQ.UI.dialogOpen);
    if (!open) return;
    await page.evaluate(() => window.CBQ.UI.dialogSkip());
    await page.waitForTimeout(80);
  }
}
// solve every step of the currently open notebook station
async function solveStation(page, opts = {}) {
  const res = await page.evaluate(async (o) => {
    const { NB } = window.CBQ; const out = [];
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < 80; i++) {
      const c = NB.cur; if (!c) break;
      if (c.done) { c.api.solve(); out.push('closed'); await wait(30); break; }
      const t = c.step.t;
      if (!c.isSolved()) {
        if (!c.api.solve) { out.push('NO_SOLVE:' + t); break; }
        c.api.solve();
        await wait(o.stepWait || 30);
      }
      const c2 = NB.cur;
      if (c2 === c) {
        if (c.isSolved()) { c.primary.click(); await wait(o.stepWait || 30); }
        else if (t !== 'info') {
          // widgets that finish asynchronously
          let ok = false;
          for (let k = 0; k < 100; k++) { await wait(100); if (NB.cur !== c || c.isSolved()) { ok = true; break; } }
          if (!ok) { out.push('STUCK:' + t + ':' + (c.step.q || c.step.title || '').slice(0, 30)); break; }
          if (NB.cur === c && c.isSolved()) { c.primary.click(); await wait(o.stepWait || 30); }
        }
      }
      out.push(t);
    }
    return out;
  }, opts);
  return res;
}
module.exports = { open, shot, skipDialog, solveStation, SHOTS, GAME_DIR };
// walk the player to (x,z) using the tap-to-move path; jump when blocked at a ledge
async function goto(page, x, z, opts = {}) {
  return page.evaluate(async ({ x, z, o }) => {
    const { E, UI } = window.CBQ;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const t0 = performance.now();
    let lastPos = E.p.pos.clone(), still = 0;
    const tol = o.tol || 0.6;
    while (performance.now() - t0 < (o.timeout || 15000)) {
      if (UI.dialogOpen) UI.dialogSkip();
      const dx = x - E.p.pos.x, dz = z - E.p.pos.z, d = Math.hypot(dx, dz);
      if (d < tol) { E.auto = null; return { ok: true, pos: E.p.pos.toArray().map((v) => +v.toFixed(2)), ms: Math.round(performance.now() - t0) }; }
      E.auto = { x, z, inter: null, stuck: 0, last: E.p.pos.clone() };
      await wait(100);
      const moved = lastPos.distanceTo(E.p.pos);
      lastPos = E.p.pos.clone();
      if (moved < 0.05) { still++; if (still >= 2 && o.jump !== false && E.p.grounded) { E.jumpQ = true; still = 0; } } else still = 0;
    }
    E.auto = null;
    return { ok: false, pos: E.p.pos.toArray().map((v) => +v.toFixed(2)) };
  }, { x, z, o: opts });
}
module.exports.goto = goto;
