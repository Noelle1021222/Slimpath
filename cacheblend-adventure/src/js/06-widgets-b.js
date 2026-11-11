// ===== custom notebook widgets, part B (charts and world 4-5 widgets) =====
// tiny SVG chart helper. cfg: {w,h,x:[a,b],y:[a,b],xt,yt,xl,yl,series:[{pts,color,dash,marker}]}
function chart(cfg) {
  const W = cfg.w || 560, H = cfg.h || 290, m = { l: 54, r: 16, t: 14, b: 46 };
  const sx = (x) => m.l + ((x - cfg.x[0]) / (cfg.x[1] - cfg.x[0])) * (W - m.l - m.r);
  const sy = (y) => H - m.b - ((y - cfg.y[0]) / (cfg.y[1] - cfg.y[0])) * (H - m.t - m.b);
  const s = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, role: 'img', 'aria-label': cfg.label || '圖表' });
  s.append(sv('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: '#ffffff', 'fill-opacity': 0.75 }));
  const mono = 'JetBrains Mono, monospace';
  cfg.yt.forEach((v) => {
    s.append(sv('line', { x1: m.l, x2: W - m.r, y1: sy(v), y2: sy(v), stroke: '#d3dcf0', 'stroke-width': 1 }));
    s.append(sv('text', { x: m.l - 8, y: sy(v) + 4, 'text-anchor': 'end', 'font-size': 12, fill: '#55608a', 'font-family': mono, text: cfg.yf ? cfg.yf(v) : String(v) }));
  });
  cfg.xt.forEach((v) => {
    s.append(sv('line', { x1: sx(v), x2: sx(v), y1: H - m.b, y2: H - m.b + 5, stroke: '#1b2340', 'stroke-width': 1.5 }));
    s.append(sv('text', { x: sx(v), y: H - m.b + 19, 'text-anchor': 'middle', 'font-size': 12, fill: '#55608a', 'font-family': mono, text: cfg.xf ? cfg.xf(v) : String(v) }));
  });
  s.append(sv('path', { d: 'M' + m.l + ' ' + m.t + ' V' + (H - m.b) + ' H' + (W - m.r), fill: 'none', stroke: '#1b2340', 'stroke-width': 2 }));
  if (cfg.xl) s.append(sv('text', { x: (m.l + W - m.r) / 2, y: H - 6, 'text-anchor': 'middle', 'font-size': 13, fill: '#1b2340', 'font-weight': 700, text: cfg.xl }));
  if (cfg.yl) s.append(sv('text', { x: 14, y: (m.t + H - m.b) / 2, 'text-anchor': 'middle', 'font-size': 13, fill: '#1b2340', 'font-weight': 700, transform: 'rotate(-90 14 ' + (m.t + H - m.b) / 2 + ')', text: cfg.yl }));
  const under = sv('g'); s.append(under);
  (cfg.series || []).forEach((se) => {
    const d = se.pts.map((p, i) => (i ? 'L' : 'M') + sx(p[0]).toFixed(1) + ' ' + sy(p[1]).toFixed(1)).join(' ');
    s.append(sv('path', { d, fill: 'none', stroke: se.color, 'stroke-width': se.width || 3, 'stroke-dasharray': se.dash || null, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    if (se.marker) se.pts.forEach((p) => {
      const x = sx(p[0]), y = sy(p[1]);
      if (se.marker === 'tri') s.append(sv('path', { d: 'M' + x + ' ' + (y - 6) + ' L' + (x + 5.5) + ' ' + (y + 4.5) + ' L' + (x - 5.5) + ' ' + (y + 4.5) + ' Z', fill: se.color, stroke: '#1b2340', 'stroke-width': 1 }));
      else if (se.marker === 'x') s.append(sv('path', { d: 'M' + (x - 4.5) + ' ' + (y - 4.5) + ' L' + (x + 4.5) + ' ' + (y + 4.5) + ' M' + (x + 4.5) + ' ' + (y - 4.5) + ' L' + (x - 4.5) + ' ' + (y + 4.5), fill: 'none', stroke: se.color, 'stroke-width': 3 }));
      else if (se.marker === 'sq') s.append(sv('rect', { x: x - 5, y: y - 5, width: 10, height: 10, fill: se.color, stroke: '#1b2340', 'stroke-width': 1 }));
      else s.append(sv('circle', { cx: x, cy: y, r: 4.5, fill: se.color, stroke: '#1b2340', 'stroke-width': 1 }));
    });
  });
  const over = sv('g'); s.append(over);
  return { el: s, sx, sy, over, under, W, H, m };
}
const interp = (pts, x) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const a = pts[i - 1], b = pts[i]; return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]); }
  return pts[pts.length - 1][1];
};
const legendH = (items) => '<div class="legend">' + items.map((it) => '<span><i style="background:' + it[0] + '"></i>' + it[1] + '</span>').join('') + '</div>';

