// ===== in-world 3D activities =====
const ACT = {};

// floating cube with a caption, used for tokens and chunks
function tokenCube(text, sub, color, size) {
  const g = new THREE.Group();
  const s = size || 0.8;
  const m = mesh('box', color); m.scale.setScalar(s); m.castShadow = true; g.add(m);
  const e = mesh('box', COL.ink, { basic: true, opacity: 0.18 }); e.scale.setScalar(s * 1.08); g.add(e);
  const t = textTex(text, { px: 34, bg: null, color: '#1b2340' });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t.tex, transparent: true, depthWrite: false }));
  sp.scale.set(0.72 * t.aspect, 0.72, 1); t.onRedraw = (a) => sp.scale.set(0.72 * a, 0.72, 1);
  sp.position.y = s * 0.5 + 0.55; sp.userData.own = true; g.add(sp);
  if (sub) {
    const t2 = textTex(sub, { px: 22, font: 'mono', bg: '#1b2340', color: '#f4f6fb', border: null, pad: 6, radius: 8 });
    const sp2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: t2.tex, transparent: true, depthWrite: false }));
    sp2.scale.set(0.42 * t2.aspect, 0.42, 1); t2.onRedraw = (a) => sp2.scale.set(0.42 * a, 0.42, 1);
    sp2.position.y = -s * 0.5 - 0.3; sp2.userData.own = true; g.add(sp2);
  }
  g.userData.box = m;
  return g;
}

// W1: collect the token cubes that hop out of the tokenizer
ACT.cubes = (ctx, o) => {
  const lv = ctx.lv;
  const cc = [COL.blue, COL.orange, COL.green, COL.gold];
  let active = false, got = 0;
  const items = o.items.map((it, i) => {
    const g = tokenCube(it.text, 'ID ' + it.id, cc[i % 4]);
    g.position.set(it.x, it.y, it.z); g.visible = false; lv.group.add(g);
    return { g, it, got: false, ph: i * 1.3 };
  });
  const hud = () => UI.actHud('收集托克切好的 <b>詞元方塊</b>　<span class="big">' + got + ' / ' + items.length + '</span>');
  const nextAnchor = () => { const n = items.find((q) => !q.got); if (n) ctx.anchor(o.id, n.it.x, n.it.z, n.it.y - 1); };
  const reveal = (quiet) => {
    active = true;
    items.forEach((q, i) => {
      q.g.visible = true;
      if (!quiet) { q.g.scale.setScalar(0.01); E.tween(0.5 + i * 0.12, (k) => q.g.scale.setScalar(easeOut(k))); E.fx.burst(q.it.x, q.it.y, q.it.z, cc[i % 4], 14, 3, 0.8); }
    });
    nextAnchor();
  };
  if (ctx.done(o.id)) return;
  if (ctx.done(o.after)) reveal(true); else ctx.onDone(o.after, () => { reveal(false); UI.say([['kv', '看！切好的 token 跳出來了。每一塊上面是文字，下面是它的 <b>token ID</b>。'], ['kv', '把四塊都收集起來。最後一塊在木箱上，要<b>跳</b>上去喔。']]); });
  lv.updates.push((dt, t) => {
    if (!active) return;
    const p = E.p.pos;
    let near = false;
    items.forEach((q) => {
      if (q.got) return;
      q.g.rotation.y = t * 1.2 + q.ph; q.g.position.y = q.it.y + Math.sin(t * 2.2 + q.ph) * 0.12;
      const dx = q.it.x - p.x, dy = q.it.y - (p.y + 0.8), dz = q.it.z - p.z;
      if (dx * dx + dz * dz < 144) near = true;
      if (dx * dx + dy * dy + dz * dz < 1.5) {
        q.got = true; q.g.visible = false; got++;
        AU.sfx('coin', got); E.fx.burst(q.it.x, q.it.y, q.it.z, COL.gold, 22, 4, 0.8);
        UI.toast('拿到「' + q.it.text + '」　token ID ' + q.it.id, 'good', 1600);
        nextAnchor();
        if (got === items.length) { active = false; UI.actHud(null); ctx.complete(o.id, 3); UI.say([['kv', '四個 token 到手：15、82、36、91。這些編號只是<b>索引</b>，還不能拿來算。'], ['kv', '下一步，拿它們去<b>嵌入表</b>換成向量！']]); }
      }
    });
    if (active) { if (near) hud(); else UI.actHud(null); }
  });
};
