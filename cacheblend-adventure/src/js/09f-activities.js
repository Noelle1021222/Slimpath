// ===== activities for worlds 8-9 =====
// W8: predict where the four methods land, then watch them race (Fig. 12).
ACT.race = (ctx, o) => {
  const lv = ctx.lv, y = o.y || 0;
  let state = ctx.done(o.id) ? 'done' : 'idle';
  const runners = o.lanes.map((ln, i) => {
    const z = o.z0 + i * o.dz;
    B.box((o.x0 + o.x1) / 2, y + 0.02, z, o.x1 - o.x0 + 3, 0.04, o.dz - 0.5, i % 2 ? 0xd9c9a8 : 0xcfbe98, { cast: false });
    const r = makeRobot({ accent: ln.color, trim: ln.color, s: 0.95 });
    r.position.set(o.x0, y, z); r.rotation.y = Math.PI / 2; lv.group.add(r);
    const name = B.label(ln.name, o.x0, y + 2.5, z, { h: 0.5, px: 24, bg: '#1b2340', color: '#f4f6fb', border: '#f4f6fb' });
    const res = B.label('　', o.x1 + 2.6, y + 1.2, z, { h: 0.5, px: 24, font: 'mono' });
    res.visible = false;
    return { ln, r, z, name, res, t: 0, done: state === 'done' };
  });
  B.box(o.x1 + 0.4, y + 0.03, o.z0 + ((o.lanes.length - 1) * o.dz) / 2, 0.5, 0.05, o.lanes.length * o.dz, COL.ink, { cast: false });
  B.box(o.x0 - 0.9, y + 0.03, o.z0 + ((o.lanes.length - 1) * o.dz) / 2, 0.3, 0.05, o.lanes.length * o.dz, COL.paper, { cast: false });
  const setRes = (q, txt, bg) => {
    const t = textTex(txt, { px: 24, font: 'mono', bg: bg || '#f4f6fb' });
    q.res.material.map.dispose(); q.res.material.map = t.tex; q.res.scale.set(0.5 * t.aspect, 0.5, 1); t.onRedraw = (a) => q.res.scale.set(0.5 * a, 0.5, 1); q.res.visible = true;
  };
  const park = () => runners.forEach((q) => { q.r.position.x = o.x1; q.name.position.x = o.x1; setRes(q, 'TTFT ' + q.ln.ttft.toFixed(2) + 's　F1 ' + q.ln.f1.toFixed(2), q.ln.f1 < 0.25 ? '#f8d2cf' : '#cdebd4'); });
  if (state === 'done') park();
  button3d(o.board.x, o.board.z, y, '預測台', COL.rose);
  const startRace = (stars) => {
    state = 'racing';
    const K = 2.6, longest = Math.max.apply(null, o.lanes.map((l) => l.ttft)) * K;
    UI.actHud('<b>Prefill 競速！</b>　誰先送出第一個 token？');
    AU.sfx('roar');
    E.focus((o.x0 + o.x1) / 2, y + 1, o.z0 + ((o.lanes.length - 1) * o.dz) / 2, longest + 3.2).then(async () => {
      state = 'done'; UI.actHud(null);
      ctx.complete(o.id, stars);
      await UI.say(o.win);
    });
    let t = 0, judged = false;
    lv.updates.push((dt) => {
      if (state !== 'racing') return;
      t += dt;
      runners.forEach((q) => {
        const dur = q.ln.ttft * K, k = Math.min(1, t / dur);
        q.r.position.x = lerp(o.x0, o.x1, k); q.name.position.x = q.r.position.x;
        animRobot(q.r, E.t, k < 1 ? 1 : 0, true, dt);
        if (k >= 1 && !q.done) { q.done = true; AU.sfx('ok'); E.fx.burst(o.x1, y + 1, q.z, q.ln.color, 20, 4, 0.8); setRes(q, 'TTFT ' + q.ln.ttft.toFixed(2) + 's'); }
      });
      if (!judged && t > longest + 0.9) {
        judged = true; AU.sfx('star');
        runners.forEach((q) => setRes(q, 'TTFT ' + q.ln.ttft.toFixed(2) + 's　F1 ' + q.ln.f1.toFixed(2), q.ln.f1 < 0.25 ? '#f8d2cf' : '#cdebd4'));
        UI.actHud('<b>裁判亮分！</b>　跑得快還不夠，答案也要對。');
      }
    });
  };
  lv.inter.push({ x: o.board.x, y, z: o.board.z + 0.4, r: 2.3, acts: () => (state !== 'idle' ? null : [{ label: '賽前預測：四種方法各在哪裡', fn: async () => {
    const res = await NB.run(o.quiz, { key: ctx.wid + '.' + o.id + '.quiz', kicker: '預測完成', doneLabel: '開賽！' });
    if (res.done) startRace(res.stars);
  } }]) });
  ctx.anchor(o.id, o.board.x, o.board.z + 0.4, y);
  lv.anims.push((dt, t) => { if (state !== 'racing') runners.forEach((q) => animRobot(q.r, t, 0, true, dt)); });
  lv.updates.push(() => {
    if (state !== 'idle') return;
    const p = E.p.pos;
    if (Math.abs(p.x - (o.x0 + o.x1) / 2) < 19 && Math.abs(p.z - o.z0 - 3) < 12) UI.actHud('四位選手準備比 <b>TTFT</b>。開賽前，先到紅色的<b>預測台</b>押注。');
    else UI.actHud(null);
  });
  lv.debug = lv.debug || {};
  lv.debug[o.id] = { state: () => state };
};