// rows of coloured blocks, e.g. several prompts made of chunks
FIG.blocks = (el, step) => {
  (step.rows || []).forEach((r) => {
    const row = h('div.blk-row', r.label ? h('span.blk-lbl', { html: r.label }) : null);
    r.blocks.forEach((b) => row.append(h('span.blk.' + (b[1] === 'q' ? 'ask' : b[1] || 'g'), { html: b[0] })));
    if (r.note) row.append(h('span.blk-note', { html: r.note }));
    el.append(row);
  });
};

// Fig. 2: generation quality vs number of chunks
NB.R.chunkq = (body, step, ctx) => {
  nbHead(body, step);
  const xs = [5, 10, 15, 20, 25, 30, 35, 40, 45];
  const A = [0.19, 0.24, 0.28, 0.29, 0.315, 0.32, 0.315, 0.30, 0.29], Bv = [0.19, 0.23, 0.23, 0.22, 0.24, 0.21, 0.21, 0.18, 0.16];
  const c = chart({ x: [0, 50], y: [0.12, 0.36], xt: [5, 15, 25, 35, 45], yt: [0.15, 0.2, 0.25, 0.3, 0.35], yf: (v) => v.toFixed(2), xl: 'LLM 輸入裡放幾個相關區塊', yl: 'F1 分數', label: '區塊數量與生成品質',
    series: [{ pts: xs.map((x, i) => [x, A[i]]), color: '#5b7fd6', marker: 'tri', dash: '6 4' }, { pts: xs.map((x, i) => [x, Bv[i]]), color: '#ec8b3c', marker: 'x', dash: '6 4' }] });
  const fig = h('div.fig'); fig.append(c.el);
  const sl = h('input', { type: 'range', min: 0, max: 8, step: 1, value: 0, id: 'nb-chunks', 'aria-label': '區塊數量' });
  const out = h('output'), read = h('div.card'), goalEl = h('p.q');
  body.append(h('div', { html: legendH([['#5b7fd6', 'Full KV recompute（有跨區塊注意力）'], ['#ec8b3c', 'Full KV reuse（沒有跨區塊注意力）']]) }), fig,
    h('div.cap', '依論文圖 2(a)（Musique 資料集）的趨勢重繪，數值為近似。'),
    h('div.slider-row', h('label', { for: 'nb-chunks' }, '區塊數'), sl, out), read, goalEl);
  let i = 0, stage = 0, locked = false;
  const draw = () => {
    out.textContent = xs[i] + ' 個';
    c.over.innerHTML = '';
    const x = c.sx(xs[i]);
    c.over.append(sv('line', { x1: x, x2: x, y1: c.sy(A[i]), y2: c.sy(Bv[i]), stroke: '#1b2340', 'stroke-width': 3 }));
    c.over.append(sv('circle', { cx: x, cy: c.sy(A[i]), r: 7, fill: 'none', stroke: '#1b2340', 'stroke-width': 2.5 }));
    c.over.append(sv('circle', { cx: x, cy: c.sy(Bv[i]), r: 7, fill: 'none', stroke: '#1b2340', 'stroke-width': 2.5 }));
    read.innerHTML = '放 <b>' + xs[i] + '</b> 個區塊：完整重算 F1 ≈ <b>' + A[i].toFixed(2) + '</b>，直接重用 F1 ≈ <b>' + Bv[i].toFixed(2) + '</b>，差距 ≈ <b>' + (A[i] - Bv[i]).toFixed(2) + '</b>';
  };
  const goals = [
    { q: '任務 1／2：把滑桿拉到「完整重算」（藍線）品質最高的地方。', test: () => A[i] >= 0.314, ok: '大約 25 到 35 個區塊時最好。再多放，品質反而下降，這是著名的 <b>lost-in-the-middle</b> 現象。', bad: '藍線還能更高，或已經開始往下掉了。', set: 5 },
    { q: '任務 2／2：現在拉到兩條線「差距最大」的地方。', test: () => A[i] - Bv[i] >= 0.125, ok: '', bad: '看那條黑色直線的長度，哪裡最長？', set: 8 }
  ];
  const showGoal = () => { goalEl.innerHTML = goals[stage].q; };
  sl.addEventListener('input', () => { if (locked) return; i = Number(sl.value); draw(); });
  const check = () => {
    if (locked) return;
    const g = goals[stage];
    if (!g.test()) { ctx.bad(g.bad); return; }
    stage++;
    if (stage >= goals.length) { locked = true; sl.disabled = true; ctx.ok(step.after); }
    else { AU.sfx('pick'); ctx.note('<b>沒錯！</b> ' + g.ok, 'ok'); showGoal(); }
  };
  ctx.primary('就是這裡', check);
  draw(); showGoal();
  return { solve() { let guard = 0; while (!locked && guard++ < 5) { i = goals[stage].set; sl.value = String(i); draw(); check(); } } };
};

