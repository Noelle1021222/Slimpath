// ===== custom notebook widgets, part A (worlds 1-3) =====
const vecH = (arr, cls) => '<span class="vec ' + (cls || '') + '">' + arr.map((v) => '<i>' + v + '</i>').join('') + '</span>';
const matH = (rows) => '<span class="mat">' + rows.map((r) => '<span>' + r.map((v) => '<i>' + v + '</i>').join('') + '</span>').join('') + '</span>';

// cut a sentence into tokens by tapping the gaps
NB.R.cut = (body, step, ctx) => {
  nbHead(body, step);
  const chars = step.text.split('');
  const cuts = new Set();
  const row = h('div.cut-row');
  let locked = false;
  const gaps = [];
  chars.forEach((c, i) => {
    row.append(h('span.cut-ch', c));
    if (i < chars.length - 1) {
      const gp = h('button.cut-gap', { 'aria-label': '在「' + c + '」後面切一刀', onclick: () => { if (locked) return; if (cuts.has(i)) cuts.delete(i); else cuts.add(i); gp.classList.toggle('on', cuts.has(i)); AU.sfx('tap'); } });
      gaps[i] = gp; row.append(gp);
    }
  });
  const out = h('div.cut-out');
  body.append(row, h('div.note', '點兩個字中間的縫隙就能下刀，再點一次可以取消。'), out);
  const check = () => {
    if (locked) return;
    const want = new Set(step.cuts);
    const ok = cuts.size === want.size && Array.from(cuts).every((i) => want.has(i));
    if (!ok) { ctx.bad(cuts.size > want.size ? '切太碎了。有些字要合在一起才是一個 token。' : cuts.size < want.size ? '刀數還不夠，目標是 ' + (want.size + 1) + ' 個 token。' : '刀數對了，但位置不對。'); return; }
    locked = true;
    let s = 0;
    const toks = [];
    step.cuts.slice().sort((a, b) => a - b).concat([chars.length - 1]).forEach((e) => { toks.push(chars.slice(s, e + 1).join('')); s = e + 1; });
    toks.forEach((t, i) => out.append(h('span.tok.c' + (i % 3 + 1), h('span', t), h('span.n', 'ID ' + step.ids[i]))));
    ctx.ok(step.after);
  };
  ctx.primary('切好了', check);
  return { solve() { if (locked) return; gaps.forEach((gp, i) => { if (gp && cuts.has(i) !== (step.cuts.indexOf(i) >= 0)) gp.click(); }); check(); } };
};

// look up embedding vectors by token id
NB.R.lookup = (body, step, ctx) => {
  nbHead(body, step);
  let cur = 0;
  const seqEl = h('div.lk-seq'), tbl = h('div.lk-table');
  body.append(seqEl, h('div.note', '下面是嵌入表的一小角。點選「目前這個 token」的 ID 那一列。'), tbl);
  const slots = step.seq.map((s) => { const el = h('div.lk-slot', h('b', s.tok), h('span.mono', 'ID ' + s.id), h('div.lk-v', '？')); seqEl.append(el); return el; });
  const mark = () => slots.forEach((el, i) => el.classList.toggle('cur', i === cur));
  const rows = shuffled(step.table);
  const btns = rows.map((r) => {
    const b = h('button.lk-row', { onclick: () => {
      if (cur >= step.seq.length) return;
      if (r[0] === step.seq[cur].id) {
        $('.lk-v', slots[cur]).innerHTML = vecH(r[1], 'o');
        slots[cur].classList.add('ok'); cur++; AU.sfx('pick'); mark();
        if (cur >= step.seq.length) ctx.ok(step.after);
      } else { b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 600); ctx.bad('這一列是 ID ' + r[0] + '，不是 ID ' + step.seq[cur].id + '。查表只看編號。'); }
    } }, h('span.mono', 'ID ' + r[0]), h('span', { html: vecH(r[1]) }));
    tbl.append(b); return b;
  });
  mark();
  return { solve() { let guard = 0; while (cur < step.seq.length && guard++ < 20) { const k = rows.findIndex((r) => r[0] === step.seq[cur].id); btns[k].click(); } } };
};

