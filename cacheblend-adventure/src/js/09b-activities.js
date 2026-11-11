// ===== activities for worlds 2-3 =====
function ownMat(color, o) {
  const m = new THREE.MeshLambertMaterial(Object.assign({ color }, o || {}));
  return m;
}
function ownBox(x, y, z, w, hgt, d, color, geoName, o) {
  const m = new THREE.Mesh(G(geoName || 'box'), ownMat(color, o));
  m.position.set(x, y, z); m.scale.set(w, hgt, d); m.receiveShadow = true; m.userData.own = true;
  B.lv.group.add(m);
  return m;
}
// a small pedestal you can press E at
function button3d(x, z, y, label, color) {
  B.box(x, y + 0.45, z, 0.7, 0.9, 0.7, COL.ink, { geo: 'cyl' });
  const orb = B.box(x, y + 1.15, z, 0.36, 0.36, 0.36, color || COL.gold, { geo: 'sph', basic: true, cast: false });
  B.label(label, x, y + 2.0, z, { h: 0.5, px: 24 });
  B.col(x - 0.4, x + 0.4, y, y + 1.2, z - 0.4, z + 0.4, { solid: true, walk: false });
  B.lv.anims.push((dt, t) => { orb.position.y = y + 1.15 + Math.sin(t * 3) * 0.06; });
  return orb;
}

// W2: jump on floor tiles to light the causal mask
ACT.floor = (ctx, o) => {
  const lv = ctx.lv, n = o.toks.length, S = 2.0, P2 = 2.2, y = o.y || 0;
  const OFF = 0xcfc3a0, ON = COL.gold, BAD = COL.rose, GOOD = COL.green;
  const tiles = [];
  let fails = 0, solved = ctx.done(o.id), flash = 0;
  const tx = (c) => o.cx + (c - (n - 1) / 2) * P2, tz = (r) => o.cz + (r - (n - 1) / 2) * P2;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const m = ownBox(tx(c), y + 0.1, tz(r), S, 0.2, S, OFF);
    lv.pick.push(m);
    const col = B.col(tx(c) - S / 2, tx(c) + S / 2, y - 0.3, y + 0.2, tz(r) - S / 2, tz(r) + S / 2, { solid: true });
    const t = { r, c, m, col, on: false };
    col.tile = t; tiles.push(t);
  }
  o.toks.forEach((tk, i) => {
    B.label('Q ' + tk, o.cx - (n / 2) * P2 - 1.3, y + 0.75, tz(i), { h: 0.62, px: 28, bg: '#c9d6f5' });
    B.label('K ' + tk, tx(i), y + 0.9, o.cz - (n / 2) * P2 - 0.9, { h: 0.62, px: 28, bg: '#fbdcc0' });
  });
  const paint = () => tiles.forEach((t) => t.m.material.color.setHex(solved ? (t.c <= t.r ? GOOD : OFF) : t.bad ? BAD : t.on ? ON : OFF));
  if (solved) tiles.forEach((t) => { t.on = t.c <= t.r; });
  paint();
  const lit = () => tiles.filter((t) => t.on).length;
  lv.onLand.push((g) => {
    if (solved || !g.tile) return;
    const t = g.tile; t.on = !t.on; t.bad = false; paint();
    AU.sfx(t.on ? 'pick' : 'drop'); E.fx.burst(t.m.position.x, y + 0.4, t.m.position.z, t.on ? ON : 0xffffff, 12, 2.5, 0.5);
  });
  const win = (stars) => {
    solved = true; paint(); AU.sfx('open');
    tiles.forEach((t) => { if (t.c <= t.r) E.fx.burst(t.m.position.x, y + 0.5, t.m.position.z, GOOD, 8, 3, 0.9); });
    UI.actHud(null);
    ctx.complete(o.id, stars);
    UI.say([['att', '這就是<b>因果遮罩</b>。每個 token 只能參考自己和前面的 token，所以亮起來的是<b>下三角</b>，對角線也算。'], ['kv', '注意！因為後面的 token 看不到、也改不了前面的計算，前面算好的 K、V 才可以<b>留下來重用</b>。']]);
  };
  const check = () => {
    const wrong = tiles.filter((t) => t.on !== (t.c <= t.r));
    if (!wrong.length) { win(fails === 0 ? 3 : fails <= 2 ? 2 : 1); return; }
    fails++; AU.sfx('bad');
    wrong.forEach((t) => { if (t.on) t.bad = true; });
    paint(); flash = 1.4;
    const miss = wrong.filter((t) => !t.on).length, extra = wrong.filter((t) => t.on).length;
    UI.toast((extra ? '紅色的 ' + extra + ' 格不該亮（那是「未來」的 token）。' : '') + (miss ? '還有 ' + miss + ' 格該亮沒亮。' : ''), 'bad', 3200);
    if (fails === 2) UI.say([['kv', '提示：站在某一列，問自己「這個 Q 能看到哪些 K？」答案是<b>自己，和排在它前面的所有 token</b>。']]);
  };
  const demo = () => { tiles.forEach((t) => { t.on = t.c <= t.r; t.bad = false; }); win(1); };
  button3d(o.check.x, o.check.z, y, '檢查遮罩');
  lv.inter.push({ x: o.check.x, y, z: o.check.z, r: 2.2, acts: () => (solved ? null : fails >= 2 ? [{ label: '檢查遮罩', fn: check }, { label: '請凱薇示範', fn: demo }] : [{ label: '檢查遮罩', fn: check }]) });
  ctx.anchor(o.id, o.check.x, o.check.z, y);
  lv.updates.push((dt) => {
    if (flash > 0) { flash -= dt; if (flash <= 0) { tiles.forEach((t) => { if (t.bad) { t.bad = false; t.on = false; } }); paint(); } }
    if (solved) return;
    const p = E.p.pos, near = Math.abs(p.x - o.cx) < n * P2 / 2 + 4.5 && Math.abs(p.z - o.cz) < n * P2 / 2 + 4.5;
    if (near) UI.actHud('站到地磚上<b>原地跳一下</b>，點亮「這個 Q 可以參考的 K」。完成後到金色按鈕檢查。<div class="row"><span class="pill">已點亮 ' + lit() + ' 格</span></div>');
    else UI.actHud(null);
  });
  lv.debug = lv.debug || {};
  lv.debug[o.id] = { tiles, check, target: (t) => t.c <= t.r };
};