// Fig. 3 + Fig. 4: the Messi / Ronaldo example and the missing cross-attention block
NB.R.xattn = (body, step, ctx) => {
  nbHead(body, step);
  const t1 = ['Messi', 'scored', '13', 'goals', 'at', 'WCups'], t2 = ['Cristiano', 'scored', '8', 'goals', 'at', 'WCups'];
  const toks = t1.concat(t2), n = toks.length, rng = mulberry(42);
  const A = [];
  for (let r = 0; r < n; r++) { A.push([]); for (let c = 0; c < n; c++) A[r].push(c > r ? -1 : c === r ? 0.55 : 0.06 + rng() * 0.22); }
  [[6, 0, 0.7], [7, 1, 0.8], [8, 2, 0.95], [9, 3, 0.65], [11, 5, 0.4], [8, 1, 0.5]].forEach((q) => { A[q[0]][q[1]] = q[2]; });
  let mode = 'full', locked = false;
  const ansEl = h('div.card');
  const grid = h('div.xa-grid', { style: { gridTemplateColumns: '56px repeat(' + n + ', minmax(0, 1fr))' } });
  const seg = h('div.seg');
  const answers = {
    full: '<span class="kicker">LLM 的回答</span><div><b style="color:var(--green)">✓</b> Lionel Messi scored more goals at FIFA World Cups than Cristiano Ronaldo.</div>',
    reuse: '<span class="kicker">LLM 的回答</span><div><b style="color:var(--rose)">✗</b> The question is asking for information about FIFA World Cups. The names of Messi and Ronaldo are well-known …</div>'
  };
  const cells = [];
  const draw = () => {
    $$('button', seg).forEach((b) => b.classList.toggle('on', b.dataset.m === mode));
    ansEl.innerHTML = answers[mode];
    cells.forEach((cl) => {
      const cross = cl.r >= 6 && cl.c < 6;
      const v = cl.c > cl.r ? -1 : mode === 'reuse' && cross ? 0 : A[cl.r][cl.c];
      cl.el.style.background = v < 0 ? 'transparent' : 'rgba(43, 58, 130, ' + (0.04 + v * 0.96).toFixed(2) + ')';
      cl.el.classList.toggle('void', v < 0);
      cl.el.classList.toggle('hit', locked && cross);
    });
  };
  [['full', 'Full KV recompute'], ['reuse', 'Full KV reuse']].forEach((m) => seg.append(h('button', { data: { m: m[0] }, onclick: () => { mode = m[0]; AU.sfx('tap'); draw(); } }, m[1])));
  grid.append(h('div.xa-hd'));
  toks.forEach((t, i) => grid.append(h('div.xa-hd.col.' + (i < 6 ? 'k1' : 'k2'), h('span', t))));
  for (let r = 0; r < n; r++) {
    grid.append(h('div.xa-hd.row.' + (r < 6 ? 'k1' : 'k2'), toks[r]));
    for (let c = 0; c < n; c++) {
      const el = h('button.xa-c', { 'aria-label': toks[r] + ' 對 ' + toks[c], onclick: () => {
        if (locked || c > r) return;
        if (mode !== 'reuse') { ctx.note('先切到 <b>Full KV reuse</b>，比較看看哪裡不一樣。', 'hint'); return; }
        if (r >= 6 && c < 6) { locked = true; draw(); ctx.ok(step.after); }
        else ctx.bad('這一區兩種做法算出來是一樣的（都是區塊「自己看自己」）。再找找。');
      } });
      cells.push({ r, c, el }); grid.append(el);
    }
  }
  body.append(
    h('div.card', { html: '<div class="blk-row"><span class="blk c1">區塊 1</span> Lionel Messi scored 13 goals at FIFA World Cups.</div><div class="blk-row"><span class="blk c2">區塊 2</span> Cristiano scored 8 goals at FIFA World Cups.</div><div class="blk-row"><span class="blk ask">問題</span> Who scored more goals at FIFA World Cups, Messi or Ronaldo?</div>' }),
    h('div.row', { style: { margin: '10px 0 8px' } }, seg), ansEl,
    h('div.kicker', { style: { marginTop: '10px' } }, '兩個區塊的注意力矩陣（列：發問的 token；欄：被參考的 token；顏色越深權重越大）'),
    h('div.tw', grid),
    h('div.cap', '教學示意圖，仿論文圖 3、圖 4。WCups = World Cups。'));
  draw();
  return { solve() { if (locked) return; mode = 'reuse'; draw(); cells.find((cl) => cl.r === 8 && cl.c === 2).el.click(); } };
};

