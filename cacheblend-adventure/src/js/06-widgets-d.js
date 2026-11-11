// ===== custom notebook widgets, part D (world 7: pipelining and the controller) =====
// schedule of per-layer loading and recompute. over[i] = load layer i+2 while recomputing layer i+1
function pipeSchedule(Ld, C, over) {
  const N = over.length + 1, Ls = [], Le = [], Cs = [], Ce = [];
  for (let i = 0; i < N; i++) {
    Ls[i] = i === 0 ? 0 : Math.max(over[i - 1] ? Cs[i - 1] : Ce[i - 1], Le[i - 1]);
    Le[i] = Ls[i] + Ld;
    Cs[i] = Math.max(Le[i], i ? Ce[i - 1] : 0);
    Ce[i] = Cs[i] + C;
  }
  return { Ls, Le, Cs, Ce, total: Ce[N - 1] };
}
function pipeSVG(Ld, C, over, span) {
  const s = pipeSchedule(Ld, C, over), W = 580, H = 138, x0 = 86, x1 = W - 12;
  const sx = (t) => x0 + (t / span) * (x1 - x0);
  const g = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, role: 'img', 'aria-label': '載入與重算的時間軸' });
  const mono = 'JetBrains Mono, monospace';
  [['載入', 18], ['重算', 62]].forEach((r) => {
    g.append(sv('rect', { x: x0, y: r[1], width: x1 - x0, height: 34, fill: '#ffffff', 'fill-opacity': 0.7, stroke: '#d3dcf0' }));
    g.append(sv('text', { x: x0 - 8, y: r[1] + 22, 'text-anchor': 'end', 'font-size': 14, 'font-weight': 700, fill: '#1b2340', text: r[0] }));
  });
  for (let i = 0; i < s.Ls.length; i++) {
    g.append(sv('rect', { x: sx(s.Ls[i]), y: 20, width: Math.max(2, sx(s.Le[i]) - sx(s.Ls[i])), height: 30, rx: 4, fill: '#c9d6f5', stroke: '#1b2340', 'stroke-width': 1.5 }));
    g.append(sv('text', { x: (sx(s.Ls[i]) + sx(s.Le[i])) / 2, y: 40, 'text-anchor': 'middle', 'font-size': 12, 'font-family': mono, 'font-weight': 700, fill: '#1b2340', text: 'L' + (i + 1) }));
    g.append(sv('rect', { x: sx(s.Cs[i]), y: 64, width: Math.max(2, sx(s.Ce[i]) - sx(s.Cs[i])), height: 30, rx: 4, fill: '#6b7280', stroke: '#1b2340', 'stroke-width': 1.5 }));
    if (sx(s.Ce[i]) - sx(s.Cs[i]) > 22) g.append(sv('text', { x: (sx(s.Cs[i]) + sx(s.Ce[i])) / 2, y: 84, 'text-anchor': 'middle', 'font-size': 12, 'font-family': mono, 'font-weight': 700, fill: '#ffffff', text: 'L' + (i + 1) }));
  }
  g.append(sv('line', { x1: x0, x2: x1, y1: 104, y2: 104, stroke: '#1b2340', 'stroke-width': 1.5 }));
  const tick = Math.max(5, Math.round(span / 6 / 5) * 5);
  for (let t = 0; t <= span + 0.01; t += tick) {
    g.append(sv('line', { x1: sx(t), x2: sx(t), y1: 104, y2: 109, stroke: '#1b2340' }));
    g.append(sv('text', { x: sx(t), y: 122, 'text-anchor': 'middle', 'font-size': 11, 'font-family': mono, fill: '#55608a', text: String(t) }));
  }
  g.append(sv('text', { x: x1, y: 135, 'text-anchor': 'end', 'font-size': 11, fill: '#55608a', text: '時間（ms）' }));
  g.append(sv('line', { x1: sx(s.total), x2: sx(s.total), y1: 12, y2: 104, stroke: '#ec8b3c', 'stroke-width': 2.5, 'stroke-dasharray': '5 3' }));
  return { el: g, s };
}
NB.R.pipeline = (body, step, ctx) => {
  nbHead(body, step);
  const Ld = step.load, C = step.comp, over = [false, false];
  const span = 3 * (Ld + C);
  const fig = h('div.fig'), read = h('div.card'), tg = h('div.set-list');
  let locked = false;
  body.append(h('div', { html: legendH([['#c9d6f5', '把某一層的 KV 載入 GPU（' + Ld + ' ms）'], ['#6b7280', '重算那一層選中的 token（' + C + ' ms）']]) }), fig, read, tg);
  const best = pipeSchedule(Ld, C, [true, true]).total;
  const draw = () => {
    fig.innerHTML = '';
    const p = pipeSVG(Ld, C, over, span);
    fig.append(p.el);
    read.innerHTML = '<span class="kicker">三層全部完成</span><div class="readout">' + p.s.total + ' ms</div>';
    return p.s.total;
  };
  [0, 1].forEach((i) => {
    const seg = h('div.seg');
    [['等上一層重算完，再開始載入', false], ['上一層一開始重算，就同時載入', true]].forEach((o) => {
      const b = h('button' + (o[1] === over[i] ? '.on' : ''), { onclick: () => { if (locked) return; over[i] = o[1]; $$('button', seg).forEach((x) => x.classList.remove('on')); b.classList.add('on'); AU.sfx('tap'); draw(); } }, o[0]);
      seg.append(b);
    });
    tg.append(h('div.set-row', h('b', '第 ' + (i + 2) + ' 層的 KV'), seg));
  });
  const check = () => {
    if (locked) return;
    const t = draw();
    if (t === best) { locked = true; ctx.ok(step.after); }
    else ctx.bad('現在要 ' + t + ' ms，還能更短。GPU 在重算的時候，搬運 KV 的那一邊是閒著的。');
  };
  ctx.primary('這是最快的排法', check);
  draw();
  return { solve() { if (locked) return; $$('.seg', tg).forEach((sg) => $$('button', sg)[1].click()); check(); } };
};
FIG.pipeB = (el, step) => { el.append(pipeSVG(step.load, step.comp, [true, true], 3 * (step.load + step.comp)).el); };

