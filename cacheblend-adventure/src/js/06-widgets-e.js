// ===== custom notebook widgets, part E (world 8: reading the evaluation) =====
// Fig. 12: name the four points on the TTFT / quality plane
NB.R.scatter = (body, step, ctx) => {
  nbHead(body, step);
  const pts = step.points, methods = step.methods;
  const c = chart({ x: [0, 2.5], y: [0, 0.42], xt: [0, 0.5, 1, 1.5, 2, 2.5], yt: [0, 0.1, 0.2, 0.3, 0.4], yf: (v) => v.toFixed(1), xl: 'TTFT（秒）　越左越快', yl: 'F1 分數　越高越好', label: '延遲與品質' });
  const fig = h('div.fig'); fig.append(c.el);
  // the "better" arrow, as in the paper's figure
  c.under.append(sv('path', { d: 'M' + c.sx(1.45) + ' ' + c.sy(0.14) + ' L' + c.sx(1.0) + ' ' + c.sy(0.24), stroke: '#55608a', 'stroke-width': 8, 'stroke-linecap': 'round', fill: 'none', opacity: 0.35 }));
  c.under.append(sv('text', { x: c.sx(1.5), y: c.sy(0.1), 'font-size': 13, fill: '#55608a', 'font-weight': 700, text: '往左上角越好' }));
  const assign = {};
  let cur = 0, locked = false;
  const chips = h('div.pool'), info = h('p.note');
  body.append(fig, h('div.cap', step.cap || ''), info, chips);
  const draw = () => {
    c.over.innerHTML = '';
    pts.forEach((p, i) => {
      const m = methods.find((q) => q.key === assign[p.id]);
      const g = sv('g', { style: 'cursor:pointer' });
      g.append(sv('circle', { cx: c.sx(p.x), cy: c.sy(p.y), r: i === cur && !locked ? 17 : 14, fill: m ? m.color : '#ffffff', stroke: '#1b2340', 'stroke-width': i === cur && !locked ? 4 : 2.5 }));
      g.append(sv('text', { x: c.sx(p.x), y: c.sy(p.y) + 5, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, 'font-family': 'JetBrains Mono, monospace', fill: m && m.dark ? '#ffffff' : '#1b2340', text: p.id }));
      g.addEventListener('click', () => { if (locked) return; cur = i; AU.sfx('tap'); draw(); });
      c.over.append(g);
    });
    const p = pts[cur];
    info.innerHTML = locked ? '' : '目前選的是點 <b>' + p.id + '</b>（TTFT ' + p.x.toFixed(2) + ' 秒，F1 ' + p.y.toFixed(2) + '）。它是哪一種方法？點圖上的圓點可以換一個點。';
    chips.innerHTML = '';
    methods.forEach((m) => {
      const used = Object.keys(assign).find((k) => assign[k] === m.key);
      chips.append(h('button.tok' + (assign[p.id] === m.key ? '.sel' : ''), { onclick: () => {
        if (locked) return;
        if (used) delete assign[used];
        assign[p.id] = m.key; AU.sfx('pick');
        const nxt = pts.findIndex((q) => !assign[q.id]);
        if (nxt >= 0) cur = nxt;
        draw();
        ctx.primary('檢查（' + Object.keys(assign).length + '/' + pts.length + '）', check, Object.keys(assign).length === pts.length);
      } }, h('span.tag', { style: { background: m.color } }, used ? used : '?'), h('span', m.name)));
    });
  };
  const check = () => {
    if (locked) return;
    const wrong = pts.filter((p) => assign[p.id] !== p.ans);
    if (!wrong.length) { locked = true; draw(); ctx.ok(step.after); }
    else ctx.bad('有 ' + wrong.length + ' 個點標錯了。想想：誰完全不重算所以最快、但品質最差？誰幾乎一樣快卻保住品質？');
  };
  ctx.primary('檢查（0/' + pts.length + '）', check, false);
  draw();
  return { solve() { if (locked) return; pts.forEach((p) => { assign[p.id] = p.ans; }); draw(); check(); } };
};

