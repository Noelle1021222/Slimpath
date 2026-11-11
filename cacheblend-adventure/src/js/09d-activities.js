// ===== activity for world 6 =====
// W6: find the high-KV-deviation tokens and recompute only those.
ACT.hunt = (ctx, o) => {
  const lv = ctx.lv, y = o.y || 0, BUDGET = o.budget;
  let solved = ctx.done(o.id), fails = 0, judged = false;
  const total = o.tokens.reduce((a, t) => a + t.dev, 0);
  const maxDev = Math.max.apply(null, o.tokens.map((t) => t.dev));
  const toks = o.tokens.map((t) => {
    const base = B.box(t.x, y + 0.1, t.z, 1.7, 0.2, 1.7, t.chunk === 1 ? COL.blue : COL.orange, { cast: false });
    const m = ownBox(t.x, y + 0.75, t.z, 1.25, 1.1, 1.25, COL.reuse);
    m.castShadow = true;
    B.label(t.text, t.x, y + 1.75, t.z, { h: 0.5, px: 26, bg: t.chunk === 1 ? '#c9d6f5' : '#fbdcc0' });
    const hgt = 0.2 + (t.dev / maxDev) * 1.5;
    const bar = B.box(t.x, y + 2.25 + hgt / 2, t.z, 0.42, hgt, 0.42, t.dev > 5 ? COL.rose : t.dev > 0 ? COL.gold : COL.green, { basic: true, cast: false });
    const num = B.label(t.dev.toFixed(1), t.x, y + 2.62 + hgt, t.z, { h: 0.42, px: 24, font: 'mono', bg: '#1b2340', color: '#f4f6fb', border: null });
    bar.visible = false; num.visible = false;
    B.col(t.x - 0.62, t.x + 0.62, y, y + 1.3, t.z - 0.62, t.z + 0.62, { solid: true, walk: false });
    const tk = Object.assign({ m, bar, num, seen: false, rc: false }, t);
    tk.inter = { x: t.x, y, z: t.z + 0.2, r: 1.75, acts: () => {
      if (solved || judged) return null;
      if (tk.rc) return [{ label: '取消重算「' + tk.text + '」', fn: () => { tk.rc = false; paint(); AU.sfx('drop'); } }];
      if (left() <= 0) return [{ label: '重算額度用完了（先取消一個）', fn: () => UI.toast('額度只有 ' + BUDGET + ' 個。走到已重算的 token 旁邊可以取消。', 'warn') }];
      return [{ label: '重算「' + tk.text + '」', fn: () => { tk.rc = true; paint(); AU.sfx('zap'); E.fx.burst(tk.x, y + 1, tk.z, 0xffffff, 24, 4, 0.7); if (left() === 0) judge(); } }];
    } };
    lv.inter.push(tk.inter);
    return tk;
  });
  const left = () => BUDGET - toks.filter((t) => t.rc).length;
  const deviation = () => toks.reduce((a, t) => a + (t.rc ? 0 : t.dev), 0) / total;
  const paint = () => toks.forEach((t) => { t.m.material.color.setHex(t.rc ? 0x4a5060 : COL.reuse); t.m.material.emissive.setHex(t.rc ? 0x000000 : 0x5a5a5a); t.bar.visible = t.num.visible = t.seen || solved; });
  if (solved) { toks.forEach((t) => { t.seen = true; }); toks.slice().sort((a, b) => b.dev - a.dev).slice(0, BUDGET).forEach((t) => { t.rc = true; }); }
  paint();
  const judge = async () => {
    judged = true;
    const d = deviation();
    await sleep(500);
    if (d <= o.target) {
      solved = true; AU.sfx('open'); UI.actHud(null); paint();
      ctx.complete(o.id, fails === 0 ? 3 : fails === 1 ? 2 : 1);
      await UI.say(o.win);
    } else {
      fails++; AU.sfx('bad');
      await UI.say([['ble', '注意力偏差還有 <b>' + d.toFixed(2) + '</b>，神諭的回答還是在繞圈子。'], ['kv', fails >= 2 ? '提示：每個 token 都走近看一下，找出長條<b>最高的三個</b>。藍色那排是輸入的前綴，偏差是 0，不用管。' : '額度有限，要花在<b>偏差最高</b>的 token 上。先把每個 token 都看過一遍再決定。']]);
      toks.forEach((t) => { t.rc = false; });
      paint(); judged = false;
    }
  };
  ctx.anchor(o.id, o.cx, o.cz + 3, y);
  lv.updates.push(() => {
    if (solved) return;
    const p = E.p.pos;
    if (Math.abs(p.x - o.cx) > o.rx || Math.abs(p.z - o.cz) > o.rz) { UI.actHud(null); return; }
    let near = null;
    toks.forEach((t) => { const d = Math.hypot(p.x - t.x, p.z - t.z); if (d < 2.3) { if (!t.seen) { t.seen = true; t.bar.visible = t.num.visible = true; AU.sfx('tick'); } if (!near || d < near.d) near = { t, d }; } });
    const d = deviation();
    const ansOk = d <= o.target;
    const dots = '●'.repeat(left()) + '○'.repeat(BUDGET - left());
    UI.actHud((near ? '<b>' + near.t.text + '</b>　KV 偏差 <b>' + near.t.dev.toFixed(1) + '</b>' + (near.t.chunk === 1 ? '（輸入的前綴，預先算好的 KV 本來就正確）' : '') : '走近每個 token，量量它的 <b>KV 偏差</b>；挑 ' + BUDGET + ' 個來重算') +
      '<div class="row"><span class="pill">重算額度 ' + dots + '</span><span class="pill">注意力偏差 ' + d.toFixed(2) + '</span></div><div class="meter"><i style="width:' + Math.round(d * 100) + '%;background:' + (ansOk ? 'var(--green)' : 'var(--rose)') + '"></i></div>' +
      '<div class="opt"><div><i>神諭</i>' + (ansOk ? o.good : o.bad) + '</div></div>');
  });
  lv.debug = lv.debug || {};
  lv.debug[o.id] = { toks, state: () => ({ solved, judged }) };
};
