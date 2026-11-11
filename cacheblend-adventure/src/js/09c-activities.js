// ===== activities for worlds 4-5 =====
// W4: act as the retriever. Carry the top-k chunks to the prompt desk.
ACT.fetch = (ctx, o) => {
  const lv = ctx.lv, y = o.y || 0, K = o.k || 2;
  let solved = ctx.done(o.id), fails = 0;
  const carried = [];
  const books = o.books.map((b, i) => {
    B.box(b.x, y + 0.45, b.z, 0.62, 0.9, 0.62, 0x6a4a3a, { geo: 'cyl' });
    B.col(b.x - 0.4, b.x + 0.4, y, y + 1.2, b.z - 0.4, b.z + 0.4, { solid: true, walk: false });
    const g = new THREE.Group();
    const cover = mesh('box', b.color); cover.scale.set(0.8, 1.05, 0.24); cover.castShadow = true; g.add(cover);
    const pages = mesh('box', COL.paper); pages.scale.set(0.7, 0.95, 0.27); pages.position.x = 0.03; g.add(pages);
    const t = textTex(b.id, { px: 40, bg: '#1b2340', color: '#f4f6fb', border: '#f4f6fb', pad: 8, radius: 10, font: 'mono' });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t.tex, transparent: true, depthWrite: false }));
    sp.scale.set(0.6 * t.aspect, 0.6, 1); t.onRedraw = (a) => sp.scale.set(0.6 * a, 0.6, 1); sp.position.y = 1.05; sp.userData.own = true; g.add(sp);
    g.position.set(b.x, y + 1.6, b.z); lv.group.add(g);
    const bk = Object.assign({ g, home: new THREE.Vector3(b.x, y + 1.6, b.z), ph: i * 1.1 }, b);
    bk.inter = { x: b.x, y, z: b.z, r: 1.9, noAuto: false, acts: () => {
      if (solved || carried.indexOf(bk) >= 0) return null;
      if (carried.length >= K) return [{ label: '手上已經有 ' + K + ' 塊了（top-k = ' + K + '）', fn: () => UI.toast('先把手上的區塊交給提示桌，或在提示桌按「全部放回去」。', 'warn') }];
      return [{ label: '拿起區塊 ' + bk.id, fn: () => { carried.push(bk); AU.sfx('pick'); E.fx.burst(bk.g.position.x, bk.g.position.y, bk.g.position.z, bk.color, 12, 2.5, 0.5); } }];
    } };
    lv.inter.push(bk.inter);
    return bk;
  });
  // prompt desk
  B.box(o.desk.x, y + 0.5, o.desk.z, 3.2, 1.0, 1.5, 0x7a5a3a, { solid: true, walk: false });
  B.box(o.desk.x, y + 1.03, o.desk.z, 3.4, 0.08, 1.7, 0x9a7448);
  B.label('提示桌 Prompt', o.desk.x, y + 2.1, o.desk.z, { h: 0.55, px: 26 });
  // the oracle's question board
  B.box(o.board.x, y + 2.1, o.board.z, 7.2, 2.6, 0.2, COL.ink);
  B.box(o.board.x - 3.2, y + 0.5, o.board.z, 0.24, 1.0, 0.24, COL.ink, { solid: true, walk: false }); B.box(o.board.x + 3.2, y + 0.5, o.board.z, 0.24, 1.0, 0.24, COL.ink, { solid: true, walk: false });
  B.label('問題：' + o.question, o.board.x, y + 2.5, o.board.z + 0.14, { h: 0.62, px: 30, bg: null, color: '#f4f6fb', depthTest: false });
  const ans = B.label('神諭 LLM：……', o.board.x, y + 1.6, o.board.z + 0.14, { h: 0.52, px: 26, bg: null, color: '#ffd166', depthTest: false });
  const setAnswer = (txt) => {
    const t = textTex(txt, { px: 26, bg: null, color: '#ffd166' });
    ans.material.map.dispose(); ans.material.map = t.tex; ans.scale.set(0.52 * t.aspect, 0.52, 1); t.onRedraw = (a) => ans.scale.set(0.52 * a, 0.52, 1);
  };
  const ids = () => carried.map((b) => b.id).sort().join('、');
  const putBack = () => { carried.forEach((b) => b.g.position.copy(b.home)); carried.length = 0; };
  const submit = async () => {
    const got = carried.map((b) => b.id).sort().join('');
    const want = o.answer.slice().sort().join('');
    if (got === want) {
      solved = true; AU.sfx('open'); UI.actHud(null);
      carried.forEach((b, i) => { b.g.position.set(o.board.x - 1 + i * 2, y + 3.9, o.board.z + 0.3); E.fx.burst(b.g.position.x, b.g.position.y, b.g.position.z, b.color, 20, 3.5, 0.9); });
      carried.length = 0;
      setAnswer('神諭 LLM：' + o.reply);
      ctx.complete(o.id, fails === 0 ? 3 : fails === 1 ? 2 : 1);
      await UI.say(o.win);
      return;
    }
    fails++; AU.sfx('bad');
    const miss = o.answer.filter((id) => carried.every((b) => b.id !== id));
    setAnswer('神諭 LLM：' + (o.wrong[miss[0]] || '資料不夠，我答不出來。'));
    await UI.say([['rag', (carried.length < K ? '檢索器要取回 top-' + K + '，也就是 ' + K + ' 個區塊。' : '') + '神諭說：「' + (o.wrong[miss[0]] || '資料不夠。') + '」'], ['kv', fails >= 2 ? '提示：每本書靠近時都會顯示它和問題的 <b>L2 距離</b>。距離<b>越小</b>代表越相關，挑最小的兩個。' : '靠近每本書看看它的內容和 L2 距離，再挑一次。']]);
    putBack();
  };
  lv.inter.push({ x: o.desk.x, y, z: o.desk.z + 1.2, r: 2.4, acts: () => {
    if (solved) return null;
    if (!carried.length) return [{ label: '提示桌：先去拿 ' + K + ' 個區塊', fn: () => UI.toast('走近書本，拿起和問題最相關的 ' + K + ' 個區塊再回來。', 'warn') }];
    return [{ label: '交給神諭（' + ids() + '）', fn: submit }, { label: '全部放回去', fn: () => { putBack(); AU.sfx('drop'); } }];
  } });
  ctx.anchor(o.id, o.desk.x, o.desk.z + 1.2, y);
  if (solved) setAnswer('神諭 LLM：' + o.reply);
  lv.updates.push((dt, t) => {
    books.forEach((b) => {
      const ci = carried.indexOf(b);
      if (ci >= 0) { const p = E.p.pos; b.g.position.set(p.x, E.p.model.position.y + 2.5 + ci * 1.15, p.z); b.g.rotation.y += dt * 2; }
      else if (!solved) { b.g.rotation.y = Math.sin(t * 1.2 + b.ph) * 0.5; b.g.position.y = b.home.y + Math.sin(t * 2 + b.ph) * 0.08; }
    });
    if (solved) return;
    const p = E.p.pos;
    if (Math.abs(p.x - o.cx) > o.rx || Math.abs(p.z - o.cz) > o.rz) { UI.actHud(null); return; }
    const near = books.find((b) => E.nearInter === b.inter);
    const hand = carried.length ? '手上：' + ids() : '手上沒有區塊';
    if (near) UI.actHud('<div class="opt"><div><i>區塊 ' + near.id + '</i>「' + near.text + '」</div></div><div class="row"><span class="pill">與問題的 L2 距離 ' + near.dist.toFixed(2) + '</span><span class="pill">' + hand + '</span></div>');
    else UI.actHud('問題：<b>' + o.question + '</b><br>你是<b>檢索器</b>：找出最相關的 <b>top-' + K + '</b> 區塊，拿到提示桌。<div class="row"><span class="pill">' + hand + '</span></div>');
  });
  lv.debug = lv.debug || {};
  lv.debug[o.id] = { books, carried, submit, desk: o.desk };
};