// autoregressive generation: pick the next token a few times
NB.R.autoreg = (body, step, ctx) => {
  nbHead(body, step);
  const ctxEl = h('div.ar-ctx'), bars = h('div.ar-bars'), info = h('div.note');
  body.append(h('div.kicker', '目前的前文'), ctxEl, h('div.kicker', '下一個 token 的機率'), bars, info);
  const toks = step.start.slice();
  let round = 0;
  const draw = () => {
    ctxEl.innerHTML = '';
    toks.forEach((t, i) => ctxEl.append(h('span.tok' + (i >= step.start.length ? '.c2' : '.c1'), t)));
    ctxEl.append(h('span.tok.ar-next', '？'));
    bars.innerHTML = '';
    if (round >= step.rounds.length) { bars.append(h('div.note', '（示範到這裡。真正的模型會一直重複，直到輸出結束符號。）')); return; }
    info.textContent = '第 ' + (round + 1) + ' / ' + step.rounds.length + ' 步：點一個候選 token，把它接回前文。';
    step.rounds[round].forEach((c) => {
      bars.append(h('button.ar-bar', { onclick: () => { toks.push(c[0]); round++; AU.sfx('pick'); draw(); if (round >= step.rounds.length) { info.textContent = ''; ctx.ok(step.after); } } },
        h('span.ar-t', c[0]), h('span.ar-track', h('i', { style: { width: Math.round(c[1] * 100) + '%' } })), h('span.mono', c[1].toFixed(2))));
    });
  };
  draw();
  return { solve() { let guard = 0; while (round < step.rounds.length && guard++ < 20) $('.ar-bar', bars).click(); } };
};

// one vector through three learned matrices -> Q, K, V
NB.R.qkv = (body, step, ctx) => {
  nbHead(body, step);
  const defs = [
    { k: 'Q', cls: 'q', W: [[1, 0], [1, 1]], role: '我要找什麼' },
    { k: 'K', cls: 'k', W: [[0, 1], [1, 0]], role: '我能被怎麼比對' },
    { k: 'V', cls: 'v', W: [[2, 0], [1, 1]], role: '被參考時交出的內容' }
  ];
  const hv = [2, 1];
  const mul = (W) => [hv[0] * W[0][0] + hv[1] * W[1][0], hv[0] * W[0][1] + hv[1] * W[1][1]];
  const done = new Set();
  const grid = h('div.qkv-grid');
  body.append(h('p', { html: '同一個輸入 <b>h</b> = ' + vecH(hv) + '，分別送進三台機器。點每一台看看結果（省略了偏置、正規化與位置處理）。' }), grid);
  const btns = defs.map((d) => {
    const out = h('div.qkv-out', '？');
    const b = h('button.qkv-m.' + d.cls, { onclick: () => {
      const r = mul(d.W);
      out.innerHTML = d.k + ' = ' + vecH(r, d.cls);
      done.add(d.k); AU.sfx('compute', done.size);
      b.classList.add('on');
      if (done.size === 3) ctx.ok(step.after);
    } }, h('div.qkv-name', 'W', h('sub', d.k)), h('div', { html: matH(d.W) }), h('div.note', d.role), out);
    grid.append(b); return b;
  });
  return { solve() { btns.forEach((b) => b.click()); } };
};

