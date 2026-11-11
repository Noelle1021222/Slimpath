// ===== custom notebook widgets, part C (world 6: the CacheBlend method) =====
// Fig. 5: selective KV recompute on one layer
NB.R.selrc = (body, step, ctx) => {
  nbHead(body, step);
  const N = 8, sub = '₁₂₃₄₅₆₇₈';
  const sel = new Set();
  let stage = 0, locked = false;
  const wrap = h('div.tw'), sr = h('div.sr'), note = h('p.note'), quiz = h('div.calc');
  wrap.append(sr);
  body.append(h('div', { html: legendH([['var(--recomp)', '重新計算'], ['var(--reuse)', '沿用快取'], ['#ffe08a', 'Attention 可以參考']]) }), wrap, note, quiz);
  const col = (title, cells) => { const c = h('div.sr-col', h('b', { html: title })); cells.forEach((x) => c.append(x)); return c; };
  const draw = () => {
    sr.innerHTML = '';
    const idx = Array.from(sel).sort((a, b) => a - b);
    const inp = [];
    for (let i = 0; i < N; i++) inp.push(h('button.sr-cell' + (sel.has(i) ? '.rc' : ''), { 'aria-label': 't' + (i + 1), onclick: () => { if (stage > 0) return; if (sel.has(i)) sel.delete(i); else if (sel.size < 2) sel.add(i); AU.sfx('tap'); draw(); } }, 't' + sub[i]));
    const stack = (fn) => { const a = []; for (let i = 0; i < N; i++) a.push(h('div.sr-cell' + fn(i))); return a; };
    const attn = h('div.sr-attn', { style: { gridTemplateColumns: 'repeat(' + N + ', 15px)' } });
    for (let i = 0; i < N; i++) for (let c = 0; c < N; c++) attn.append(h('div.sr-cell' + (!sel.has(i) ? '.none' : c <= i ? '.vis' : '.msk')));
    sr.append(col('第 i 層<br>輸入', inp), col('Q', stack((i) => (sel.has(i) ? '.rc' : '.none'))), h('span.sr-op', '×'), col('K', stack((i) => (sel.has(i) ? '.rc' : ''))),
      h('span.sr-op', '→'), col('Attention 分數', [attn]), h('span.sr-op', '×'), col('V', stack((i) => (sel.has(i) ? '.rc' : ''))), h('span.sr-op', '→'), col('第 i+1 層<br>輸入', stack((i) => (sel.has(i) ? '.rc' : '.none'))));
    note.innerHTML = stage === 0 ? '點最左邊那一欄，<b>選 2 個 token</b> 來重算（已選 ' + sel.size + ' 個）。看看每一欄怎麼變。' : '你選了 ' + idx.map((i) => 't' + sub[i]).join('、') + '。只有這兩個 token 走完這一層的運算；其他 6 個的 K、V 直接沿用。';
    if (stage === 0) ctx.primary('就選這兩個', next, sel.size === 2);
  };
  const next = () => {
    stage = 1; draw(); AU.sfx('pick');
    quiz.innerHTML = '這一層新算出來的 Q 有 <input class="num" id="nb-in-0" inputmode="numeric" autocomplete="off" aria-label="Q 的列數"> 列<br>Attention 可以讀取的 K、V 位置有 <input class="num" id="nb-in-1" inputmode="numeric" autocomplete="off" aria-label="K V 的位置數"> 個<br>Attention 分數矩陣的形狀是 <input class="num" id="nb-in-2" inputmode="numeric" autocomplete="off" aria-label="列"> × <input class="num" id="nb-in-3" inputmode="numeric" autocomplete="off" aria-label="欄">';
    ctx.primary('檢查答案', check);
  };
  const ans = [2, 8, 2, 8];
  const check = () => {
    if (locked) return;
    const ins = $$('input.num', quiz);
    let all = true;
    ins.forEach((inp, i) => { const ok = parseNum(inp.value) === ans[i]; inp.classList.toggle('ok', ok); inp.classList.toggle('no', !ok && !!inp.value.trim()); if (!ok) all = false; });
    if (all) { locked = true; ins.forEach((inp) => { inp.readOnly = true; }); ctx.ok(step.after); }
    else ctx.bad('數數看圖裡深灰色的 Q 有幾格；K、V 那一欄（灰色加白色）總共有幾格。');
  };
  draw();
  return { solve() { if (locked) return; if (stage === 0) { sel.clear(); sel.add(2); sel.add(6); draw(); next(); } $$('input.num', quiz).forEach((inp, i) => { inp.value = String(ans[i]); }); check(); } };
};

