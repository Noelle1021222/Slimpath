// ===== activity for world 7 =====
// W7: be one request and travel through the CacheBlend system in the right order (Fig. 11).
ACT.flow = (ctx, o) => {
  const lv = ctx.lv, y = o.y || 0;
  let step = ctx.done(o.id) ? o.order.length : 0, fails = 0, wrongHere = 0, busy = false;
  const cubes = o.carry.map((c) => { const g = tokenCube(c[0], null, c[1], 0.7); g.visible = false; lv.group.add(g); return g; });
  const setCarry = (i) => { cubes.forEach((g, k) => { g.visible = k === i; }); E.p.carry = i >= 0 && i < cubes.length ? cubes[i] : null; };
  const stops = {};
  o.stops.forEach((s) => {
    const g = new THREE.Group(); g.position.set(s.x, y, s.z); lv.group.add(g);
    const P = (geoName, color, px, py, pz, sx, sy, sz, mo) => { const m = mesh(geoName, color, mo); m.position.set(px, py, pz); m.scale.set(sx, sy, sz); m.castShadow = true; g.add(m); return m; };
    let spin = null;
    if (s.key === 'user') { P('box', 0xf7e7c6, 0, 1, 0, 2.4, 2, 2.2); const r = P('cone4', COL.rose, 0, 2.6, 0, 2.1, 1.3, 2); r.rotation.y = Math.PI / 4; P('box', 0x8fe8ff, 0, 1.2, 1.12, 1.2, 0.8, 0.06, { basic: true }); }
    else if (s.key === 'ctrl') { P('box', 0x5f6f7f, 0, 1.6, 0, 1.6, 3.2, 1.6); P('box', COL.ink, 0, 3.6, 0, 2.6, 1.0, 2.6); P('box', 0xffe9a8, 0, 3.6, 1.32, 2.2, 0.6, 0.06, { basic: true }); P('cyl', COL.ink, 0, 4.6, 0, 0.06, 1.2, 0.06); spin = P('oct', COL.green, 0, 5.3, 0, 0.3, 0.3, 0.3, { basic: true }); }
    else if (s.key === 'ret') { P('box', 0x6a4a3a, 0, 1.3, 0, 3, 2.6, 0.9); [0x5b7fd6, 0xec8b3c, 0x4fa866, 0xd9544f, 0xf2b632, 0x5b7fd6, 0x4fa866].forEach((c, i) => { P('box', c, -1.2 + i * 0.4, 1.9, 0.5, 0.3, 0.9, 0.1); P('box', c, -1.2 + i * 0.4, 0.8, 0.5, 0.3, 0.8, 0.1); }); }
    else if (s.key === 'store') { [[0x5b7fd6, 'CPU RAM'], [0x4fa866, 'SSD'], [0x6b7280, '慢速磁碟']].forEach((c, i) => { P('box', c[0], -2.2 + i * 2.2, 0.9, 0, 2, 1.8, 2.2); P('box', shade(c[0], 0.7), -2.2 + i * 2.2, 0.9, 0, 2.06, 0.2, 2.26); B.label(c[1], s.x - 2.2 + i * 2.2, y + 2.3, s.z, { h: 0.42, px: 22, font: 'mono' }); }); }
    else if (s.key === 'fusor') { P('cyl', COL.ink, 0, 0.5, 0, 1.2, 1, 1.2); P('cyl', 0xbfe6ff, 0, 2, 0, 0.95, 2, 0.95, { opacity: 0.45 }); P('cyl', COL.ink, 0, 3.1, 0, 1.0, 0.2, 1.0); spin = P('box', COL.green, 0, 1.4, 0, 1.4, 0.12, 0.3, { basic: true }); P('oct', COL.green, 0.9, 3.6, 0, 0.26, 0.26, 0.26, { basic: true }); }
    else if (s.key === 'llm') { P('box', 0x2f3b68, 0, 2, 0, 2.6, 4, 1.6); P('box', 0x8fe8ff, 0, 2.6, 0.82, 1.9, 1.5, 0.06, { basic: true }); P('box', COL.ink, -0.45, 2.8, 0.86, 0.3, 0.4, 0.04); P('box', COL.ink, 0.45, 2.8, 0.86, 0.3, 0.4, 0.04); P('box', COL.gold, 0, 4.3, 0, 1.2, 0.5, 1, { phong: true, flat: true, geo: 'box' }); }
    B.label(s.name, s.x, y + (s.lh || 4.6), s.z, { h: 0.6, px: 28 });
    const hw = s.hw || 1.4, hd = s.hd || 1.3;
    B.col(s.x - hw, s.x + hw, y, y + 3, s.z - hd, s.z + hd, { solid: true, walk: false });
    const st = { s, spin };
    st.inter = { x: s.x, y, z: s.z + hd + 0.9, r: 2.5, acts: () => {
      if (busy || step >= o.order.length) return null;
      return [{ label: step === 0 ? (s.key === 'user' ? '接下使用者的問題' : '和「' + s.name + '」互動') : '把「' + o.carry[step - 1][0] + '」帶到：' + s.name, fn: () => visit(s.key) }];
    } };
    lv.inter.push(st.inter);
    if (spin) lv.anims.push((dt, t) => { spin.rotation.y = t * 3; });
    stops[s.key] = st;
  });
  const anchorNext = () => { const k = o.order[step]; if (k) ctx.anchor(o.id, stops[k].inter.x, stops[k].inter.z, y); };
  const visit = async (key) => {
    if (key !== o.order[step]) {
      fails++; wrongHere++; AU.sfx('bad');
      UI.toast(wrongHere >= 2 ? '提示：' + o.hints[step] : '還不是這裡。想想「' + (step === 0 ? '請求' : o.carry[step - 1][0]) + '」接下來該交給誰？', 'bad', 3400);
      return;
    }
    busy = true; wrongHere = 0;
    const st = stops[key];
    AU.sfx('ok'); E.fx.burst(st.s.x, y + 2, st.s.z + 1, COL.green, 26, 4, 0.8);
    const i = step; step++;
    setCarry(step - 1 < cubes.length ? step - 1 : -1);
    if (step >= o.order.length) {
      setCarry(-1); UI.actHud(null);
      ctx.complete(o.id, fails === 0 ? 3 : fails <= 2 ? 2 : 1);
      await UI.say(o.says[i].concat(o.win));
    } else { await UI.say(o.says[i]); anchorNext(); }
    busy = false;
  };
  anchorNext();
  lv.updates.push(() => {
    if (step >= o.order.length) return;
    const p = E.p.pos;
    if (Math.abs(p.x - o.cx) > o.rx || Math.abs(p.z - o.cz) > o.rz) { UI.actHud(null); return; }
    const marks = '①②③④⑤⑥⑦'.slice(0, o.order.length).split('').map((c, k) => (k < step ? '<b>' + c + '</b>' : c)).join(' ');
    UI.actHud('你現在是一筆<b>請求</b>，親自走一遍 CacheBlend 系統。' + (step === 0 ? '先去找<b>使用者</b>。' : '手上是「<b>' + o.carry[step - 1][0] + '</b>」，下一站該去哪？') + '<div class="row"><span class="pill">' + marks + '</span></div>');
  });
  lv.debug = lv.debug || {};
  lv.debug[o.id] = { order: o.order.map((k) => ({ x: stops[k].inter.x, z: stops[k].inter.z })), state: () => ({ step, busy }) };
};