function ropeDial(o) {
  const W = 260, cx = 130, cy = 130, R = 96;
  const s = sv('svg', { viewBox: '0 0 ' + W + ' 260', width: W, role: 'img', 'aria-label': '旋轉位置編碼示意' });
  s.append(sv('circle', { cx, cy, r: R, fill: '#fff', stroke: '#1b2340', 'stroke-width': 2 }));
  for (let i = 0; i < 12; i++) { const a = (i * 30 * Math.PI) / 180; s.append(sv('line', { x1: cx + Math.cos(a) * (R - 7), y1: cy - Math.sin(a) * (R - 7), x2: cx + Math.cos(a) * R, y2: cy - Math.sin(a) * R, stroke: '#55608a', 'stroke-width': 1.5 })); }
  const g = sv('g'); s.append(g);
  const arrow = (deg, color, label, dash) => {
    const a = (deg * Math.PI) / 180, x = cx + Math.cos(a) * (R - 16), y = cy - Math.sin(a) * (R - 16);
    g.append(sv('line', { x1: cx, y1: cy, x2: x, y2: y, stroke: color, 'stroke-width': dash ? 3 : 5, 'stroke-linecap': 'round', 'stroke-dasharray': dash ? '6 6' : null }));
    g.append(sv('circle', { cx: x, cy: y, r: dash ? 6 : 8, fill: dash ? '#fff' : color, stroke: color, 'stroke-width': 2.5 }));
    g.append(sv('text', { x: cx + Math.cos(a) * (R + 14), y: cy - Math.sin(a) * (R + 14) + 5, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, fill: color, text: label }));
  };
  return { el: s, clear() { g.innerHTML = ''; }, arrow, dot() { g.append(sv('circle', { cx, cy, r: 4, fill: '#1b2340' })); } };
}
// the score only depends on the relative distance
NB.R.roperel = (body, step, ctx) => {
  nbHead(body, step);
  const TH = 25, d = ropeDial();
  const sl = h('input', { type: 'range', min: 0, max: 8, step: 1, value: 0, id: 'nb-rope', 'aria-label': '往後搬幾個位置' });
  const out = h('output'), read = h('div.card');
  body.append(h('div.row', { style: { alignItems: 'flex-start' } }, h('div.fig', { style: { margin: 0 } }, d.el), h('div.grow', h('div.slider-row', h('label', { for: 'nb-rope' }, '整段往後搬'), sl, out), read, h('p.note', '拉動滑桿，把 Q 和 K 一起往後搬。觀察兩支箭頭的夾角和內積。'))));
  const seen = new Set([0]);
  let done = false;
  const draw = () => {
    const m = Number(sl.value);
    out.textContent = m + ' 格';
    d.clear();
    d.arrow(10 + (1 + m) * TH, '#ec8b3c', 'K', false); d.arrow(10 + (3 + m) * TH, '#5b7fd6', 'Q', false); d.dot();
    read.innerHTML = 'K 在位置 <b>' + (1 + m) + '</b>，Q 在位置 <b>' + (3 + m) + '</b><br>相對距離 = <b>2</b>　夾角 = <b>' + 2 * TH + '°</b><br>內積 q·k = <b>' + Math.cos((2 * TH * Math.PI) / 180).toFixed(2) + '</b>';
  };
  sl.addEventListener('input', () => { draw(); seen.add(Number(sl.value)); if (!done && seen.size >= 4) { done = true; ctx.ok(step.after); } });
  draw();
  return { solve() { [2, 5, 8, 3].forEach((v) => { sl.value = String(v); sl.dispatchEvent(new Event('input')); }); } };
};
// fix a cached key that moved to a later position
NB.R.ropefix = (body, step, ctx) => {
  nbHead(body, step);
  const TH = 30, target = 3 * TH, d = ropeDial();
  let corr = 0, locked = false;
  const read = h('div.readout'), minus = h('button.btn.small.alt', '− 30°'), plus = h('button.btn.small.alt', '+ 30°');
  body.append(h('div.row', { style: { alignItems: 'flex-start' } }, h('div.fig', { style: { margin: 0 } }, d.el),
    h('div.grow', h('p', { html: '這個區塊的 K 是在<b>位置 0</b> 算好存起來的。現在它被排到<b>位置 3</b>。' }), h('p.note', '示意：每往後一個位置，RoPE 多旋轉 30°。虛線是 K 應該在的方向。'), h('div.row', minus, plus), h('div.card', { style: { marginTop: '8px' } }, h('div.kicker', '額外旋轉'), read))));
  const draw = () => {
    d.clear();
    d.arrow(15 + target, '#1b2340', '目標', true); d.arrow(15 + corr, '#ec8b3c', 'K', false); d.dot();
    read.textContent = corr + '°';
  };
  minus.onclick = () => { if (locked) return; corr = Math.max(0, corr - TH); AU.sfx('tap'); draw(); };
  plus.onclick = () => { if (locked) return; corr = Math.min(180, corr + TH); AU.sfx('tap'); draw(); };
  const check = () => {
    if (locked) return;
    if (corr === target) { locked = true; ctx.ok(step.after); }
    else ctx.bad(corr < target ? '還沒轉到虛線的位置。往後搬了 3 個位置，每個位置 30°。' : '轉過頭了。');
  };
  ctx.primary('對齊了', check);
  draw();
  return { solve() { if (locked) return; corr = target; draw(); check(); } };
};

FIG.four = (el) => {
  const row = (name, blocks, speed, q, good) => {
    const r = h('div.four-row', h('div.four-name', { html: name }), h('div.blk-row', blocks.map((b) => h('span.blk.' + b[1], { html: b[0] }))), h('div.four-out', h('span.pill2', speed), h('span.pill2.' + (good ? 'good' : 'bad'), q)));
    el.append(r);
  };
  row('(a) Full KV recompute', [['Chunk 1', 'c1'], ['Chunk 2', 'c2'], ['Chunk 3', 'c3']], '最慢', '品質好', true);
  row('(b) Prefix caching', [['KV 1', 'kv'], ['Chunk 2', 'c2'], ['Chunk 3', 'c3']], '快一點點', '品質好', true);
  row('(c) Full KV reuse', [['KV 1', 'kv'], ['KV 2', 'kv'], ['KV 3', 'kv']], '快很多', '品質差', false);
  row('(d) CacheBlend', [['KV 1', 'kv'], ['KV 2', 'kv'], ['KV 3', 'kv'], ['＋重算一小部分', 'rc']], '快很多', '品質好', true);
};