// generic "drag the slider to the right place" chart task
function sliderChart(body, step, ctx, o) {
  const c = chart(o.chart);
  const fig = h('div.fig'); fig.append(c.el);
  const sl = h('input', { type: 'range', min: o.min, max: o.max, step: o.step || 1, value: o.start, id: 'nb-sl', 'aria-label': o.name });
  const out = h('output'), read = h('div.card'), goalEl = h('p.q');
  if (o.legend) body.append(h('div', { html: legendH(o.legend) }));
  body.append(fig);
  if (o.cap) body.append(h('div.cap', o.cap));
  body.append(h('div.slider-row', h('label', { for: 'nb-sl' }, o.name), sl, out), read, goalEl);
  let stage = 0, locked = false;
  const val = () => Number(sl.value);
  const draw = () => { out.textContent = o.fmt(val()); c.over.innerHTML = ''; o.draw(c, val(), read); };
  const showGoal = () => { goalEl.innerHTML = (o.goals.length > 1 ? '任務 ' + (stage + 1) + '／' + o.goals.length + '：' : '') + o.goals[stage].q; };
  sl.addEventListener('input', () => { if (!locked) draw(); });
  const check = () => {
    if (locked) return;
    const g = o.goals[stage];
    if (!g.test(val())) { ctx.bad(g.bad); return; }
    stage++;
    if (stage >= o.goals.length) { locked = true; sl.disabled = true; ctx.ok(step.after); }
    else { AU.sfx('pick'); ctx.note('<b>沒錯！</b> ' + (typeof g.ok === 'function' ? g.ok(val()) : g.ok), 'ok'); showGoal(); }
  };
  ctx.primary(o.btn || '就是這裡', check);
  draw(); showGoal();
  return { solve() { let guard = 0; while (!locked && guard++ < 6) { sl.value = String(o.goals[stage].set); draw(); check(); } } };
}
// Fig. 6: attention deviation vs recompute ratio
const DEVCURVE = [[0, 1], [1, 0.62], [2, 0.42], [3, 0.34], [5, 0.28], [10, 0.23], [15, 0.2], [20, 0.19], [30, 0.17], [40, 0.16], [50, 0.15]];
NB.R.devcurve = (body, step, ctx) => {
  nbHead(body, step);
  return sliderChart(body, step, ctx, {
    name: '重算比例', min: 0, max: 50, step: 1, start: 0, fmt: (v) => v + '%',
    cap: '依論文圖 6 的趨勢重繪（三個模型的曲線形狀相近），數值為近似。',
    chart: { x: [0, 50], y: [0, 1.05], xt: [0, 10, 20, 30, 40, 50], yt: [0, 0.2, 0.4, 0.6, 0.8, 1], yf: (v) => v.toFixed(1), xl: '每層重算的 token 比例（%）', yl: 'Forward attention 偏差', label: '重算比例與注意力偏差', series: [{ pts: DEVCURVE, color: '#1b2340', width: 3 }] },
    draw: (c, v, read) => {
      const y = interp(DEVCURVE, v);
      c.over.append(sv('line', { x1: c.sx(v), x2: c.sx(v), y1: c.sy(0), y2: c.sy(y), stroke: '#ec8b3c', 'stroke-width': 2, 'stroke-dasharray': '4 3' }));
      c.over.append(sv('circle', { cx: c.sx(v), cy: c.sy(y), r: 7, fill: '#ec8b3c', stroke: '#1b2340', 'stroke-width': 2 }));
      read.innerHTML = '優先重算偏差最高的 <b>' + v + '%</b> token → 注意力偏差剩 <b>' + y.toFixed(2) + '</b>（已經消掉 <b>' + (1 - y).toFixed(2) + '</b>）';
    },
    goals: [
      { q: '把重算比例拉到 <b>15%</b>，看偏差掉了多少。', set: 15, test: (v) => v === 15, ok: '只重算 15%，偏差就從 1.00 掉到 0.20，消掉了八成。', bad: '拉到剛好 15%。' },
      { q: '再一路拉到 <b>50%</b>。多重算的這 35%，又讓偏差掉了多少？', set: 50, test: (v) => v === 50, ok: '', bad: '拉到最右邊的 50%。' }
    ]
  });
};
// Fig. 7: CDF of KV deviation on one layer
const CDFPTS = [[0, 0], [2, 0.25], [5, 0.55], [8, 0.75], [10, 0.85], [15, 0.92], [20, 0.96], [30, 0.985], [40, 0.995], [60, 1]];
NB.R.cdf = (body, step, ctx) => {
  nbHead(body, step);
  return sliderChart(body, step, ctx, {
    name: '偏差門檻 x', min: 0, max: 60, step: 1, start: 30, fmt: (v) => String(v),
    cap: '依論文圖 7 的形狀重繪，數值為示意。CDF = 累積分布函數。',
    chart: { x: [0, 60], y: [0, 1.05], xt: [0, 10, 20, 30, 40, 50, 60], yt: [0, 0.25, 0.5, 0.75, 1], yf: (v) => v.toFixed(2), xl: '某一層上，每個 token 的 KV 偏差', yl: 'CDF', label: 'KV 偏差的累積分布', series: [{ pts: CDFPTS, color: '#1b2340', width: 3 }] },
    draw: (c, v, read) => {
      const y = interp(CDFPTS, v);
      c.over.append(sv('rect', { x: c.sx(v), y: c.sy(1.05), width: c.sx(60) - c.sx(v), height: c.sy(0) - c.sy(1.05), fill: '#ec8b3c', 'fill-opacity': 0.16 }));
      c.over.append(sv('line', { x1: c.sx(v), x2: c.sx(v), y1: c.sy(0), y2: c.sy(1.05), stroke: '#ec8b3c', 'stroke-width': 2.5 }));
      c.over.append(sv('line', { x1: c.sx(0), x2: c.sx(v), y1: c.sy(y), y2: c.sy(y), stroke: '#ec8b3c', 'stroke-width': 2, 'stroke-dasharray': '4 3' }));
      c.over.append(sv('circle', { cx: c.sx(v), cy: c.sy(y), r: 7, fill: '#ec8b3c', stroke: '#1b2340', 'stroke-width': 2 }));
      read.innerHTML = '偏差 ≤ <b>' + v + '</b> 的 token 佔 <b>' + Math.round(y * 100) + '%</b>；偏差比它大的（橘色區域）只剩 <b>' + Math.round((1 - y) * 100) + '%</b>';
    },
    goals: [{ q: '曲線一開始爬得很快，表示多數 token 的偏差都很小。把門檻移到 <b>CDF = 0.85</b> 的位置。', set: 10, test: (v) => Math.abs(interp(CDFPTS, v) - 0.85) < 0.012, bad: '看卡片裡的百分比，調到「偏差 ≤ x 的 token 佔 85%」。' }]
  });
};