// W5: prefix-cache bridges. For each segment decide: reuse the cached KV, or compute it again.
ACT.bridge = (ctx, o) => {
  const lv = ctx.lv, L = 2.7, W = 2.8;
  const CACHED = COL.cyan, FRESH = COL.gold;
  let solved = ctx.done(o.id), fails = 0, waste = 0, busy = false;
  const mkCol = (c, z) => lv.cols.push({ x0: c.x - W / 2, x1: c.x + W / 2, y0: c.y - 0.4, y1: c.y, z0: z - L / 2, z1: z + L / 2, solid: true });
  const crossings = o.crossings.map((c) => {
    const segs = c.segs.map((sg, i) => {
      const z = c.z0 - (i + 0.5) * L;
      const m = ownBox(c.x, c.y - 0.2, z, W, 0.4, L - 0.16, 0xffffff, 'box', { transparent: true, opacity: 0.22, depthWrite: false });
      B.label(sg.name, c.x, c.y + 1.45, z, { h: 0.56, px: 26, bg: sg.bg || '#f4f6fb' });
      const s = Object.assign({ m, z, solid: false }, sg);
      if (solved) { s.solid = true; m.material.opacity = 1; m.material.transparent = false; m.material.depthWrite = true; m.material.color.setHex(sg.reuse ? CACHED : FRESH); mkCol(c, z); lv.pick.push(m); }
      return s;
    });
    B.box(c.x - 3.6, c.y + 1.2, c.z0 + 1.3, 0.16, 2.4, 0.16, COL.ink, { solid: true, walk: false });
    B.label('快取裡有　' + c.cached + '\n這次輸入　' + c.now, c.x - 3.6, c.y + 3.1, c.z0 + 1.3, { h: 1.25, px: 24, font: 'body' });
    const cr = { c, segs, next: solved ? segs.length : 0, cost: 0 };
    cr.inter = { x: c.x, y: c.y, z: c.z0 + 0.55, r: 1.7, acts: () => (busy || cr.next >= segs.length ? null : [{ label: '沿用快取', fn: () => reuse(cr) }, { label: '重新計算', fn: () => compute(cr) }]) };
    lv.inter.push(cr.inter);
    return cr;
  });
  const current = () => crossings.find((cr) => cr.next < cr.segs.length);
  const setAnchor = () => { const cr = current(); if (cr) ctx.anchor(o.id, cr.inter.x, cr.inter.z, cr.c.y); };
  const finish = async () => {
    solved = true; UI.actHud(null);
    const bad = fails + waste;
    ctx.complete(o.id, bad === 0 ? 3 : bad <= 2 ? 2 : 1);
    await UI.say(o.win);
  };
  const solidify = (cr, how) => {
    const sg = cr.segs[cr.next], c = cr.c;
    sg.solid = true;
    const mt = sg.m.material; mt.opacity = 1; mt.transparent = false; mt.depthWrite = true; mt.color.setHex(how === 'reuse' ? CACHED : FRESH); mt.needsUpdate = true;
    mkCol(c, sg.z); lv.pick.push(sg.m);
    E.fx.burst(c.x, c.y + 0.3, sg.z, how === 'reuse' ? CACHED : FRESH, 22, 3.5, 0.8);
    cr.next++;
    cr.inter.z = c.z0 - cr.next * L + 0.55;
    setAnchor();
    if (!current()) finish();
  };
  const reuse = (cr) => {
    const sg = cr.segs[cr.next];
    if (sg.reuse) { AU.sfx('ok'); UI.toast('沿用成功：到「' + sg.name + '」為止，都和快取的前綴一模一樣', 'good', 2200); solidify(cr, 'reuse'); return; }
    fails++; AU.sfx('crumble');
    const y0 = sg.m.position.y;
    sg.m.material.color.setHex(COL.rose); sg.m.material.opacity = 0.7;
    E.tween(0.7, (k) => { sg.m.position.y = y0 - k * 2.5; sg.m.rotation.z = Math.sin(k * 20) * 0.12; }, () => { sg.m.position.y = y0; sg.m.rotation.z = 0; sg.m.material.color.setHex(0xffffff); sg.m.material.opacity = 0.22; });
    UI.say([['pre', '橋面碎掉了！' + sg.why], ['kv', '這一段只能<b>重新計算</b>。']]);
  };
  const compute = (cr) => {
    const sg = cr.segs[cr.next];
    busy = true; E.lockInput = true;
    const dur = 0.5 + sg.cost * 0.32;
    let last = -1;
    E.tween(dur, (k) => { sg.m.material.opacity = 0.22 + k * 0.6; const q = Math.floor(k * 8); if (q !== last) { last = q; AU.sfx('compute', q); } UI.actHud('<b>Prefill 中…</b>　正在計算「' + sg.name + '」的 KV<div class="meter"><i style="width:' + Math.round(k * 100) + '%;background:var(--gold)"></i></div>'); }, () => {
      busy = false; E.lockInput = false; cr.cost += sg.cost;
      if (sg.reuse) { waste++; UI.toast('算好了。不過這一段和快取的前綴完全相同，其實可以直接沿用，不必花時間', 'warn', 3200); }
      solidify(cr, 'compute');
    });
  };
  setAnchor();
  lv.updates.push(() => {
    if (solved || busy) return;
    const p = E.p.pos;
    const cr = crossings.find((q) => Math.abs(p.x - q.c.x) < 7 && p.z < q.c.z0 + 5 && p.z > q.c.z0 - q.segs.length * L - 2);
    if (!cr) { UI.actHud(null); return; }
    const nx = cr.segs[cr.next];
    UI.actHud('<div class="opt"><div><i>快取裡有</i>' + cr.c.cached + '</div><div><i>這次輸入</i>' + cr.c.now + '</div></div><div class="row">' + (nx ? '<span class="pill">下一段：' + nx.name + '</span>' : '<span class="pill">過橋吧！</span>') + '<span class="pill">這座橋的 prefill 花費 ' + cr.cost + '</span></div>');
  });
  lv.debug = lv.debug || {};
  lv.debug[o.id] = { crossings, state: () => ({ busy, solved }) };
};
