// ===== notebook: runs one station as a sequence of interactive steps =====
const FIG = {};
const TAGC = ['#5b7fd6', '#ec8b3c', '#4fa866', '#d9544f', '#8a5fc7', '#2a9d9d', '#b8860b', '#6b7280'];
const NB = {
  R: {}, prog: {}, cur: null,
  starSvg(on) { return '<span class="' + (on ? 'on' : 'off') + '">' + IC.star + '</span>'; },

  run(st, opts) {
    opts = opts || {};
    return new Promise((resolve) => {
      const key = opts.key || st.id;
      let pr = this.prog[key];
      if (!pr || pr.i >= st.steps.length) pr = this.prog[key] = { i: 0, miss: 0 };
      let result = { done: false };
      const dots = h('div.dots');
      const body = h('div.sheet-body.nb');
      const fb = h('div.fb', { hidden: true, 'aria-live': 'polite' });
      const links = h('div.foot-links');
      const primary = h('button.btn', { id: 'nb-primary' }, '繼續');
      const foot = h('div.sheet-foot', fb, h('div.foot-row', links, primary));
      const head = h('div.sheet-head', h('h2', st.title, st.sub ? h('span.sub', st.sub) : null), dots);
      const sheet = h('div.sheet', { role: 'dialog', 'aria-label': st.title }, head, body, foot);
      const m = UI.modal(sheet, { onClose: () => { NB.cur = null; resolve(result); } });
      head.append(h('button.x', { html: IC.x, 'aria-label': '先離開（進度會保留）', title: '先離開（進度會保留）', onclick: () => m.close() }));
      AU.sfx('page');

      const setPrimary = (label, fn, enabled) => {
        primary.textContent = label; primary.onclick = () => { AU.init(); fn(); };
        primary.disabled = enabled === false; primary.hidden = false;
      };
      const finish = () => {
        const stars = pr.miss <= 1 ? 3 : pr.miss <= 4 ? 2 : 1;
        result = { done: true, stars, miss: pr.miss };
        delete this.prog[key];
        body.innerHTML = ''; fb.hidden = true; links.innerHTML = '';
        dots.innerHTML = '';
        const gains = (st.codex || []).map((id) => CODEX[id]).filter(Boolean);
        body.append(
          h('div.center',
            h('div.kicker', opts.kicker || '站點完成'),
            h('h3', st.title),
            h('div.stars', { html: [0, 1, 2].map((i) => this.starSvg(i < stars)).join('') }),
            h('p.note', stars === 3 ? '漂亮！幾乎沒有失誤。' : stars === 2 ? '不錯！重玩這一站可以挑戰三顆星。' : '完成了！之後可以回來重玩拿更多星星。')),
          gains.length ? h('div.gain', h('div.kicker', '寫進筆記本的新觀念'), gains.map((c) => h('div.card', h('b', c.t), c.en ? h('span.note', '　' + c.en) : null, h('div', { html: c.d })))) : null);
        setPrimary(opts.doneLabel || '收進筆記本', () => m.close());
        AU.sfx('star');
        NB.cur = { api: { solve: () => m.close() }, done: true, primary };
      };
      const show = () => {
        const i = pr.i, step = st.steps[i];
        body.innerHTML = ''; body.scrollTop = 0; fb.hidden = true; links.innerHTML = ''; primary.hidden = true;
        dots.innerHTML = '';
        st.steps.forEach((_, j) => dots.append(h('i' + (j < i ? '.done' : j === i ? '.cur' : ''))));
        let solved = false, stepMiss = 0, api = null;
        const next = () => { pr.i++; AU.sfx('page'); if (pr.i >= st.steps.length) finish(); else show(); };
        const refreshLinks = () => {
          links.innerHTML = '';
          if (solved) return;
          if (step.hint && stepMiss >= 1) links.append(h('button', { onclick: () => ctx.note('<b>提示：</b>' + step.hint, 'hint') }, '給我提示'));
          if (api && api.solve && stepMiss >= 3) links.append(h('button', { onclick: () => { pr.miss += 1; api.solve(); } }, '看解答'));
        };
        const ctx = {
          step, body, next,
          ok(html) {
            if (solved) return; solved = true; AU.sfx('ok');
            const msg = html != null ? html : step.after;
            fb.className = 'fb ok'; fb.innerHTML = '<b>答對了！</b>' + (msg ? ' ' + msg : ''); fb.hidden = false;
            links.innerHTML = '';
            setPrimary(i === st.steps.length - 1 ? '完成這一站' : '下一步', next);
            setTimeout(() => { try { fb.scrollIntoView({ block: 'nearest' }); } catch (e) { /* older engines */ } }, 30);
          },
          bad(html) {
            if (solved) return; stepMiss++; pr.miss++; AU.sfx('bad');
            fb.className = 'fb bad'; fb.innerHTML = html || '還不對，再想想。'; fb.hidden = false;
            refreshLinks();
          },
          note(html, kind) { fb.className = 'fb ' + (kind || 'hint'); fb.innerHTML = html; fb.hidden = false; },
          clearNote() { fb.hidden = true; },
          primary: setPrimary,
          isSolved: () => solved
        };
        const R = NB.R[step.t];
        if (!R) { body.append(h('p', '（缺少元件 ' + step.t + '）')); setPrimary('繼續', next); api = { solve: next }; }
        else api = R(body, step, ctx) || {};
        NB.cur = { api, ctx, step, st, isSolved: () => solved, next, primary, miss: () => pr.miss };
      };
      show();
    });
  }
};