// W9: the final boss. Each round the dragon shouts a misconception; grab the crystal with the right rebuttal.
ACT.boss = (ctx, o) => {
  const lv = ctx.lv, y = o.y || 0;
  let phase = ctx.done(o.id) ? 'done' : 'wait', round = 0, hp = o.rounds.length, hearts = 5, fails = 0, fireT = 0, inv = 0, noFire = false, moved = false;
  const startPos = new THREE.Vector3();
  // --- the dragon ---
  const D = new THREE.Group(); D.position.set(o.cx, y, o.cz - 11); lv.group.add(D);
  const P = (geoName, color, px, py, pz, sx, sy, sz, mo, parent) => { const m = mesh(geoName, color, mo); m.position.set(px, py, pz); m.scale.set(sx, sy, sz); m.castShadow = true; (parent || D).add(m); return m; };
  const purple = 0x6a3b8f, dark = 0x3a2050;
  P('sph', purple, 0, 2.6, 0, 3.2, 2.4, 2.6);
  P('sph', 0xc9a0e0, 0, 2.2, 1.6, 2.2, 1.7, 1.4);
  const neck = new THREE.Group(); neck.position.set(0, 4.2, 1.2); D.add(neck);
  P('cyl', purple, 0, 1.0, 0.3, 0.9, 2.2, 0.9, null, neck).rotation.x = 0.35;
  const head = new THREE.Group(); head.position.set(0, 2.5, 1.2); neck.add(head);
  P('box', purple, 0, 0, 0, 2.0, 1.4, 2.4, null, head);
  P('box', dark, 0, -0.5, 1.5, 1.6, 0.5, 1.2, null, head);
  const eyeL = P('sph', 0xffe14a, -0.7, 0.3, 1.0, 0.3, 0.3, 0.2, { basic: true }, head), eyeR = P('sph', 0xffe14a, 0.7, 0.3, 1.0, 0.3, 0.3, 0.2, { basic: true }, head);
  P('cone', 0xf4f6fb, -0.8, 1.1, -0.5, 0.25, 1.1, 0.25, null, head).rotation.z = 0.4;
  P('cone', 0xf4f6fb, 0.8, 1.1, -0.5, 0.25, 1.1, 0.25, null, head).rotation.z = -0.4;
  const wingL = new THREE.Group(); wingL.position.set(-2.4, 4, -0.4); D.add(wingL); P('box', dark, -2.2, 0, 0, 4.6, 0.16, 3, null, wingL);
  const wingR = new THREE.Group(); wingR.position.set(2.4, 4, -0.4); D.add(wingR); P('box', dark, 2.2, 0, 0, 4.6, 0.16, 3, null, wingR);
  P('cone', purple, 0, 1.4, -3.4, 1.2, 4.4, 1.2).rotation.x = -1.3;
  B.col(o.cx - 4.5, o.cx + 4.5, y, y + 7, o.cz - 14, o.cz - 8, { solid: true, walk: false });
  B.label(WHO.boss.name, o.cx, y + 10.2, o.cz - 11, { h: 0.7, px: 30, bg: '#3a2050', color: '#f4f6fb', border: '#f4f6fb' });
  let flinch = 0, dead = phase === 'done';
  if (dead) D.visible = false;
  lv.anims.push((dt, t) => {
    if (!D.visible) return;
    wingL.rotation.z = Math.sin(t * 2.2) * 0.35 + 0.2; wingR.rotation.z = -Math.sin(t * 2.2) * 0.35 - 0.2;
    D.position.y = y + Math.sin(t * 1.3) * 0.25 - (phase === 'seal' ? 1.2 : 0);
    neck.rotation.x = Math.sin(t * 1.1) * 0.08 + (phase === 'seal' ? 0.7 : 0);
    if (!dead) head.rotation.y = Math.atan2(E.p.pos.x - o.cx, E.p.pos.z - (o.cz - 11)) * 0.6;
    flinch = Math.max(0, flinch - dt * 2);
    D.rotation.z = Math.sin(t * 40) * 0.06 * flinch;
    const es = 0.3 + Math.sin(t * 6) * 0.03; eyeL.scale.x = eyeR.scale.x = es;
  });
  // --- crystals ---
  const spots = [{ x: o.cx - 8.5, z: o.cz + 0.5 }, { x: o.cx, z: o.cz - 2.5 }, { x: o.cx + 8.5, z: o.cz + 0.5 }];
  const cols = [COL.blue, COL.orange, COL.green];
  const crystals = spots.map((s, i) => {
    const g = new THREE.Group(); g.position.set(s.x, y, s.z); lv.group.add(g);
    const gem = mesh('oct', cols[i], { phong: true, flat: true, emissive: shade(cols[i], 0.4) }); gem.scale.set(0.6, 0.95, 0.6); gem.position.y = 1.5; gem.castShadow = true; g.add(gem);
    const base = mesh('cyl', COL.ink); base.scale.set(0.8, 0.3, 0.8); base.position.y = 0.15; g.add(base);
    B.label('ABC'[i], 0, 3.0, 0, { parent: g, h: 0.75, px: 34, font: 'mono', bg: '#1b2340', color: '#f4f6fb', border: '#f4f6fb' });
    g.visible = false;
    const c = { g, gem, i, x: s.x, z: s.z, opt: null, alive: false };
    c.inter = { x: s.x, y, z: s.z, r: 1.9, enabled: false, label: '', fn: () => pick(c) };
    lv.inter.push(c.inter);
    lv.anims.push((dt, t) => { gem.rotation.y = t * 1.5 + i; gem.position.y = 1.5 + Math.sin(t * 2.4 + i) * 0.14; });
    return c;
  });
  // --- fireball warnings ---
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(G('ring'), new THREE.MeshBasicMaterial({ color: 0xff5a2a, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.visible = false; m.userData.own = true; lv.group.add(m);
    rings.push({ m, t: 0, on: false, x: 0, z: 0 });
  }
  // --- the blade that seals the dragon ---
  const blade = new THREE.Group(); blade.position.set(o.cx, y, o.cz + 1); blade.visible = false; lv.group.add(blade);
  const bm = mesh('box', COL.orange, { phong: true, flat: true, emissive: 0x6a3000 }); bm.scale.set(0.3, 2.6, 0.08); bm.position.y = 2.4; blade.add(bm);
  const bg = mesh('box', COL.gold); bg.scale.set(1.1, 0.16, 0.2); bg.position.y = 1.05; blade.add(bg);
  const bh = mesh('cyl', COL.ink); bh.scale.set(0.09, 0.6, 0.09); bh.position.y = 0.7; blade.add(bh);
  const glow = makeGlow(COL.orange, 5); glow.position.y = 2.2; blade.add(glow);
  lv.anims.push((dt, t) => { blade.rotation.y = t * 1.2; });
  const bladeInter = { x: o.cx, y, z: o.cz + 1, r: 2.4, enabled: false, label: '舉起融合之刃', fn: () => seal() };
  lv.inter.push(bladeInter);

  const heartsStr = () => '♥'.repeat(hearts) + '<span style="opacity:.3">' + '♥'.repeat(Math.max(0, 5 - hearts)) + '</span>';
  const hud = () => {
    if (phase === 'round') {
      const r = o.rounds[round];
      UI.actHud('<div class="row"><span class="pill">魔龍 ' + '■'.repeat(hp) + '□'.repeat(o.rounds.length - hp) + '</span><span class="hearts">' + heartsStr() + '</span></div><b>魔龍：「' + r.claim + '」</b><div class="opt">' + crystals.filter((c) => c.alive).map((c) => '<div><i style="color:#' + cols[c.i].toString(16).padStart(6, '0') + '">' + 'ABC'[c.i] + '</i>' + c.opt[0] + '</div>').join('') + '</div>' + (moved ? '' : '<div class="row"><span class="pill">慢慢看。你一移動，魔龍才會開始吐火球</span></div>'), true);
    } else if (phase === 'seal') UI.actHud('魔龍倒下了！到場中央<b>舉起融合之刃</b>，給牠最後一擊。', true);
  };
  const startRound = async () => {
    phase = 'talk'; UI.actHud(null);
    rings.forEach((rg) => { rg.on = false; rg.m.visible = false; });
    const r = o.rounds[round];
    AU.sfx('roar'); flinch = 0.6;
    await UI.say([['boss', r.claim], ['kv', '牠說錯了！三顆水晶各寫著一句反駁，去拿<b>正確</b>的那一顆。小心火球。']]);
    const order = shuffled([0, 1, 2]);
    crystals.forEach((c, k) => { c.opt = r.opts[order[k]]; c.alive = true; c.g.visible = true; c.inter.enabled = true; c.inter.label = '拿起水晶 ' + 'ABC'[c.i]; E.fx.burst(c.x, y + 1.5, c.z, cols[c.i], 14, 3, 0.6); });
    fireT = 1.6; moved = false; startPos.copy(E.p.pos); phase = 'round';
    ctx.anchor(o.id, o.cx, o.cz + 4, y);
  };
  const hurt = (why) => {
    hearts--; inv = 1.2; AU.sfx('hit'); E.fx.burst(E.p.pos.x, E.p.pos.y + 1, E.p.pos.z, 0xff5a2a, 26, 5, 0.7);
    if (why) UI.toast(why, 'bad', 3600);
    if (hearts <= 0) knockout();
  };
  const knockout = async () => {
    phase = 'talk'; fails++;
    crystals.forEach((c) => { c.alive = false; c.g.visible = false; c.inter.enabled = false; });
    rings.forEach((rg) => { rg.on = false; rg.m.visible = false; });
    UI.actHud(null);
    E.teleport(o.cx, y, o.cz + 10);
    await UI.say([['kv', '好險！我把你拉回來了。深呼吸，再聽一次牠說了什麼。']]);
    hearts = 3; startRound();
  };
  const pick = async (c) => {
    if (phase !== 'round' || !c.alive) return;
    if (c.opt[1]) {
      phase = 'talk';
      crystals.forEach((q) => { q.alive = false; q.inter.enabled = false; if (q !== c) q.g.visible = false; });
      rings.forEach((rg) => { rg.on = false; rg.m.visible = false; });
      AU.sfx('zap'); flinch = 1.4; hp--;
      E.fx.burst(c.x, y + 1.5, c.z, cols[c.i], 30, 5, 0.8);
      E.fx.burst(o.cx, y + 5, o.cz - 10, 0xffffff, 60, 7, 1.1);
      await sleep(500); AU.sfx('boom'); c.g.visible = false;
      UI.actHud(null);
      await UI.say([['kv', '命中！' + o.rounds[round].why]]);
      round++;
      if (round >= o.rounds.length) {
        phase = 'seal'; AU.sfx('roar');
        blade.visible = true; bladeInter.enabled = true; E.fx.burst(o.cx, y + 2, o.cz + 1, COL.orange, 60, 6, 1.2);
        ctx.anchor(o.id, o.cx, o.cz + 1, y);
        await UI.say([['boss', '不……不可能……我的 prefill……'], ['kv', '八片碎片合而為一了！<b>融合之刃 CacheBlend</b> 就在場中央，去舉起它！']]);
      } else startRound();
    } else {
      c.alive = false; c.g.visible = false; c.inter.enabled = false;
      AU.sfx('boom');
      hurt('不對：' + c.opt[2]);
    }
  };
  const seal = async () => {
    if (phase !== 'seal') return;
    const res = await NB.run(o.seal, { key: ctx.wid + '.' + o.id + '.seal', kicker: '真言完成', doneLabel: '斬！' });
    if (!res.done) return;
    phase = 'done'; bladeInter.enabled = false; UI.actHud(null);
    AU.sfx('boom'); dead = true;
    for (let i = 0; i < 6; i++) E.fx.burst(o.cx + (Math.random() - 0.5) * 6, y + 2 + Math.random() * 5, o.cz - 11 + (Math.random() - 0.5) * 4, [COL.blue, COL.orange, COL.green, 0xffffff][i % 4], 50, 8, 1.6);
    E.tween(1.4, (k) => { D.scale.setScalar(1 - k * 0.98); D.rotation.y = k * 9; }, () => { D.visible = false; });
    blade.visible = false;
    ctx.complete(o.id, fails === 0 ? 3 : fails === 1 ? 2 : 1);
    await sleep(1500);
    await UI.say(o.win);
  };
  lv.triggers.push({ x: o.cx, z: o.cz + 9, y, r: 5, once: true, fn: () => { if (phase === 'wait') startRound(); } });
  ctx.anchor(o.id, o.cx, o.cz + 9, y);
  lv.updates.push((dt) => {
    // pull the camera back inside the arena so the dragon stays in view
    const inArena = phase !== 'done' && Math.abs(E.p.pos.x - o.cx) < 17 && Math.abs(E.p.pos.z - o.cz) < 16;
    const ck = 1 - Math.exp(-2 * dt);
    E.camPitch = lerp(E.camPitch, inArena ? 0.56 : 0.74, ck); E.camDist = lerp(E.camDist, inArena ? 19 : 13.5, ck);
    if (phase !== 'round' && phase !== 'seal') return;
    hud();
    if (phase !== 'round') return;
    inv = Math.max(0, inv - dt);
    if (!moved && startPos.distanceTo(E.p.pos) > 2.5) moved = true;
    if (!noFire && moved) {
      fireT -= dt;
      if (fireT <= 0) {
        fireT = Math.max(1.5, 2.9 - round * 0.2);
        const rg = rings.find((q) => !q.on);
        if (rg) { rg.on = true; rg.t = 0; rg.x = E.p.pos.x + E.p.vel.x * 0.35; rg.z = E.p.pos.z + E.p.vel.z * 0.35; rg.m.position.set(rg.x, y + 0.06, rg.z); rg.m.visible = true; AU.sfx('tick'); }
      }
    }
    rings.forEach((rg) => {
      if (!rg.on) return;
      rg.t += dt;
      const k = rg.t / 1.35;
      rg.m.scale.setScalar(0.4 + k * 1.5); rg.m.material.opacity = 0.4 + k * 0.5;
      if (k >= 1) {
        rg.on = false; rg.m.visible = false; AU.sfx('boom');
        E.fx.burst(rg.x, y + 0.5, rg.z, 0xff5a2a, 36, 6, 0.7);
        if (inv <= 0 && Math.hypot(E.p.pos.x - rg.x, E.p.pos.z - rg.z) < 1.9 && E.p.pos.y - y < 1.4) hurt('被火球打中了！紅圈出現時趕快離開。');
      }
    });
  });
  lv.debug = lv.debug || {};
  lv.debug[o.id] = { state: () => ({ phase, round, hp, hearts }), crystals, setNoFire: (v) => { noFire = v; }, blade: { x: o.cx, z: o.cz + 1 } };
};