// two layers of bars side by side (Fig. 8 intuition)
FIG.twolayers = (el, step) => {
  step.layers.forEach((ly) => {
    const box = h('div.gf-layer', h('h4', ly.name));
    const bars = h('div.bars', { style: { minHeight: '110px' } });
    const mx = Math.max.apply(null, ly.vals);
    ly.vals.forEach((v, i) => bars.append(h('div.bar-b' + (step.top.indexOf(i) >= 0 ? '.ok' : ''), { style: { height: '110px' } }, h('em', v.toFixed(1)), h('i', { style: { height: Math.max(3, (v / mx) * 70) + 'px' } }), h('span', 't' + '₁₂₃₄₅₆₇₈₉'[i]))));
    box.append(bars); el.append(box);
  });
};

// Fig. 9: gradual filtering across layers
NB.R.gradual = (body, step, ctx) => {
  nbHead(body, step);
  const names = ['t₁', 't₂', 't₃', 't₄', 't₅', 't₆', 't₇', 't₈', 't₉', 't₁₀'];
  // deviation of each token measured on each layer (only meaningful for tokens recomputed there)
  const dev = [
    [0.6, 7.9, 1.2, 6.4, 0.3, 9.2, 0.9, 5.1, 1.5, 0.4],
    [0, 8.3, 0, 5.2, 0, 9.6, 0, 3.1, 0, 0],
    [0, 7.7, 0, 3.4, 0, 9.9, 0, 0, 0, 0]
  ];
  const keep = [4, 3, 2];
  let cand = names.map((_, i) => i), layer = 0, locked = false;
  const stageEl = h('div'), tally = h('div.card');
  body.append(stageEl, tally);
  let sel = new Set();
  const cost = [];
  const drawTally = () => {
    const used = cost.reduce((a, b) => a + b, 0);
    tally.innerHTML = '<div class="kicker">重算了幾個「token × 層」</div>' + (cost.length ? cost.map((c, i) => '第 ' + (i + 1) + ' 層 ' + c + ' 個').join('　') + '　合計 <b>' + used + '</b>' : '還沒開始') + (locked ? '<br>如果模型有 32 層：完整重算要 10 × 32 = <b>320</b>；這樣做只要 10 + 4 + 3 + 2 × 29 = <b>75</b>。' : '');
  };
  const draw = () => {
    stageEl.innerHTML = '';
    const k = keep[layer], vals = dev[layer];
    const mx = Math.max.apply(null, cand.map((i) => vals[i]));
    const box = h('div.gf-layer', h('h4', '第 ' + (layer + 1) + ' 層：' + (layer === 0 ? '全部 10 個 token 都重算' : '只重算上一層選出的 ' + cand.length + ' 個') + '，比較新舊 KV'));
    const bars = h('div.bars');
    names.forEach((nm, i) => {
      const on = cand.indexOf(i) >= 0;
      const b = h('button.bar-b' + (on ? '' : '.dead'), { disabled: !on, 'aria-label': nm + ' 偏差 ' + vals[i], onclick: () => { if (locked) return; if (sel.has(i)) sel.delete(i); else if (sel.size < k) sel.add(i); AU.sfx('tap'); b.classList.toggle('sel', sel.has(i)); ctx.primary('選好了（' + sel.size + '/' + k + '）', check, sel.size === k); } },
        h('em', on ? vals[i].toFixed(1) : '沿用'), h('i', { style: { height: (on ? Math.max(3, (vals[i] / mx) * 86) : 8) + 'px' } }), h('span', nm));
      b.dataset.i = i;
      bars.append(b);
    });
    box.append(bars);
    stageEl.append(box, h('p.q', { html: '挑出 KV 偏差最高的 <b>' + k + '</b> 個，交給下一層。' }));
    ctx.primary('選好了（0/' + k + '）', check, false);
    drawTally();
  };
  const top = () => cand.slice().sort((a, b) => dev[layer][b] - dev[layer][a]).slice(0, keep[layer]);
  const check = () => {
    if (locked) return;
    const want = new Set(top());
    const ok = sel.size === want.size && Array.from(sel).every((i) => want.has(i));
    if (!ok) { $$('.bar-b', stageEl).forEach((b) => { const i = Number(b.dataset.i); if (sel.has(i) && !want.has(i)) { b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 600); } }); ctx.bad('有選到偏差比較低的。比較長條上面的數字，挑最大的 ' + keep[layer] + ' 個。'); return; }
    cost.push(cand.length);
    cand = Array.from(sel).sort((a, b) => a - b);
    sel = new Set(); layer++;
    if (layer >= keep.length) {
      locked = true;
      stageEl.innerHTML = '';
      stageEl.append(h('div.gf-layer', h('h4', '第 4 層之後：每一層都只重算 ' + cand.map((i) => names[i]).join('、')), h('p.note', { style: { margin: '6px 0 2px' } }, '其餘 8 個 token 的 KV 一路沿用預先算好的快取。')));
      drawTally();
      ctx.ok(step.after);
    } else { AU.sfx('pick'); ctx.note('<b>對！</b> 這 ' + cand.length + ' 個往下一層走；其他 token 從這裡開始就沿用快取。', 'ok'); draw(); }
  };
  draw();
  return { solve() { let guard = 0; while (!locked && guard++ < 5) { sel = new Set(top()); check(); } } };
};