function nbHead(body, step) {
  if (step.kicker) body.append(h('div.kicker', step.kicker));
  if (step.title) body.append(h('h3', { html: step.title }));
  if (step.pre) body.append(h('div', { html: step.pre }));
  if (step.fig) nbFig(body, step);
  if (step.q) body.append(h('p.q', { html: step.q }));
}
function nbFig(body, step) {
  const el = h('div.fig');
  body.append(el);
  const f = typeof step.fig === 'function' ? step.fig : FIG[step.fig];
  if (f) { try { f(el, step); } catch (e) { console.error(e); } }
  if (step.cap) body.append(h('div.cap', { html: step.cap }));
}
const joinMsg = (a, b) => (a ? a + ' ' : '') + (b || '');
function parseNum(s) {
  s = String(s).trim().replace(/[，,]/g, '').replace(/％|%/g, '').replace('／', '/');
  if (!s) return NaN;
  const fr = /^(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/.exec(s);
  if (fr) return parseFloat(fr[1]) / parseFloat(fr[2]);
  if (!/^-?\d*\.?\d+$/.test(s)) return NaN;
  return parseFloat(s);
}

// ---- info ----
NB.R.info = (body, step, ctx) => {
  if (step.kicker) body.append(h('div.kicker', step.kicker));
  if (step.title) body.append(h('h3', { html: step.title }));
  if (step.html) body.append(h('div', { html: step.html }));
  if (step.fig) nbFig(body, step);
  if (step.html2) body.append(h('div', { html: step.html2 }));
  ctx.primary(step.btn || '繼續', ctx.next);
  return { solve: ctx.next };
};

// ---- choice: opts = [[text, ok(0/1), why]] ----
NB.R.choice = (body, step, ctx) => {
  nbHead(body, step);
  const opts = (step.fixed ? step.opts.slice() : shuffled(step.opts)).map((o) => ({ text: o[0], ok: !!o[1], why: o[2] }));
  const box = h('div.opts');
  body.append(box);
  const btns = opts.map((o, i) => { const b = h('button.opt-b', h('span.k', 'ABCDEF'[i]), h('span', { html: o.text })); box.append(b); return b; });
  let locked = false;
  if (!step.multi) {
    btns.forEach((b, i) => {
      b.onclick = () => {
        if (locked) return;
        if (opts[i].ok) {
          locked = true; b.classList.add('ok');
          btns.forEach((x, j) => { if (j !== i) x.disabled = true; });
          ctx.ok(joinMsg(opts[i].why, step.after));
        } else { b.classList.add('no', 'shake'); ctx.bad(opts[i].why || '這個選項不對，再想想。'); }
      };
    });
    return { solve() { const k = opts.findIndex((o) => o.ok); if (k >= 0) btns[k].click(); } };
  }
  const sel = new Set();
  btns.forEach((b, i) => { b.onclick = () => { if (locked) return; if (sel.has(i)) sel.delete(i); else sel.add(i); b.classList.toggle('sel', sel.has(i)); AU.sfx('tap'); }; });
  const check = () => {
    if (locked) return;
    const missing = opts.some((o, i) => o.ok && !sel.has(i));
    const extra = opts.findIndex((o, i) => !o.ok && sel.has(i));
    if (!missing && extra < 0) {
      locked = true;
      btns.forEach((b, i) => { b.classList.remove('sel'); if (opts[i].ok) b.classList.add('ok'); else b.disabled = true; });
      ctx.ok(step.after);
    } else if (extra >= 0) {
      btns[extra].classList.add('shake'); setTimeout(() => btns[extra].classList.remove('shake'), 600);
      ctx.bad(opts[extra].why || '有選到不該選的，再檢查一次。');
    } else ctx.bad('還有該選的沒選到（這題可以複選）。');
  };
  ctx.primary('檢查答案', check);
  return { solve() { btns.forEach((b, i) => { if (opts[i].ok !== sel.has(i)) b.click(); }); check(); } };
};

// ---- order: items listed in the correct order ----
NB.R.order = (body, step, ctx) => {
  nbHead(body, step);
  const n = step.items.length;
  const idx = shuffled(step.items.map((_, i) => i));
  if (n > 1 && idx.every((v, i) => v === i)) idx.reverse();
  const seq = [];
  const pool = h('div.pool'), out = h('div.seq');
  body.append(h('div.note', '點下面的卡片，依序排進虛線框；點框裡的卡片可以拿回來。'), out, pool);
  let locked = false;
  const chips = {};
  const draw = () => {
    out.innerHTML = '';
    if (!seq.length) out.append(h('div.seq-empty', '（依正確順序點選卡片）'));
    seq.forEach((id, pos) => {
      out.append(h('button.tok' + (locked ? '.ok' : ''), { onclick: () => { if (locked) return; seq.splice(pos, 1); AU.sfx('drop'); draw(); } }, h('span.n', String(pos + 1)), h('span', { html: step.items[id] })));
    });
    idx.forEach((id) => chips[id].classList.toggle('used', seq.indexOf(id) >= 0));
    ctx.primary('檢查順序', check, seq.length === n);
  };
  const check = () => {
    if (locked) return;
    const firstBad = seq.findIndex((id, pos) => id !== pos);
    if (firstBad < 0) { locked = true; draw(); ctx.ok(step.after); return; }
    Array.from(out.children).forEach((el, pos) => { if (pos >= firstBad) el.classList.add('no'); else el.classList.add('ok'); });
    ctx.bad(step.why || ('前 ' + firstBad + ' 個是對的；從第 ' + (firstBad + 1) + ' 個開始需要調整。'));
    setTimeout(() => { if (!locked) { seq.length = firstBad; draw(); } }, 900);
  };
  idx.forEach((id) => {
    chips[id] = h('button.tok', { html: step.items[id], onclick: () => { if (locked || seq.indexOf(id) >= 0) return; seq.push(id); AU.sfx('pick'); draw(); } });
    pool.append(chips[id]);
  });
  draw();
  return { solve() { if (locked) return; seq.length = 0; for (let i = 0; i < n; i++) seq.push(i); draw(); check(); } };
};

// ---- match: pairs = [[left, right]] ----
NB.R.match = (body, step, ctx) => {
  nbHead(body, step);
  const n = step.pairs.length;
  const rightOrder = shuffled(step.pairs.map((_, i) => i));
  const grid = h('div.match');
  body.append(h('div.note', '先點左邊，再點右邊配成一對。'), grid);
  const L = [], Rr = {};
  let pickL = -1, pickR = -1, done = 0;
  const tryPair = () => {
    if (pickL < 0 || pickR < 0) return;
    const l = pickL, r = pickR;
    pickL = pickR = -1;
    L[l].classList.remove('sel'); Rr[r].classList.remove('sel');
    const same = l === r || (step.pairs[l][1] === step.pairs[r][1]);
    if (same && !Rr[r].classList.contains('done')) {
      const c = TAGC[done % TAGC.length];
      [L[l], Rr[r]].forEach((el) => { el.classList.add('done'); el.style.borderColor = c; el.style.boxShadow = '0 3px 0 ' + c; el.prepend(h('span.tag', { style: { background: c } }, String(done + 1))); });
      done++; AU.sfx('pick');
      if (done === n) ctx.ok(step.after);
    } else {
      [L[l], Rr[r]].forEach((el) => { el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 600); });
      ctx.bad(step.why || '這一對不合，再看看兩邊的描述。');
    }
  };
  for (let row = 0; row < n; row++) {
    const li = row, ri = rightOrder[row];
    const lb = h('button.tok', { html: step.pairs[li][0], onclick: () => { if (lb.classList.contains('done')) return; if (pickL >= 0) L[pickL].classList.remove('sel'); pickL = li; lb.classList.add('sel'); AU.sfx('tap'); tryPair(); } });
    const rb = h('button.tok', { html: step.pairs[ri][1], onclick: () => { if (rb.classList.contains('done')) return; if (pickR >= 0) Rr[pickR].classList.remove('sel'); pickR = ri; rb.classList.add('sel'); AU.sfx('tap'); tryPair(); } });
    L[li] = lb; Rr[ri] = rb;
    grid.append(lb, rb);
  }
  return { solve() { for (let i = 0; i < n; i++) { if (!L[i].classList.contains('done')) { L[i].click(); Rr[i].click(); } } } };
};