// Fig. 14: TTFT under increasing request rate
NB.R.loadtest = (body, step, ctx) => {
  nbHead(body, step);
  const SLO = 5;
  const M = [
    { name: 'Full KV recompute', t0: 3.0, mu: 0.5, color: '#2f4fa8', marker: 'tri' },
    { name: 'Prefix caching（RAM）', t0: 2.4, mu: 0.52, color: '#7fa8e8', marker: 'dot' },
    { name: 'Prefix caching（RAM+SSD）', t0: 2.0, mu: 0.6, color: '#4fa866', marker: 'dot' },
    { name: 'CacheBlend', t0: 0.8, mu: 1.0, color: '#d9544f', marker: 'sq' }
  ];
  const T = (m, r) => (r >= m.mu * 0.985 ? 99 : m.t0 / (1 - r / m.mu));
  const series = M.map((m) => { const pts = []; for (let r = 0.02; r < m.mu * 0.97; r += 0.02) { const y = T(m, r); if (y > 8.4) { pts.push([r, 8.4]); break; } pts.push([r, y]); } return { pts, color: m.color, width: 3 }; });
  return sliderChart(body, step, ctx, {
    name: '請求率', min: 0.02, max: 1, step: 0.02, start: 0.06, fmt: (v) => v.toFixed(2) + ' 筆/秒',
    legend: M.map((m) => [m.color, m.name]),
    cap: '仿論文圖 14 的形狀，數值為教學示意。橫軸是送進系統的請求率。',
    chart: { x: [0, 1], y: [0, 8.4], xt: [0, 0.2, 0.4, 0.6, 0.8, 1], yt: [0, 2, 4, 6, 8], xf: (v) => v.toFixed(1), xl: '每秒送進來的請求數', yl: 'TTFT（秒）', label: '請求率與 TTFT', series },
    draw: (c, v, read) => {
      c.over.append(sv('line', { x1: c.sx(0), x2: c.sx(1), y1: c.sy(SLO), y2: c.sy(SLO), stroke: '#1b2340', 'stroke-width': 1.5, 'stroke-dasharray': '3 4' }));
      c.over.append(sv('text', { x: c.sx(1) - 4, y: c.sy(SLO) - 6, 'text-anchor': 'end', 'font-size': 12, fill: '#1b2340', 'font-weight': 700, text: 'TTFT 上限 5 秒' }));
      c.over.append(sv('line', { x1: c.sx(v), x2: c.sx(v), y1: c.sy(0), y2: c.sy(8.4), stroke: '#ec8b3c', 'stroke-width': 2.5 }));
      read.innerHTML = '每秒 <b>' + v.toFixed(2) + '</b> 筆請求時：<br>' + M.map((m) => { const y = T(m, v); return '<span style="color:' + m.color + '">■</span> ' + m.name + '：' + (y > 30 ? '<b style="color:var(--rose)">塞爆了</b>' : '<b>' + y.toFixed(1) + ' 秒</b>' + (y > SLO ? '（超過上限）' : '')); }).join('<br>');
    },
    goals: [
      { q: '把請求率往上加，停在「Full KV recompute 還壓得住 5 秒」的最大值。', set: 0.2, test: (v) => T(M[0], v) <= SLO + 0.01 && T(M[0], v + 0.02) > SLO, ok: '完整重算大約只撐得住每秒 0.20 筆。', bad: '看深藍色那一項：要 ≤ 5 秒，而且再多一點就會超過。' },
      { q: '繼續加，停在「CacheBlend 還壓得住 5 秒」的最大值。', set: 0.84, test: (v) => T(M[3], v) <= SLO + 0.01 && T(M[3], v + 0.02) > SLO, ok: '', bad: '看紅色的 CacheBlend：要 ≤ 5 秒，而且再多一點就會超過。' }
    ]
  });
};