// mix two value vectors with attention weights
NB.R.attnmix = (body, step, ctx) => {
  nbHead(body, step);
  const v1 = [2, 0], v2 = [0, 4];
  let w = 0.5, locked = false;
  const out = h('div.readout'), bar = h('div.mix-bar', h('i.a'), h('i.b'));
  const sl = h('input', { type: 'range', min: 0, max: 100, step: 5, value: 50, id: 'nb-mix', 'aria-label': '第一個來源的權重' });
  const o1 = h('output'), o2 = h('output');
  body.append(
    h('div.row', h('span', { html: 'v₁ = ' + vecH(v1, 'v') }), h('span', { html: 'v₂ = ' + vecH(v2, 'v') })),
    h('div.slider-row', h('label', { for: 'nb-mix' }, '權重 w₁'), sl, o1), bar,
    h('div.row', h('span.note', 'w₂ = 1 − w₁ ='), o2),
    h('div.card', h('div.kicker', 'Attention 輸出 = w₁·v₁ + w₂·v₂'), out));
  const draw = () => {
    const a = w, b = 1 - w;
    o1.textContent = a.toFixed(2); o2.textContent = b.toFixed(2);
    $('.a', bar).style.width = a * 100 + '%'; $('.b', bar).style.width = b * 100 + '%';
    out.innerHTML = vecH([(a * v1[0] + b * v2[0]).toFixed(2), (a * v1[1] + b * v2[1]).toFixed(2)], 'o');
  };
  sl.addEventListener('input', () => { if (locked) return; w = Number(sl.value) / 100; draw(); });
  const check = () => {
    if (locked) return;
    if (Math.abs(w - step.target) < 0.001) { locked = true; sl.disabled = true; ctx.ok(step.after); }
    else ctx.bad('現在的輸出不是 ' + step.goal + '。想想：第一個數字只來自 v₁，第二個數字只來自 v₂。');
  };
  ctx.primary('就是這個比例', check);
  draw();
  return { solve() { sl.value = String(Math.round(step.target * 100)); w = step.target; draw(); check(); } };
};

// KV cache size calculator
NB.R.kvsize = (body, step, ctx) => {
  nbHead(body, step);
  const P = { L: 24, H: 16, d: 64, b: 2, T: 1024 };
  const defs = [
    { k: 'L', name: '層數 L', vals: [12, 24, 32, 48, 80] },
    { k: 'H', name: 'KV head 數 H<sub>kv</sub>', vals: [4, 8, 16, 32] },
    { k: 'd', name: '每頭維度 d<sub>head</sub>', vals: [64, 128] },
    { k: 'b', name: '每個數值的位元組 b', vals: [1, 2, 4] },
    { k: 'T', name: 'token 數 T', vals: [512, 1024, 4096, 8192] }
  ];
  const out = h('div.card');
  const human = (x) => (x >= 1073741824 ? (x / 1073741824).toFixed(2).replace(/\.?0+$/, '') + ' GiB' : x >= 1048576 ? (x / 1048576).toFixed(1).replace(/\.0$/, '') + ' MiB' : (x / 1024).toFixed(0) + ' KiB');
  let stage = 0, locked = false;
  const goalEl = h('p.q');
  body.append(h('p', { html: '容量 ≈ <code>2 × B × L × T × H<sub>kv</sub> × d<sub>head</sub> × b</code>（前面的 2 是 K、V 各一份；這裡 B = 1）' }));
  const segs = {};
  defs.forEach((d) => {
    const seg = h('div.seg');
    d.vals.forEach((v) => seg.append(h('button' + (P[d.k] === v ? '.on' : ''), { onclick: () => { if (locked) return; P[d.k] = v; $$('button', seg).forEach((x) => x.classList.toggle('on', x.textContent === String(v))); AU.sfx('tap'); draw(); } }, String(v))));
    segs[d.k] = seg;
    body.append(h('div.kv-row', h('label', { html: d.name }), seg));
  });
  body.append(out, goalEl);
  const perTok = () => 2 * P.L * P.H * P.d * P.b;
  const draw = () => {
    out.innerHTML = '<div class="kicker">每個 token 跨所有層的 KV</div><div class="readout">' + perTok().toLocaleString('en-US') + ' bytes = ' + human(perTok()) + '</div><div class="kicker" style="margin-top:6px">' + P.T + ' 個 token 的 KV Cache</div><div class="readout">' + human(perTok() * P.T) + '</div>';
  };
  const goals = step.goals;
  const showGoal = () => { goalEl.innerHTML = '任務 ' + (stage + 1) + '／' + goals.length + '：' + goals[stage].q; };
  const check = () => {
    if (locked) return;
    const g = goals[stage];
    if (g.test(P, perTok())) {
      stage++;
      if (stage >= goals.length) { locked = true; ctx.ok(step.after); }
      else { AU.sfx('pick'); ctx.note('<b>達成！</b> ' + g.ok, 'ok'); showGoal(); }
    } else ctx.bad(g.bad || '還沒達到這個任務的條件，再調調看。');
  };
  ctx.primary('確認', check);
  draw(); showGoal();
  return { solve() { let guard = 0; while (!locked && guard++ < 9) { const g = goals[stage]; Object.assign(P, g.set); defs.forEach((d) => $$('button', segs[d.k]).forEach((x) => x.classList.toggle('on', x.textContent === String(P[d.k])))); draw(); check(); } } };
};