// ---- bucket: items = [[text, bucketIndex, why]] ----
NB.R.bucket = (body, step, ctx) => {
  nbHead(body, step);
  const items = shuffled(step.items);
  let i = 0;
  const card = h('div.card.bucket-card');
  const btns = h('div.buckets');
  const prog = h('div.bucket-prog');
  const doneList = h('div.bucket-done');
  body.append(card, btns, prog, doneList);
  const draw = () => {
    if (i >= items.length) { card.innerHTML = '全部分類完成'; btns.hidden = true; prog.textContent = ''; return; }
    card.innerHTML = items[i][0];
    prog.textContent = (i + 1) + ' / ' + items.length;
  };
  const choose = (b) => {
    if (i >= items.length) return;
    const it = items[i];
    if (it[1] === b) {
      doneList.prepend(h('div', h('b', { style: { color: TAGC[b % TAGC.length] } }, step.buckets[b].replace(/<[^>]+>/g, '')), h('span', { html: it[0] + (it[2] ? '<span class="note">　' + it[2] + '</span>' : '') })));
      i++; AU.sfx('pick'); ctx.clearNote(); draw();
      if (i >= items.length) ctx.ok(step.after);
    } else {
      card.classList.add('shake'); setTimeout(() => card.classList.remove('shake'), 600);
      ctx.bad(it[3] || it[2] || ('不是「' + step.buckets[b].replace(/<[^>]+>/g, '') + '」，再想想。'));
    }
  };
  step.buckets.forEach((name, b) => btns.append(h('button.btn', { html: name, onclick: () => choose(b) })));
  draw();
  return { solve() { let guard = 0; while (i < items.length && guard++ < 99) choose(items[i][1]); } };
};