// Fig. 10(a): picking the recompute ratio
NB.R.ratio = (body, step, ctx) => {
  nbHead(body, step);
  const TL = 1.25, TF = 4.664;
  const a = [], b = [];
  for (let r = 0; r <= 50; r += 2) { a.push([r, TL + (r / 100) * TF]); b.push([r, Math.max(TL, (r / 100) * TF)]); }
  return sliderChart(body, step, ctx, {
    name: '重算比例', min: 0, max: 50, step: 0.2, start: 5, fmt: (v) => v.toFixed(1) + '%',
    legend: [['#55608a', '沒有管線化：載入 + 重算'], ['#1b2340', '有管線化：取兩者較慢的那個']],
    cap: '依論文圖 10(a) 重繪（SSD 吞吐量 1 GB/s 的例子），數值為近似。',
    chart: { x: [0, 50], y: [0, 4], xt: [0, 10, 20, 30, 40, 50], yt: [0, 1, 2, 3, 4], xl: '重算比例（%）', yl: 'Prefill 延遲 TTFT（秒）', label: '重算比例與延遲', series: [{ pts: a, color: '#55608a', dash: '7 5', width: 2.5 }, { pts: b, color: '#1b2340', width: 3.5 }] },
    draw: (c, v, read) => {
      const y = Math.max(TL, (v / 100) * TF), extra = y - TL;
      c.over.append(sv('line', { x1: c.sx(v), x2: c.sx(v), y1: c.sy(0), y2: c.sy(y), stroke: '#ec8b3c', 'stroke-width': 2, 'stroke-dasharray': '4 3' }));
      c.over.append(sv('circle', { cx: c.sx(v), cy: c.sy(y), r: 7, fill: '#ec8b3c', stroke: '#1b2340', 'stroke-width': 2 }));
      read.innerHTML = '重算 <b>' + v.toFixed(1) + '%</b>：載入要 ' + TL.toFixed(2) + ' 秒，重算要 ' + ((v / 100) * TF).toFixed(2) + ' 秒 → 有管線化的延遲 <b>' + y.toFixed(2) + ' 秒</b>' + (extra > 0.005 ? '（比只載入多了 ' + extra.toFixed(2) + ' 秒）' : '（重算完全藏在載入後面）');
    },
    goals: [{ q: '重算越多品質越好。把比例調到「<b>不增加延遲的最大值</b>」。', set: 26.8, test: (v) => Math.abs(v - 26.8) <= 0.7, bad: '找實線開始往上彎的那一點：再往右延遲就會增加，往左則是白白少算。' }]
  });
};

// Fig. 10(b): which storage device, given a fixed 15% recompute ratio
FIG.devices = (el) => {
  const rc = 7.5, rows = [['GPU 記憶體', 0, '最貴'], ['CPU RAM', 2, '貴'], ['SSD（32 Gbps）', 6, '便宜'], ['SSD（4 Gbps）', 48, '最便宜']];
  const mx = 56;
  rows.forEach((r) => {
    const a = r[1] + rc, b = Math.max(r[1], rc);
    el.append(h('div.dev-row', h('div.dev-name', h('b', r[0]), h('span.pill2', '儲存成本：' + r[2]), h('span.note', '　載入一層 ' + r[1] + ' ms')),
      h('div.dev-bar', h('i.a', { style: { width: (a / mx) * 100 + '%' } }), h('span', '沒有管線化 ' + a + ' ms')),
      h('div.dev-bar', h('i.b', { style: { width: (b / mx) * 100 + '%' } }), h('span', '有管線化 ' + b + ' ms'))));
  });
};