// W3: generate three tokens without and then with a KV cache
ACT.run = (ctx, o) => {
  const lv = ctx.lv, y = o.y || 0, names = ['x₁', 'x₂', 'x₃', 'y₁', 'y₂', 'y₃'];
  const DARK = 0x3a4470, LIT = COL.gold, CACHED = COL.cyan, NEXT = 0xffffff;
  let phase = ctx.done(o.id) ? 'done' : 'A', round = 0, expect = 0, count = 0, busy = false;
  const pads = names.map((nm, i) => {
    const z = o.z0 - i * o.dz;
    const m = ownBox(o.x, y + 0.09, z, 1.15, 0.18, 1.15, DARK, 'cyl');
    B.decal(nm, o.x + 2.1, y, z, { h: 0.95, color: i < 3 ? '#8fb4ff' : '#ffc08a', font: 'mono' });
    const cry = B.box(o.x, y + 1.5, z, 0.34, 0.5, 0.34, CACHED, { geo: 'oct', phong: true, flat: true, emissive: 0x1f5f8f, cast: false });
    cry.visible = false;
    return { i, z, m, cry, lit: false, cached: false, shown: i < 3 };
  });
  const paint = () => pads.forEach((p) => {
    p.m.visible = p.shown; p.cry.visible = p.cached && p.shown;
    p.m.material.color.setHex(p.cached ? CACHED : p.lit ? LIT : DARK);
    p.m.material.emissive.setHex(p.cached ? 0x1f5f8f : p.lit ? 0x6a4a00 : 0x000000);
  });
  const need = () => (phase === 'A' ? 3 + round : round === 0 ? 3 : 1);
  const firstIdx = () => (phase === 'B' && round > 0 ? 2 + round : 0);
  if (phase === 'done') pads.forEach((p) => { p.shown = true; p.cached = p.i < 5; });
  paint();
  const hud = () => {
    if (phase === 'A') {
      const seq = pads.slice(0, 3 + round).map((p) => names[p.i]).join(' → ');
      UI.actHud('<b>沒有 KV Cache</b>　第 ' + (round + 1) + '／3 輪：依序踩過 ' + seq + '，才能生成 ' + names[3 + round] + '<div class="row"><span class="pill">已計算 token</span><span class="big">' + count + ' 次</span></div>');
    } else if (phase === 'B') {
      const seq = round === 0 ? 'x₁ → x₂ → x₃（prefill）' : '只踩新的 ' + names[2 + round];
      UI.actHud('<b>裝上 KV Cache</b>　第 ' + (round + 1) + '／3 輪：' + seq + '，就能生成 ' + names[3 + round] + '<div class="row"><span class="pill">已計算 token</span><span class="big">' + count + ' 次</span><span class="pill">剛才沒快取：12 次</span></div>');
    }
  };
  const finishRound = async () => {
    busy = true;
    const out = pads[3 + round];
    out.shown = true; AU.sfx('ok');
    E.fx.burst(o.x, y + 1, out.z, COL.orange, 26, 4, 0.9);
    UI.toast('生成了 ' + names[out.i] + '！', 'good', 1400);
    if (phase === 'A') {
      await sleep(700);
      pads.forEach((p) => { p.lit = false; });
      round++; expect = 0;
      if (round === 3) {
        paint(); UI.actHud(null);
        await UI.say([['cac', '呼……三個 token 就算了 <b>3 + 4 + 5 = 12</b> 次。每一輪都把整段前文從頭重算。'], ['kv', '其實 x₁、x₂、x₃ 的 K 和 V，第一輪就算過了。因果遮罩保證它們不會被後面的 token 改變。'], ['cac', '所以把算過的 K、V 存進水晶就好。這就是 <b>KV Cache</b>！回到起點再跑一次看看。']]);
        phase = 'B'; round = 0; expect = 0; count = 0;
        pads.forEach((p) => { p.shown = p.i < 3; p.lit = false; p.cached = false; });
        ctx.anchor(o.id, o.x, pads[0].z, y);
      } else UI.toast('沒有快取：剛剛算的全部丟掉了，回到 x₁ 重來', 'warn', 2400);
    } else {
      pads.forEach((p) => { if (p.lit) { p.cached = true; p.lit = false; } });
      round++; expect = firstIdx();
      if (round === 3) {
        phase = 'done'; paint(); UI.actHud(null);
        ctx.complete(o.id, 3);
        await UI.say([['kv', '這次只算了 <b>3 + 1 + 1 = 5</b> 次！舊 token 的 K、V 直接從快取讀，新 token 只算自己。'], ['cac', '一開始一次處理整段輸入叫 <b>prefill</b>，之後一個一個生成叫 <b>decode</b>。輸入越長，prefill 就越久，使用者等第一個字的時間（TTFT）也越久。'], ['kv', '記住這個痛點。CacheBlend 要對付的就是<b>又長又貴的 prefill</b>。']]);
      }
    }
    paint(); busy = false;
  };
  ctx.anchor(o.id, o.x, pads[0].z, y);
  lv.updates.push((dt, t) => {
    if (phase === 'done') return;
    const p = E.p.pos;
    const near = Math.abs(p.x - o.x) < 7 && p.z < o.z0 + 6 && p.z > o.z0 - 5 * o.dz - 5;
    if (!near) { UI.actHud(null); return; }
    if (busy) return;
    hud();
    const pad = pads[expect];
    if (!pad) return;
    const s = 1.15 + Math.sin(t * 7) * 0.09;
    pads.forEach((q) => { q.m.scale.x = q.m.scale.z = q === pad ? s : 1.15; });
    if (!pad.lit) pad.m.material.emissive.setHex(Math.sin(t * 7) > 0 ? 0x554400 : 0x000000);
    if (E.p.grounded && Math.hypot(p.x - o.x, p.z - pad.z) < 0.95) {
      pad.lit = true; count++; AU.sfx('compute', expect); E.fx.burst(o.x, y + 0.3, pad.z, LIT, 10, 2.5, 0.5);
      // with a cache, the new token attends to the stored K and V
      if (phase === 'B' && round > 0) pads.forEach((q) => { if (q.cached) E.fx.burst(o.x, y + 1.5, q.z, CACHED, 6, 1.5, 0.6); });
      expect++;
      const last = phase === 'A' ? need() : firstIdx() + need();
      paint();
      if (expect >= last) finishRound();
    }
  });
  lv.debug = lv.debug || {};
  lv.debug[o.id] = { pads, state: () => ({ phase, round, expect, count, busy }) };
};