// ---- fill: html with {0} {1}..., blanks = [{a, tol, alt}] ----
NB.R.fill = (body, step, ctx) => {
  nbHead(body, step);
  const html = step.html.replace(/\{(\d+)\}/g, (_, k) => '<input class="num" id="nb-in-' + k + '" data-i="' + k + '" inputmode="decimal" autocomplete="off" aria-label="第 ' + (Number(k) + 1) + ' 格">');
  const box = h('div.calc', { html });
  body.append(box);
  if (step.post) body.append(h('div', { html: step.post }));
  const ins = $$('input.num', box);
  let locked = false;
  const good = (inp) => {
    const b = step.blanks[Number(inp.dataset.i)];
    const v = parseNum(inp.value);
    if (isNaN(v)) return false;
    const tol = b.tol == null ? 0.011 : b.tol;
    if (Math.abs(v - b.a) <= tol) return true;
    return (b.alt || []).some((x) => Math.abs(v - x) <= tol);
  };
  const check = () => {
    if (locked) return;
    let all = true, empty = false;
    ins.forEach((inp) => { const ok = good(inp); if (!inp.value.trim()) empty = true; inp.classList.toggle('ok', ok); inp.classList.toggle('no', !ok && !!inp.value.trim()); if (!ok) all = false; });
    if (all) { locked = true; ins.forEach((inp) => { inp.readOnly = true; }); ctx.ok(step.after); }
    else if (empty) ctx.note('還有空格沒填。', 'hint');
    else ctx.bad(step.why || '標紅的格子再算一次。');
  };
  ins.forEach((inp) => inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if (ctx.isSolved()) ctx.next(); else check(); } }));
  ctx.primary('檢查答案', check);
  return { solve() { ins.forEach((inp) => { inp.value = String(step.blanks[Number(inp.dataset.i)].a); }); check(); } };
};