// ---- small figures ----
FIG.matmul = (el) => {
  el.innerHTML = '<div class="row" style="gap:14px"><span>h = ' + vecH([2, 1]) + '</span><span>W = ' + matH([[1, 2], [3, 4]]) + '</span></div>';
};
FIG.mask4 = (el, step) => {
  const toks = step.toks || ['我', '喜歡', '喝', '茶'];
  const g = h('div.cells', { style: { gridTemplateColumns: 'auto repeat(' + toks.length + ', auto)' } });
  g.append(h('div.cell.hd', 'Q＼K'));
  toks.forEach((t) => g.append(h('div.cell.hd', t)));
  toks.forEach((t, r) => { g.append(h('div.cell.hd', t)); toks.forEach((_, c) => g.append(h('div.cell' + (c <= r ? '.good' : '.off'), c <= r ? '0' : '−∞'))); });
  el.append(g);
};
FIG.layer = (el) => {
  const W = 620, H = 150, s = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, role: 'img', 'aria-label': '一層 Transformer 的資料流' });
  const boxes = [['hᵢ', 10, '#fff'], ['Qᵢ Kᵢ Vᵢ', 110, '#c9d6f5'], ['Attention', 240, '#fbdcc0'], ['FFN', 380, '#cdebd4'], ['hᵢ₊₁', 490, '#fff']];
  boxes.forEach((b, i) => {
    const w = i === 2 ? 120 : i === 1 ? 110 : 90;
    s.append(sv('rect', { x: b[1], y: 50, width: w, height: 50, rx: 8, fill: b[2], stroke: '#1b2340', 'stroke-width': 2 }));
    s.append(sv('text', { x: b[1] + w / 2, y: 81, 'text-anchor': 'middle', 'font-size': 17, 'font-weight': 700, fill: '#1b2340', 'font-family': 'JetBrains Mono, monospace', text: b[0] }));
    if (i < boxes.length - 1) { const x1 = b[1] + w + 2, x2 = boxes[i + 1][1] - 3; s.append(sv('path', { d: 'M' + x1 + ' 75 H' + x2 + ' m-7 -6 l7 6 l-7 6', fill: 'none', stroke: '#1b2340', 'stroke-width': 2 })); }
  });
  s.append(sv('path', { d: 'M55 50 V22 H535 V50 m-6 -8 l6 8 l6 -8', fill: 'none', stroke: '#55608a', 'stroke-width': 2, 'stroke-dasharray': '5 4' }));
  s.append(sv('text', { x: 295, y: 16, 'text-anchor': 'middle', 'font-size': 13, fill: '#55608a', text: '殘差連接：把原本的表示加回來' }));
  s.append(sv('text', { x: 165, y: 122, 'text-anchor': 'middle', 'font-size': 13, fill: '#55608a', text: '由 hᵢ 投影出來' }));
  s.append(sv('text', { x: 300, y: 122, 'text-anchor': 'middle', 'font-size': 13, fill: '#55608a', text: 'token 之間交換資訊' }));
  s.append(sv('text', { x: 425, y: 122, 'text-anchor': 'middle', 'font-size': 13, fill: '#55608a', text: '各自再加工' }));
  s.append(sv('text', { x: 535, y: 122, 'text-anchor': 'middle', 'font-size': 13, fill: '#55608a', text: '下一層的輸入' }));
  el.append(s);
};
