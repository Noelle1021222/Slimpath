// Phone-width sweep of every notebook step in the game: flags squeezed sliders, tiny or clipped controls (dev only).
const { open, shot, skipDialog } = require('./drive.cjs');
const W = Number(process.argv[2] || 390);
const SHOTS = process.argv[3] !== 'noshots';
function auditSrc() {
  const sheet = document.querySelector('.sheet'); if (!sheet) return ['NO SHEET'];
  const body = sheet.querySelector('.sheet-body'), sr = sheet.getBoundingClientRect(), issues = [];
  const inScroller = (el) => { let sc = el.parentElement; while (sc && sc !== body) { const ox = getComputedStyle(sc).overflowX; if (ox === 'auto' || ox === 'scroll') return true; sc = sc.parentElement; } return false; };
  body.querySelectorAll('input[type=range]').forEach((el) => { const r = el.getBoundingClientRect(); if (r.width < 150) issues.push('range w=' + Math.round(r.width)); });
  body.querySelectorAll('button, input.num').forEach((el) => {
    const r = el.getBoundingClientRect(); if (!r.width && !r.height) return;
    const dense = el.classList.contains('xa-c') || el.classList.contains('cut-gap') || el.classList.contains('sr-cell');
    if (!dense && (r.width < 30 || r.height < 28)) issues.push('tiny ' + (el.className || el.tagName) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    if (!inScroller(el) && (r.right > sr.right + 1 || r.left < sr.left - 1)) issues.push('clipped ' + (el.className || el.tagName));
  });
  if (body.scrollWidth > body.clientWidth + 2) issues.push('body h-scroll +' + (body.scrollWidth - body.clientWidth));
  body.querySelectorAll('p, .card, .q, .readout, .seg').forEach((el) => { const r = el.getBoundingClientRect(); if (r.width > 0 && r.width < 120 && el.textContent.length > 14) issues.push('squeezed ' + (el.className || el.tagName) + ' w=' + Math.round(r.width)); });
  body.querySelectorAll('.tw, .fig, .bars').forEach((el) => { if (el.scrollWidth > el.clientWidth + 2) issues.push('scrollbox ' + el.className + ' +' + (el.scrollWidth - el.clientWidth)); });
  const foot = sheet.querySelector('#nb-primary'); if (foot && !foot.hidden) { const r = foot.getBoundingClientRect(); if (r.bottom > window.innerHeight + 1 || r.right > window.innerWidth + 1) issues.push('primary off-screen'); }
  return issues;
}
(async () => {
  const { browser, page, logs } = await open({ context: { viewport: { width: W, height: 740 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true }, init: 'try{localStorage.clear()}catch(e){}' });
  const GENERIC = ['info', 'choice', 'match', 'order', 'bucket', 'fill', 'pick', 'grid'];
  const list = await page.evaluate(() => { const out = []; window.CBQ.WORLDS.forEach((w) => { w.stations.forEach((s) => { if (s.steps) out.push([w.id, s.id, 0]); else if (s.fallback) out.push([w.id, s.id, 1]); }); out.push([w.id, 'gate', 2]); }); return out; });
  let flagged = 0, steps = 0;
  const run = async (label) => {
    for (let k = 0; k < 40; k++) {
      const info = await page.evaluate(() => { const c = window.CBQ.NB.cur; return c ? { done: !!c.done, t: c.step ? c.step.t : '' } : null; });
      if (!info || info.done) break;
      steps++;
      const issues = await page.evaluate('(' + auditSrc.toString() + ')()');
      const real = issues.filter((x) => !/^scrollbox/.test(x));
      const tag = label + '-' + k + '-' + info.t;
      if (issues.length) { console.log((real.length ? 'ISSUE ' : 'note  ') + tag + ': ' + issues.join('; ')); }
      if (real.length) flagged++;
      if (SHOTS && (real.length || GENERIC.indexOf(info.t) < 0)) await shot(page, 'sw' + W + '-' + tag);
      const r = await page.evaluate(async () => { const c = window.CBQ.NB.cur; const wait = (ms) => new Promise((q) => setTimeout(q, ms)); c.api.solve(); for (let q = 0; q < 50; q++) { await wait(40); if (window.CBQ.NB.cur !== c || c.isSolved()) break; } if (window.CBQ.NB.cur === c && c.isSolved()) { c.primary.click(); await wait(60); return 'ok'; } return window.CBQ.NB.cur === c ? 'STUCK' : 'ok'; });
      if (r === 'STUCK') { console.log('STUCK ' + tag); break; }
    }
    await page.evaluate(() => { const c = window.CBQ.NB.cur; if (c && c.done) c.api.solve(); const t = window.CBQ.UI.topModal(); if (t) t.close(); });
    await page.waitForTimeout(80);
  };
  for (const [w, sid, kind] of list) {
    await page.evaluate(([ww, ss, kk]) => { const { WORLDS, NB } = window.CBQ; const wd = WORLDS.find((x) => x.id === ww); const s = kk === 2 ? wd.gate : wd.stations.find((x) => x.id === ss); const def = kk === 1 ? Object.assign({ id: s.id + '-fb', title: s.title }, s.fallback) : s; NB.run(def, { key: 'sweep.' + ww + '.' + ss }); }, [w, sid, kind]);
    await page.waitForTimeout(150);
    await run(w + '-' + sid);
  }
  // the race quiz (scatter) only exists inside the 3D activity
  await page.evaluate(() => { const { SV, GAME } = window.CBQ; SV.d.opt.free = 1; SV.d.opt.music = 0; SV.d.seen = { w8: 1 }; GAME.enterWorld('w8'); });
  await page.waitForFunction(() => window.CBQ.GAME.wid === 'w8' && window.CBQ.E.mode === 'play', null, { timeout: 15000 });
  await page.waitForTimeout(900); await skipDialog(page);
  await page.evaluate(() => { const it = window.CBQ.E.level.inter.find((q) => q.acts && q.acts() && q.acts()[0] && /賽前預測/.test(q.acts()[0].label)); it.acts()[0].fn(); });
  await page.waitForTimeout(300);
  await run('w8-racequiz');
  console.log('swept', steps, 'steps at width', W, '— flagged', flagged, '— logs', logs.length, logs.slice(0, 4).join('\n'));
  await browser.close();
})().catch((e) => { console.error('FAIL', e.message.split('\n').slice(0, 8).join('\n')); process.exit(1); });