// ---- grid: toggle cells; on(r,c) target; dis(r,c) fixed-off ----
NB.R.grid = (body, step, ctx) => {
  nbHead(body, step);
  const R = step.rows.length, C = step.cols.length;
  const wrap = h('div.tw');
  const g = h('div.cells', { style: { gridTemplateColumns: 'auto repeat(' + C + ', auto)' } });
  wrap.append(g); body.append(wrap);
  const state = [], cells = [];
  let locked = false;
  g.append(h('div.cell.hd', step.corner || ''));
  step.cols.forEach((c) => g.append(h('div.cell.hd', { html: c })));
  for (let r = 0; r < R; r++) {
    g.append(h('div.cell.hd', { html: step.rows[r] }));
    state.push([]); cells.push([]);
    for (let c = 0; c < C; c++) {
      const dis = step.dis && step.dis(r, c);
      const el = h('button.cell' + (dis ? '.off' : ''), { 'aria-label': '列 ' + (r + 1) + ' 欄 ' + (c + 1) });
      if (step.text) el.textContent = step.text(r, c) || '';
      state[r][c] = false; cells[r][c] = el;
      if (dis) el.disabled = true;
      else el.onclick = () => { if (locked) return; state[r][c] = !state[r][c]; el.classList.toggle('on', state[r][c]); el.classList.remove('bad', 'good'); AU.sfx('tap'); };
      g.append(el);
    }
  }
  if (step.post) body.append(h('div', { html: step.post }));
  const check = () => {
    if (locked) return;
    let wrong = 0;
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const want = !!step.on(r, c), el = cells[r][c];
      el.classList.remove('bad', 'good');
      if (state[r][c] !== want) { wrong++; if (state[r][c]) el.classList.add('bad'); }
    }
    if (!wrong) { locked = true; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (state[r][c]) { cells[r][c].classList.remove('on'); cells[r][c].classList.add('good'); } ctx.ok(step.after); }
    else ctx.bad(step.why || ('還有 ' + wrong + ' 格不對（紅色是不該亮的；也可能有該亮的沒亮）。'));
  };
  ctx.primary('檢查', check);
  return { solve() { if (locked) return; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) { const want = !!step.on(r, c); if (state[r][c] !== want && !cells[r][c].disabled) cells[r][c].click(); } check(); } };
};

// ---- pick: choose k of the items; correct = [indices] ----
NB.R.pick = (body, step, ctx) => {
  nbHead(body, step);
  const box = h('div.pool');
  body.append(box);
  const sel = new Set();
  let locked = false;
  const btns = step.items.map((it, i) => {
    const b = h('button.tok' + (it.c ? '.' + it.c : ''), { onclick: () => {
      if (locked) return;
      if (sel.has(i)) sel.delete(i); else { if (sel.size >= step.k) return; sel.add(i); }
      b.classList.toggle('sel', sel.has(i)); AU.sfx('tap');
      ctx.primary('確定（' + sel.size + '/' + step.k + '）', check, sel.size === step.k);
    } }, h('span', { html: it.t }), it.s ? h('span.n', it.s) : null);
    box.append(b); return b;
  });
  if (step.post) body.append(h('div', { html: step.post }));
  const check = () => {
    if (locked) return;
    const want = new Set(step.correct);
    const ok = sel.size === want.size && Array.from(sel).every((i) => want.has(i));
    if (ok) { locked = true; btns.forEach((b, i) => { b.classList.remove('sel'); if (want.has(i)) b.classList.add('ok'); }); ctx.ok(step.after); }
    else {
      Array.from(sel).forEach((i) => { if (!want.has(i)) { btns[i].classList.add('shake'); setTimeout(() => btns[i].classList.remove('shake'), 600); } });
      ctx.bad(step.why || '有幾個選得不對，再比較一下數值。');
    }
  };
  ctx.primary('確定（0/' + step.k + '）', check, false);
  return { solve() { if (locked) return; Array.from(sel).forEach((i) => btns[i].click()); step.correct.forEach((i) => btns[i].click()); check(); } };
};
