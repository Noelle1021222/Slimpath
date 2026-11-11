// ===== level builder: islands, bridges, stations, gates, characters, decor =====
const THEMES = {
  title: { sky: ['#18203f', '#7a5aa6', '#f0a36b'], fog: 0x8a6aa0, hemiSky: 0xffe6d0, hemiGround: 0x4a4f8a, sun: 0xffd2a0, sunDir: [0.5, 0.8, 0.4], top: 0x8fcf6a, trim: 0x6bb04e, side: 0xb98a5a, bridge: 0xd9b382, accent: 0xec8b3c, mote: 0xfff2c0, cloud: 0x9a7ab8 },
  w1: { sky: ['#5aa9e6', '#bfe3f2', '#fdf2cf'], fog: 0xcfe9f3, hemiSky: 0xffffff, hemiGround: 0x7a9a6a, sun: 0xfff4d6, sunDir: [0.45, 0.85, 0.35], top: 0x8fcf6a, trim: 0x6bb04e, side: 0xb98a5a, bridge: 0xd9b382, accent: 0xec8b3c, mote: 0xffffff, cloud: 0xe4f1fb },
  w2: { sky: ['#3d4a8f', '#e58a6a', '#fbd58a'], fog: 0xe9a680, hemiSky: 0xffe2b8, hemiGround: 0x6a5a7a, sun: 0xffc98a, sunDir: [0.7, 0.55, 0.3], top: 0xe8d9b0, trim: 0xc9b384, side: 0xa68a64, bridge: 0xd8c49a, accent: 0xf2b632, mote: 0xffe9a8, cloud: 0xf2b08a },
  w3: { sky: ['#0d1230', '#1b2a5a', '#2a4a7a'], fog: 0x16224a, fogNear: 22, fogFar: 70, hemiSky: 0x9ab8ff, hemiGround: 0x1a2040, hemiI: 0.62, sun: 0xb8d8ff, sunI: 0.42, sunDir: [0.3, 0.9, 0.3], top: 0x55659a, trim: 0x3d4a78, side: 0x2a3357, bridge: 0x7a6650, accent: 0x8fd3ff, mote: 0x8fd3ff, cloud: 0x1f2c58 },
  w4: { sky: ['#2a1f4f', '#6a4a8f', '#e6a0a0'], fog: 0x7a5a96, hemiSky: 0xffd9c0, hemiGround: 0x4a3a6a, sun: 0xffc9a0, sunI: 0.5, sunDir: [-0.5, 0.75, 0.4], top: 0xc9a06a, trim: 0x9a7448, side: 0x6a4a3a, bridge: 0xb58a5a, accent: 0xc58be0, mote: 0xffd9a0, cloud: 0x8a6aa6 },
  w5: { sky: ['#4aa3df', '#a8d8ea', '#ffe2b8'], fog: 0xf2cfa0, hemiSky: 0xffffff, hemiGround: 0xa86a4a, sun: 0xfff0d0, sunDir: [-0.4, 0.85, 0.35], top: 0xe0915a, trim: 0xc06f3e, side: 0x9a4f2e, bridge: 0xf0d0a0, accent: 0x5b7fd6, mote: 0xffe2b8, cloud: 0xffe9d0 },
  w6: { sky: ['#1a0f1f', '#5a1f2a', '#e0662a'], fog: 0x4a1f24, fogNear: 24, fogFar: 78, hemiSky: 0xffb890, hemiGround: 0x3a1a20, hemiI: 0.62, sun: 0xff9a5a, sunI: 0.45, sunDir: [0.4, 0.8, 0.4], top: 0x6a585e, trim: 0x4a3a40, side: 0x2a2024, bridge: 0x8a7a80, accent: 0xff8a3c, mote: 0xff8a3c, cloud: 0x5a1a14 },
  w7: { sky: ['#0f1f3f', '#1f4a6f', '#4a8f9f'], fog: 0x1f4560, fogNear: 26, fogFar: 85, hemiSky: 0xb8e0ff, hemiGround: 0x1f3a50, hemiI: 0.62, sun: 0xcfe8ff, sunI: 0.45, sunDir: [0.5, 0.8, 0.3], top: 0x8a9aa8, trim: 0x5f6f7f, side: 0x3f4a58, bridge: 0xb0885a, accent: 0xffd166, mote: 0xffd166, cloud: 0x1a5a70 },
  w8: { sky: ['#3f7fdf', '#9fd0ff', '#f8f0d8'], fog: 0xc8e0f8, hemiSky: 0xffffff, hemiGround: 0x9a8a6a, sun: 0xfff6e0, sunDir: [0.35, 0.9, 0.3], top: 0xe8dcc0, trim: 0xc9b68a, side: 0x9a8a6a, bridge: 0xf0e6d0, accent: 0xd9544f, mote: 0xffffff, cloud: 0xffffff },
  w9: { sky: ['#0a0818', '#2a1a4a', '#7a3b8f'], fog: 0x2a1a44, fogNear: 26, fogFar: 80, hemiSky: 0xc8a8ff, hemiGround: 0x1a1428, hemiI: 0.64, sun: 0xd8b8ff, sunI: 0.45, sunDir: [0.3, 0.85, 0.4], top: 0x5a5368, trim: 0x3a3548, side: 0x1f1c2a, bridge: 0x6a6078, accent: 0xc05ae0, mote: 0xc05ae0, cloud: 0x3a1a5a }
};
const COL = { ink: 0x1b2340, paper: 0xf4f6fb, blue: 0x5b7fd6, orange: 0xec8b3c, green: 0x4fa866, rose: 0xd9544f, gold: 0xf2b632, reuse: 0xffffff, recomp: 0x6b7280, cyan: 0x8fd3ff };

const GEO = {}, MAT = {};
function G(name) {
  if (GEO[name]) return GEO[name];
  let g;
  switch (name) {
    case 'box': g = new THREE.BoxGeometry(1, 1, 1); break;
    case 'cyl': g = new THREE.CylinderGeometry(1, 1, 1, 14); break;
    case 'cyl6': g = new THREE.CylinderGeometry(1, 1, 1, 6); break;
    case 'cone': g = new THREE.ConeGeometry(1, 1, 10); break;
    case 'cone4': g = new THREE.ConeGeometry(1, 1, 4); break;
    case 'cone6': g = new THREE.ConeGeometry(1, 1, 6); break;
    case 'sph': g = new THREE.SphereGeometry(1, 16, 12); break;
    case 'sphLo': g = new THREE.SphereGeometry(1, 8, 6); break;
    case 'oct': g = new THREE.OctahedronGeometry(1, 0); break;
    case 'ico': g = new THREE.IcosahedronGeometry(1, 0); break;
    case 'torus': g = new THREE.TorusGeometry(1, 0.12, 8, 28); break;
    case 'torusFat': g = new THREE.TorusGeometry(1, 0.25, 8, 20); break;
    case 'ring': g = new THREE.RingGeometry(0.8, 1, 32); break;
    case 'disc': g = new THREE.CircleGeometry(1, 28); break;
    case 'plane': g = new THREE.PlaneGeometry(1, 1); break;
    default: throw new Error('geo ' + name);
  }
  GEO[name] = g;
  return g;
}
// o: {basic, phong, flat, emissive, opacity, side}
function M(color, o) {
  o = o || {};
  const key = color + '|' + (o.basic ? 'b' : o.phong ? 'p' : 'l') + (o.flat ? 'f' : '') + (o.emissive || '') + '|' + (o.opacity == null ? 1 : o.opacity) + (o.side ? 'd' : '') + (o.add ? 'a' : '');
  if (MAT[key]) return MAT[key];
  const p = { color };
  if (o.opacity != null && o.opacity < 1) { p.transparent = true; p.opacity = o.opacity; p.depthWrite = false; }
  if (o.side) p.side = THREE.DoubleSide;
  if (o.add) { p.blending = THREE.AdditiveBlending; p.transparent = true; p.depthWrite = false; }
  let m;
  if (o.basic) m = new THREE.MeshBasicMaterial(p);
  else if (o.phong) { p.flatShading = !!o.flat; p.shininess = 40; if (o.emissive) p.emissive = new THREE.Color(o.emissive); m = new THREE.MeshPhongMaterial(p); }
  else { if (o.emissive) p.emissive = new THREE.Color(o.emissive); m = new THREE.MeshLambertMaterial(p); }
  MAT[key] = m;
  return m;
}
function shade(hex, f) {
  const r = clamp(Math.round(((hex >> 16) & 255) * f), 0, 255), g = clamp(Math.round(((hex >> 8) & 255) * f), 0, 255), b = clamp(Math.round((hex & 255) * f), 0, 255);
  return (r << 16) | (g << 8) | b;
}
function mesh(geoName, color, o) {
  const m = new THREE.Mesh(G(geoName), M(color, o));
  return m;
}
function roundRect(ctx, x, y, w, hgt, r) {
  r = Math.min(r, w / 2, hgt / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + hgt, r); ctx.arcTo(x + w, y + hgt, x, y + hgt, r); ctx.arcTo(x, y + hgt, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function textTex(text, o) {
  o = Object.assign({ px: 30, color: '#1b2340', bg: '#f4f6fb', border: '#1b2340', font: 'display', weight: 700, pad: 12, radius: 12, lw: 3 }, o || {});
  const fam = o.font === 'mono' ? '"JetBrains Mono", "Noto Sans TC", monospace' : o.font === 'body' ? '"Chiron GoRound TC", "Noto Sans TC", sans-serif' : '"LXGW WenKai TC", "Noto Serif TC", "Noto Sans TC", serif';
  const S = 2, cv = document.createElement('canvas'), ctx = cv.getContext('2d');
  const spec = o.weight + ' ' + o.px * S + 'px ' + fam;
  const lines = String(text).split('\n');
  const tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  const ret = { tex, aspect: 1, onRedraw: null };
  const draw = () => {
    ctx.font = spec;
    let tw = 0;
    lines.forEach((l) => { tw = Math.max(tw, ctx.measureText(l).width); });
    const lh = o.px * S * 1.26;
    const W = Math.max(8, Math.ceil(tw + o.pad * 2 * S)), H = Math.max(8, Math.ceil(lh * lines.length + o.pad * S));
    cv.width = W; cv.height = H;
    ctx.font = spec; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (o.bg) {
      const lw = o.lw * S;
      roundRect(ctx, lw / 2, lw / 2, W - lw, H - lw, o.radius * S);
      ctx.fillStyle = o.bg; ctx.fill();
      if (o.border) { ctx.lineWidth = lw; ctx.strokeStyle = o.border; ctx.stroke(); }
    } else if (o.stroke) { ctx.lineWidth = 5 * S; ctx.strokeStyle = o.stroke; ctx.lineJoin = 'round'; lines.forEach((l, i) => ctx.strokeText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * lh + S)); }
    ctx.fillStyle = o.color;
    lines.forEach((l, i) => ctx.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * lh + S));
    tex.needsUpdate = true;
    ret.aspect = W / H;
  };
  draw();
  try {
    if (document.fonts && document.fonts.load) document.fonts.load(spec, String(text)).then(() => { draw(); if (ret.onRedraw) ret.onRedraw(ret.aspect); }).catch(() => {});
  } catch (e) { /* font loading API unavailable */ }
  return ret;
}
function skyTexture(stops) {
  const cv = document.createElement('canvas'); cv.width = 4; cv.height = 256;
  const ctx = cv.getContext('2d'), g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, stops[0]); g.addColorStop(0.55, stops[1]); g.addColorStop(1, stops[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(cv); t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
  return t;
}
function taperGeo(w, hgt, d, k) {
  const g = new THREE.BoxGeometry(w, hgt, d, 1, 1, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { if (p.getY(i) < 0) { p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } }
  p.needsUpdate = true; g.computeVertexNormals();
  return g;
}

// ---------- characters ----------
function makeRobot(o) {
  o = Object.assign({ body: 0xf4f6fb, accent: COL.blue, trim: COL.orange, visor: COL.ink, eye: 0x8ff5ff, hat: 'none', s: 1 }, o || {});
  const g = new THREE.Group(), u = g.userData;
  const add = (m, x, y, z, sx, sy, sz, parent) => { m.position.set(x, y, z); m.scale.set(sx, sy == null ? sx : sy, sz == null ? sx : sz); m.castShadow = true; (parent || g).add(m); return m; };
  const leg = (sx) => { const pv = new THREE.Group(); pv.position.set(sx * 0.18, 0.46, 0); g.add(pv); add(mesh('cyl', o.accent), 0, -0.2, 0, 0.11, 0.4, 0.11, pv); add(mesh('box', o.visor), 0, -0.41, 0.05, 0.24, 0.1, 0.34, pv); return pv; };
  u.legL = leg(-1); u.legR = leg(1);
  u.torso = new THREE.Group(); g.add(u.torso);
  add(mesh('sph', o.body), 0, 0.92, 0, 0.42, 0.5, 0.37, u.torso);
  add(mesh('box', o.accent), 0, 0.9, -0.36, 0.42, 0.44, 0.2, u.torso);
  add(mesh('cyl', o.accent, { emissive: shade(o.accent, 0.35) }), 0, 0.92, 0.345, 0.11, 0.05, 0.11, u.torso).rotation.x = Math.PI / 2;
  const scarf = add(mesh('torusFat', o.trim), 0, 1.28, 0, 0.27, 0.27, 0.27, u.torso); scarf.rotation.x = Math.PI / 2;
  add(mesh('box', o.trim), 0.16, 1.12, -0.3, 0.14, 0.34, 0.06, u.torso).rotation.z = 0.3;
  const arm = (sx) => { const pv = new THREE.Group(); pv.position.set(sx * 0.47, 1.12, 0); u.torso.add(pv); add(mesh('cyl', o.body), 0, -0.2, 0, 0.085, 0.36, 0.085, pv); add(mesh('sph', o.accent), 0, -0.42, 0, 0.11, 0.11, 0.11, pv); return pv; };
  u.armL = arm(-1); u.armR = arm(1);
  u.head = new THREE.Group(); u.head.position.set(0, 1.62, 0); u.torso.add(u.head);
  add(mesh('sph', o.body), 0, 0, 0, 0.38, 0.35, 0.36, u.head);
  add(mesh('box', o.visor), 0, 0.01, 0.27, 0.52, 0.22, 0.16, u.head);
  u.eyeL = add(mesh('sph', o.eye, { basic: true }), -0.12, 0.02, 0.345, 0.055, 0.075, 0.03, u.head);
  u.eyeR = add(mesh('sph', o.eye, { basic: true }), 0.12, 0.02, 0.345, 0.055, 0.075, 0.03, u.head);
  add(mesh('cyl', o.visor), -0.39, 0, 0, 0.07, 0.08, 0.07, u.head).rotation.z = Math.PI / 2;
  add(mesh('cyl', o.visor), 0.39, 0, 0, 0.07, 0.08, 0.07, u.head).rotation.z = Math.PI / 2;
  if (o.hat === 'none' || o.hat === 'antenna') {
    add(mesh('cyl', o.visor), 0, 0.44, 0, 0.02, 0.22, 0.02, u.head);
    u.bulb = add(mesh('sph', o.trim, { basic: true }), 0, 0.58, 0, 0.075, 0.075, 0.075, u.head);
  } else if (o.hat === 'cap') { add(mesh('cyl', o.trim), 0, 0.3, 0, 0.36, 0.14, 0.36, u.head); add(mesh('box', o.trim), 0, 0.26, 0.34, 0.5, 0.05, 0.3, u.head); }
  else if (o.hat === 'cone') { add(mesh('cone', o.trim), 0, 0.56, 0, 0.3, 0.6, 0.3, u.head); add(mesh('cyl', o.trim), 0, 0.28, 0, 0.44, 0.04, 0.44, u.head); }
  else if (o.hat === 'helmet') { add(mesh('sph', o.trim), 0, 0.12, -0.02, 0.4, 0.3, 0.39, u.head); add(mesh('box', 0xfff2a8, { basic: true }), 0, 0.3, 0.3, 0.14, 0.1, 0.1, u.head); }
  else if (o.hat === 'scholar') { add(mesh('box', o.trim), 0, 0.36, 0, 0.66, 0.05, 0.66, u.head); add(mesh('cyl', o.trim), 0, 0.3, 0, 0.26, 0.1, 0.26, u.head); }
  else if (o.hat === 'crown') { add(mesh('cyl6', o.trim, { phong: true, flat: true }), 0, 0.36, 0, 0.3, 0.2, 0.3, u.head); for (let i = 0; i < 6; i++) add(mesh('cone4', o.trim), Math.cos(i * TAU / 6) * 0.26, 0.52, Math.sin(i * TAU / 6) * 0.26, 0.07, 0.16, 0.07, u.head); }
  else if (o.hat === 'hood') { add(mesh('sph', o.trim), 0, 0.06, -0.06, 0.43, 0.4, 0.42, u.head); }
  g.scale.setScalar(o.s);
  u.baseS = o.s; u.phase = Math.random() * 10;
  return g;
}
function animRobot(m, t, move, grounded, dt) {
  const u = m.userData, w = (t + u.phase) * 11;
  if (grounded) {
    const s = Math.sin(w) * 0.85 * move;
    u.legL.rotation.x = s; u.legR.rotation.x = -s;
    u.armL.rotation.x = -s * 0.8; u.armR.rotation.x = s * 0.8;
    u.armL.rotation.z = lerp(u.armL.rotation.z, 0.12, 0.2); u.armR.rotation.z = lerp(u.armR.rotation.z, -0.12, 0.2);
    u.torso.position.y = Math.abs(Math.sin(w)) * 0.06 * move + Math.sin((t + u.phase) * 2.2) * 0.012;
    u.torso.rotation.x = 0.1 * move;
  } else {
    u.legL.rotation.x = lerp(u.legL.rotation.x, 0.5, 0.25); u.legR.rotation.x = lerp(u.legR.rotation.x, -0.3, 0.25);
    u.armL.rotation.z = lerp(u.armL.rotation.z, -2.2, 0.25); u.armR.rotation.z = lerp(u.armR.rotation.z, 2.2, 0.25);
    u.armL.rotation.x = 0; u.armR.rotation.x = 0;
    u.torso.rotation.x = -0.08;
  }
  u.head.rotation.y = Math.sin((t + u.phase) * 0.7) * 0.18 * (1 - move);
  const bl = ((t + u.phase) % 3.4) < 0.12 ? 0.15 : 1;
  u.eyeL.scale.y = 0.075 * bl; u.eyeR.scale.y = 0.075 * bl;
  if (u.bulb) u.bulb.scale.setScalar(0.075 * (1 + Math.sin(t * 5) * 0.15));
}
function makeGlow(color, size) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const ctx = cv.getContext('2d'), g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  const c = new THREE.Color(color), rgb = Math.round(c.r * 255) + ',' + Math.round(c.g * 255) + ',' + Math.round(c.b * 255);
  g.addColorStop(0, 'rgba(' + rgb + ',0.9)'); g.addColorStop(0.4, 'rgba(' + rgb + ',0.3)'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(cv);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  sp.scale.set(size, size, 1); sp.userData.own = true;
  return sp;
}
function makeKV() {
  const g = new THREE.Group();
  const gem = mesh('oct', COL.cyan, { phong: true, flat: true, emissive: 0x2a6a9a }); gem.scale.set(0.17, 0.24, 0.17); g.add(gem);
  const ring = mesh('torus', COL.gold, { basic: true }); ring.scale.setScalar(0.3); g.add(ring); g.userData.ring = ring;
  const glow = makeGlow(COL.cyan, 1.5); glow.userData.own = false; g.add(glow);
  return g;
}

// ---------- level + builder ----------
const B = {
  lv: null,
  begin(themeKey) {
    const th = THEMES[themeKey];
    const lv = {
      id: themeKey, theme: th, group: new THREE.Group(), skyTex: skyTexture(th.sky),
      cols: [], inter: [], anims: [], updates: [], movers: [], gems: [], triggers: [], onLand: [], pick: [], stations: {}, gates: [], route: [], anchors: {},
      spawn: { x: 0, y: 0, z: 0 }, killY: -16, cam: {}, bounds: { x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9 }
    };
    this.lv = lv;
    const ring = new THREE.Mesh(G('ring'), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.scale.setScalar(0.5); ring.visible = false; ring.userData = { t: 0, own: true }; lv.group.add(ring); lv.tapRing = ring;
    return lv;
  },
  add(m, x, y, z) { if (x != null) m.position.set(x, y, z); this.lv.group.add(m); return m; },
  col(x0, x1, y0, y1, z0, z1, o) { const c = Object.assign({ x0, x1, y0, y1, z0, z1 }, o || {}); this.lv.cols.push(c); return c; },
  // generic box centred at (x,y,z)
  box(x, y, z, w, hgt, d, color, o) {
    o = o || {};
    const m = mesh(o.geo || 'box', color, o);
    m.position.set(x, y, z); m.scale.set(w, hgt, d);
    m.castShadow = o.cast !== false; m.receiveShadow = o.recv !== false;
    if (o.ry) m.rotation.y = o.ry;
    (o.parent || this.lv.group).add(m);
    if (o.solid) m.userData.col = this.col(x - w / 2, x + w / 2, y - hgt / 2, y + hgt / 2, z - d / 2, z + d / 2, { walk: o.walk !== false, solid: true });
    if (o.pick) this.lv.pick.push(m);
    return m;
  },
  grow(x, z, w, d) { const b = this.lv.bounds; b.x0 = Math.min(b.x0, x - w / 2); b.x1 = Math.max(b.x1, x + w / 2); b.z0 = Math.min(b.z0, z - d / 2); b.z1 = Math.max(b.z1, z + d / 2); },
  island(x, z, w, d, y, o) {
    o = o || {}; y = y || 0;
    const th = this.lv.theme, top = o.top || th.top;
    const t = this.box(x, y - 0.25, z, w, 0.5, d, top, { cast: false, pick: true });
    this.box(x, y - 0.62, z, w + 0.34, 0.26, d + 0.34, o.trim || th.trim, { cast: true });
    if (!o.thin) {
      const g = taperGeo(w, 2.4, d, 0.62);
      const u = new THREE.Mesh(g, M(o.side || th.side)); u.position.set(x, y - 0.75 - 1.2, z); u.userData.own = true; u.userData.ownGeo = true; u.castShadow = false; this.lv.group.add(u);
    }
    const c = this.col(x - w / 2, x + w / 2, y - 3.2, y, z - d / 2, z + d / 2, { solid: true });
    this.grow(x, z, w, d);
    return { x, z, w, d, y, col: c, mesh: t, at: (uu, vv) => ({ x: x + uu * w / 2, z: z - vv * d / 2 }) };
  },
  // walkway between two points (axis-aligned)
  bridge(x0, z0, x1, z1, y, w, o) {
    o = o || {}; w = w || 2.6;
    const th = this.lv.theme, alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    const len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const bw = alongX ? len : w, bd = alongX ? w : len;
    const m = this.box(cx, y - 0.16, cz, bw, 0.32, bd, o.color || th.bridge, { pick: true });
    const n = Math.max(2, Math.round(len / 1.1));
    for (let i = 0; i <= n; i++) {
      const k = i / n - 0.5;
      const px = alongX ? cx + k * len : cx, pz = alongX ? cz : cz + k * len;
      this.box(px, y - 0.01, pz, alongX ? 0.08 : w, 0.03, alongX ? w : 0.08, shade(o.color || th.bridge, 0.78), { cast: false });
    }
    if (o.rails !== false) {
      [-1, 1].forEach((s) => {
        const rx = alongX ? cx : cx + s * (w / 2 - 0.08), rz = alongX ? cz + s * (w / 2 - 0.08) : cz;
        this.box(rx, y + 0.42, rz, alongX ? len : 0.1, 0.1, alongX ? 0.1 : len, shade(o.color || th.bridge, 0.7));
        for (let i = 0; i <= 2; i++) { const k = i / 2 - 0.5; this.box(alongX ? cx + k * len * 0.96 : rx, y + 0.2, alongX ? rz : cz + k * len * 0.96, 0.12, 0.5, 0.12, shade(o.color || th.bridge, 0.7)); }
      });
    }
    const c = this.col(cx - bw / 2, cx + bw / 2, y - 0.5, y, cz - bd / 2, cz + bd / 2, { solid: true });
    this.grow(cx, cz, bw, bd);
    return { col: c, mesh: m, x: cx, z: cz };
  },
  stone(x, z, y, s, o) {
    o = o || {}; s = s || 1.8;
    const th = this.lv.theme;
    const m = this.box(x, y - 0.3, z, s, 0.6, s, o.color || th.top, { pick: true });
    const g = taperGeo(s, 1.2, s, 0.5);
    const u = new THREE.Mesh(g, M(th.side)); u.position.set(x, y - 0.6 - 0.6, z); u.userData.own = true; u.userData.ownGeo = true; this.lv.group.add(u);
    const c = this.col(x - s / 2, x + s / 2, y - 1.6, y, z - s / 2, z + s / 2, { solid: true });
    this.grow(x, z, s, s);
    return { col: c, mesh: m, under: u, x, z, y };
  },
  label(text, x, y, z, o) {
    o = o || {};
    const t = textTex(text, o);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t.tex, transparent: true, depthWrite: false, depthTest: o.depthTest !== false }));
    const hgt = o.h || 0.7;
    sp.scale.set(hgt * t.aspect, hgt, 1);
    t.onRedraw = (a) => sp.scale.set(hgt * a, hgt, 1);
    sp.position.set(x, y, z); sp.userData.own = true; sp.renderOrder = 5;
    (o.parent || this.lv.group).add(sp);
    return sp;
  },
  // text lying flat on the ground, readable from the default camera
  decal(text, x, y, z, o) {
    o = o || {};
    const t = textTex(text, Object.assign({ bg: null, color: '#1b2340' }, o));
    const hgt = o.h || 0.8;
    const m = new THREE.Mesh(G('plane'), new THREE.MeshBasicMaterial({ map: t.tex, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.scale.set(hgt * t.aspect, hgt, 1);
    t.onRedraw = (a) => m.scale.set(hgt * a, hgt, 1);
    m.position.set(x, y + 0.03, z); m.userData.own = true; m.renderOrder = 2;
    (o.parent || this.lv.group).add(m);
    return m;
  },
  gem(x, y, z, id) {
    const lv = this.lv;
    const m = mesh('oct', COL.cyan, { phong: true, flat: true, emissive: 0x1f5f8f });
    m.scale.set(0.3, 0.44, 0.3); m.position.set(x, y, z); m.castShadow = true; lv.group.add(m);
    const g = { x, y, z, id, mesh: m, got: false };
    lv.gems.push(g);
    const ph = Math.random() * 6;
    lv.anims.push((dt, t) => { if (!g.got) { m.rotation.y = t * 2 + ph; m.position.y = y + Math.sin(t * 2.5 + ph) * 0.14; } });
    return g;
  },
  gemRow(x0, z0, x1, z1, y, n, prefix) { for (let i = 0; i < n; i++) { const k = n === 1 ? 0.5 : i / (n - 1); this.gem(lerp(x0, x1, k), y + 1, lerp(z0, z1, k), prefix + i); } },
  mover(x, y, z, w, d, move, o) {
    o = o || {};
    const m = this.box(x, y - 0.25, z, w, 0.5, d, o.color || this.lv.theme.accent, { pick: true });
    const c = this.col(x - w / 2, x + w / 2, y - 0.5, y, z - d / 2, z + d / 2, { solid: true, mover: true });
    const mv = { mesh: m, col: c, move, x, y: y - 0.25, z };
    this.lv.movers.push(mv);
    return mv;
  },
  // energy barrier across a walkway. axis 'x' means the barrier spans along X.
  gate(x, z, y, o) {
    o = o || {};
    const lv = this.lv, w = o.w || 3, axis = o.axis || 'x', th = lv.theme;
    const g = new THREE.Group(); g.position.set(x, y, z); lv.group.add(g);
    const post = (s) => { const p = mesh('box', COL.ink); p.scale.set(0.36, 3, 0.36); p.position.set(axis === 'x' ? s * (w / 2 + 0.1) : 0, 1.5, axis === 'x' ? 0 : s * (w / 2 + 0.1)); p.castShadow = true; g.add(p); const cap = mesh('oct', th.accent, { basic: true }); cap.scale.setScalar(0.26); cap.position.copy(p.position); cap.position.y = 3.3; g.add(cap); return cap; };
    const caps = [post(-1), post(1)];
    const bar = new THREE.Mesh(G('box'), new THREE.MeshBasicMaterial({ color: th.accent, transparent: true, opacity: 0.42, depthWrite: false }));
    bar.scale.set(axis === 'x' ? w : 0.14, 2.7, axis === 'x' ? 0.14 : w); bar.position.y = 1.4; bar.userData.own = true; g.add(bar);
    const lab = o.label ? this.label(o.label, 0, 3.9, 0, { parent: g, h: 0.62, px: 26 }) : null;
    const c = this.col(x - (axis === 'x' ? w / 2 + 0.3 : 0.3), x + (axis === 'x' ? w / 2 + 0.3 : 0.3), y - 1, y + 6, z - (axis === 'x' ? 0.3 : w / 2 + 0.3), z + (axis === 'x' ? 0.3 : w / 2 + 0.3), { solid: true, walk: false });
    const gate = { x, y, z, col: c, isOpen: false, need: o.need || [], group: g };
    lv.anims.push((dt, t) => { if (!gate.isOpen) { bar.material.opacity = 0.34 + Math.sin(t * 3) * 0.1; caps.forEach((cp) => { cp.rotation.y = t * 2; }); } });
    gate.open = (quiet) => {
      if (gate.isOpen) return;
      gate.isOpen = true;
      const i = lv.cols.indexOf(c); if (i >= 0) lv.cols.splice(i, 1);
      if (lab) lab.visible = false;
      if (quiet) { bar.visible = false; return; }
      AU.sfx('gate');
      E.fx.burst(x, y + 1.5, z, th.accent, 40, 5, 1);
      E.tween(0.6, (k) => { bar.scale.y = 2.7 * (1 - k); bar.position.y = 1.4 * (1 - k); bar.material.opacity = 0.4 * (1 - k); }, () => { bar.visible = false; });
    };
    lv.gates.push(gate);
    return gate;
  },
  // a learning station: pedestal + floating marker + name tag
  station(def, x, z, y, o) {
    o = o || {};
    const lv = this.lv, th = lv.theme;
    const g = new THREE.Group(); g.position.set(x, y, z); lv.group.add(g);
    const P = (geoName, color, px, py, pz, sx, sy, sz, mo) => { const m = mesh(geoName, color, mo); m.position.set(px, py, pz); m.scale.set(sx, sy, sz); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
    const look = def.look || 'terminal';
    P('cyl', COL.ink, 0, 0.12, 0, 1.25, 0.24, 1.25);
    P('cyl', th.accent, 0, 0.3, 0, 1.0, 0.14, 1.0);
    let spin = null;
    if (look === 'terminal') {
      P('box', COL.ink, 0, 0.9, 0, 0.5, 1.1, 0.4);
      const scr = P('box', COL.ink, 0, 1.75, 0.05, 1.5, 1.0, 0.16); scr.rotation.x = -0.2;
      const face = P('box', 0x8fe8ff, 0, 1.76, 0.15, 1.3, 0.8, 0.04, { basic: true }); face.rotation.x = -0.2;
    } else if (look === 'altar') {
      P('box', COL.paper, 0, 0.6, 0, 1.3, 0.5, 1.3); P('box', COL.ink, 0, 0.9, 0, 1.0, 0.14, 1.0);
      spin = P('ico', th.accent, 0, 1.75, 0, 0.42, 0.42, 0.42, { phong: true, flat: true, emissive: shade(th.accent, 0.3) });
    } else if (look === 'forge') {
      P('box', 0x4a4a55, 0, 0.75, 0, 1.5, 0.8, 1.0); P('box', 0x2a2a33, 0, 1.25, 0, 1.8, 0.26, 0.8);
      spin = P('box', 0xff9a3c, 0, 1.7, 0, 0.5, 0.2, 0.3, { basic: true });
    } else if (look === 'lectern') {
      P('box', 0x7a5a3a, 0, 0.85, 0, 0.36, 1.2, 0.36);
      const bk = P('box', COL.paper, 0, 1.55, 0.05, 1.3, 0.1, 0.9); bk.rotation.x = -0.45;
      const bk2 = P('box', th.accent, 0, 1.49, 0.02, 1.4, 0.06, 1.0); bk2.rotation.x = -0.45;
    } else if (look === 'machine') {
      P('box', 0x6b7fb0, 0, 1.0, 0, 1.5, 1.5, 1.1); P('box', COL.ink, 0, 1.2, 0.56, 1.0, 0.6, 0.06);
      P('cyl', COL.ink, 0.5, 2.0, 0, 0.14, 0.6, 0.14);
      spin = P('torusFat', th.accent, -0.3, 2.05, 0, 0.26, 0.26, 0.26); spin.rotation.x = Math.PI / 2;
    } else if (look === 'scale') {
      P('cyl', COL.ink, 0, 1.0, 0, 0.1, 1.5, 0.1); P('box', COL.ink, 0, 1.75, 0, 2.0, 0.1, 0.12);
      P('cyl', th.accent, -0.9, 1.4, 0, 0.42, 0.08, 0.42); P('cyl', th.accent, 0.9, 1.4, 0, 0.42, 0.08, 0.42);
    } else if (look === 'board') {
      P('box', 0x7a5a3a, -0.8, 1.0, 0, 0.14, 1.9, 0.14); P('box', 0x7a5a3a, 0.8, 1.0, 0, 0.14, 1.9, 0.14);
      P('box', COL.paper, 0, 1.5, 0, 2.0, 1.1, 0.1); P('box', COL.ink, 0, 1.5, -0.03, 2.14, 1.24, 0.08);
    } else if (look === 'crystal') {
      spin = P('oct', COL.cyan, 0, 1.5, 0, 0.6, 0.95, 0.6, { phong: true, flat: true, emissive: 0x1f5f8f });
    }
    const mk = mesh('oct', COL.orange, { basic: true }); mk.scale.set(0.24, 0.36, 0.24); mk.position.set(0, 3.5, 0); g.add(mk);
    const ringM = new THREE.Mesh(G('ring'), new THREE.MeshBasicMaterial({ color: COL.orange, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide }));
    ringM.rotation.x = -Math.PI / 2; ringM.position.y = 0.05; ringM.scale.setScalar(1.9); ringM.userData.own = true; g.add(ringM);
    const tag = this.label(def.name || def.title, 0, 2.95, 0, { parent: g, h: 0.56, px: 26 });
    this.col(x - 0.75, x + 0.75, y, y + 2.2, z - 0.6, z + 0.6, { solid: true, walk: false });
    const st = { def, x, y, z, group: g, done: false, locked: false };
    st.inter = { x, y, z, r: o.r || 2.6, label: def.title, fn: () => bus.emit('station', st) };
    lv.inter.push(st.inter);
    st.setDone = (d) => {
      st.done = d;
      const c = d ? COL.green : COL.orange;
      mk.material = M(c, { basic: true }); ringM.material.color.setHex(c);
    };
    st.setLocked = (l) => { st.locked = l; st.inter.enabled = !l; mk.visible = !l; ringM.material.opacity = l ? 0.2 : 0.7; };
    lv.anims.push((dt, t) => { mk.rotation.y = t * 2.2; mk.position.y = 3.5 + Math.sin(t * 3) * 0.12; const s = 1.9 + Math.sin(t * 3) * 0.08; ringM.scale.set(s, s, s); if (spin) spin.rotation.y = t * 1.3; });
    lv.stations[def.id] = st;
    return st;
  },
  npc(who, x, z, y, look, lines, o) {
    o = o || {};
    const lv = this.lv;
    const r = makeRobot(Object.assign({ s: 1.08 }, look));
    r.position.set(x, y, z); r.rotation.y = o.ry == null ? 0 : o.ry; lv.group.add(r);
    this.label(WHO[who].name, x, y + 2.75, z, { h: 0.5, px: 24, bg: '#1b2340', color: '#f4f6fb', border: '#f4f6fb' });
    this.col(x - 0.45, x + 0.45, y, y + 2, z - 0.45, z + 0.45, { solid: true, walk: false });
    lv.anims.push((dt, t) => animRobot(r, t, 0, true, dt));
    const it = { x, y, z, r: 2.4, label: '和' + WHO[who].name.split(' ').pop() + '說話', fn: () => { const ls = typeof lines === 'function' ? lines() : lines; UI.say(ls); } };
    lv.inter.push(it);
    return { model: r, inter: it };
  },
  portal(x, z, y, label) {
    const lv = this.lv, th = lv.theme;
    const g = new THREE.Group(); g.position.set(x, y, z); lv.group.add(g);
    const ring = mesh('torus', COL.gold, { phong: true }); ring.scale.setScalar(1.6); ring.position.y = 2.0; g.add(ring);
    const disc = new THREE.Mesh(G('disc'), new THREE.MeshBasicMaterial({ color: th.accent, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
    disc.scale.setScalar(1.5); disc.position.y = 2.0; disc.userData.own = true; g.add(disc);
    const base = mesh('cyl', COL.ink); base.scale.set(1.7, 0.3, 1.7); base.position.y = 0.15; g.add(base);
    const lab = this.label(label || '傳送門', 0, 4.3, 0, { parent: g, h: 0.6, px: 26 });
    const pt = { x, y, z, active: false, group: g };
    pt.inter = { x, y, z, r: 2.4, label: '進入傳送門', enabled: false, fn: () => bus.emit('portal', pt) };
    lv.inter.push(pt.inter);
    g.visible = false;
    pt.activate = (quiet) => { pt.active = true; pt.inter.enabled = true; g.visible = true; if (!quiet) { AU.sfx('open'); E.fx.burst(x, y + 2, z, COL.gold, 50, 5, 1.2); } };
    lv.anims.push((dt, t) => { if (pt.active) { disc.rotation.z = t * 1.5; disc.material.opacity = 0.45 + Math.sin(t * 4) * 0.15; ring.rotation.z = Math.sin(t) * 0.1; } });
    lv.portal = pt;
    return pt;
  },

  // ---------- decor ----------
  tree(x, z, y, s, c1, c2) {
    s = s || 1;
    this.box(x, y + 0.6 * s, z, 0.24 * s, 1.2 * s, 0.24 * s, 0x8a5a3a, { geo: 'cyl' });
    this.box(x, y + 1.7 * s, z, 0.95 * s, 1.5 * s, 0.95 * s, c1 || 0x4fa866, { geo: 'cone6' });
    this.box(x, y + 2.5 * s, z, 0.7 * s, 1.2 * s, 0.7 * s, c2 || 0x67c07c, { geo: 'cone6' });
    this.col(x - 0.25 * s, x + 0.25 * s, y, y + 2, z - 0.25 * s, z + 0.25 * s, { solid: true, walk: false });
  },
  bush(x, z, y, s, c) { this.box(x, y + 0.3 * (s || 1), z, 0.6 * (s || 1), 0.45 * (s || 1), 0.6 * (s || 1), c || 0x4fa866, { geo: 'sphLo' }); },
  rock(x, z, y, s, c) {
    s = s || 1;
    const m = this.box(x, y + 0.3 * s, z, 0.7 * s, 0.6 * s, 0.6 * s, c || 0x8a8f9a, { geo: 'ico', phong: true, flat: true });
    m.rotation.set(Math.random(), Math.random() * 3, Math.random());
    if (s > 0.9) this.col(x - 0.5 * s, x + 0.5 * s, y, y + 0.8 * s + 0.6, z - 0.45 * s, z + 0.45 * s, { solid: true, walk: false });
  },
  house(x, z, y, w, hgt, d, wall, roof) {
    this.box(x, y + hgt / 2, z, w, hgt, d, wall, { solid: true, walk: false });
    const r = this.box(x, y + hgt + w * 0.28, z, w * 0.82, w * 0.56, d * 0.82, roof, { geo: 'cone4' }); r.rotation.y = Math.PI / 4;
    this.box(x, y + hgt * 0.36, z + d / 2 + 0.02, w * 0.26, hgt * 0.62, 0.06, COL.ink, { cast: false });
    this.box(x + w * 0.28, y + hgt * 0.62, z + d / 2 + 0.02, w * 0.18, w * 0.18, 0.06, 0xffe9a8, { basic: true, cast: false });
  },
  lamp(x, z, y, c, hgt) {
    hgt = hgt || 2.4;
    this.box(x, y + hgt / 2, z, 0.08, hgt, 0.08, COL.ink, { geo: 'cyl' });
    this.box(x, y + hgt + 0.15, z, 0.2, 0.2, 0.2, c || 0xffe9a8, { geo: 'sph', basic: true, cast: false });
    const gl = makeGlow(c || 0xffe9a8, 2.2); gl.position.set(x, y + hgt + 0.15, z); this.lv.group.add(gl);
    this.col(x - 0.12, x + 0.12, y, y + 2, z - 0.12, z + 0.12, { solid: true, walk: false });
  },
  pillar(x, z, y, hgt, r, c, o) {
    o = o || {};
    this.box(x, y + 0.15, z, r * 1.35, 0.3, r * 1.35, shade(c, 0.85), { geo: 'cyl' });
    this.box(x, y + hgt / 2, z, r, hgt, r, c, { geo: 'cyl' });
    this.box(x, y + hgt - 0.12, z, r * 1.35, 0.24, r * 1.35, shade(c, 0.85), { geo: 'cyl' });
    if (!o.ghost) this.col(x - r, x + r, y, y + hgt, z - r, z + r, { solid: true, walk: false });
  },
  arch(x, z, y, w, hgt, c, axis) {
    const ax = axis || 'x';
    [-1, 1].forEach((s) => this.pillar(ax === 'x' ? x + s * w / 2 : x, ax === 'x' ? z : z + s * w / 2, y, hgt, 0.42, c));
    this.box(x, y + hgt + 0.3, z, ax === 'x' ? w + 1.4 : 1.0, 0.6, ax === 'x' ? 1.0 : w + 1.4, shade(c, 0.9));
  },
  crystals(x, z, y, s, c, n) {
    s = s || 1; n = n || 4;
    for (let i = 0; i < n; i++) {
      const a = i * 2.4 + x, rr = (i === 0 ? 0 : 0.45 * s), hh = (1.5 - i * 0.22) * s;
      const m = this.box(x + Math.cos(a) * rr, y + hh * 0.42, z + Math.sin(a) * rr, 0.3 * s, hh, 0.3 * s, c || COL.cyan, { geo: 'oct', phong: true, flat: true, emissive: shade(c || COL.cyan, 0.35) });
      m.rotation.z = Math.cos(a) * 0.25 * (i ? 1 : 0); m.rotation.x = Math.sin(a) * 0.25 * (i ? 1 : 0);
    }
    const gl = makeGlow(c || COL.cyan, 3.2 * s); gl.position.set(x, y + 0.9 * s, z); this.lv.group.add(gl);
    this.col(x - 0.4 * s, x + 0.4 * s, y, y + 1.6 * s, z - 0.4 * s, z + 0.4 * s, { solid: true, walk: false });
  },
  shelf(x, z, y, w, hgt, axis) {
    const ax = axis || 'x', bw = ax === 'x' ? w : 0.7, bd = ax === 'x' ? 0.7 : w;
    this.box(x, y + hgt / 2, z, bw, hgt, bd, 0x6a4a3a, { solid: true, walk: false });
    const cols = [0x5b7fd6, 0xec8b3c, 0x4fa866, 0xd9544f, 0xf2b632, 0xc58be0, 0xf4f6fb];
    const rows = Math.floor(hgt / 0.75), n = Math.floor(w / 0.26);
    for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++) {
      if ((i * 7 + r * 3) % 5 === 0) continue;
      const k = (i + 0.5) / n - 0.5, bh = 0.42 + ((i * 13 + r * 7) % 4) * 0.05, c = cols[(i * 3 + r * 5) % cols.length];
      [-1, 1].forEach((s) => this.box(ax === 'x' ? x + k * w * 0.94 : x + s * 0.3, y + 0.3 + r * 0.75 + bh / 2, ax === 'x' ? z + s * 0.3 : z + k * w * 0.94, ax === 'x' ? 0.2 : 0.14, bh, ax === 'x' ? 0.14 : 0.2, c, { cast: false }));
    }
  },
  crate(x, z, y, w, hgt, d, c, o) {
    this.box(x, y + hgt / 2, z, w, hgt, d, c, Object.assign({ solid: true }, o || {}));
    this.box(x, y + hgt / 2, z, w + 0.04, hgt * 0.12, d + 0.04, shade(c, 0.7), { cast: false });
  },
  torch(x, z, y, c) {
    this.box(x, y + 0.7, z, 0.1, 1.4, 0.1, COL.ink, { geo: 'cyl' });
    this.box(x, y + 1.45, z, 0.22, 0.16, 0.22, 0x4a4a55, { geo: 'cyl' });
    const f = this.box(x, y + 1.78, z, 0.2, 0.5, 0.2, c || 0xff9a3c, { geo: 'cone6', basic: true, cast: false });
    const gl = makeGlow(c || 0xff9a3c, 2.6); gl.position.set(x, y + 1.8, z); this.lv.group.add(gl);
    const ph = Math.random() * 9;
    this.lv.anims.push((dt, t) => { f.scale.y = 0.5 + Math.sin(t * 9 + ph) * 0.1; gl.material.opacity = 0.8 + Math.sin(t * 7 + ph) * 0.2; });
  },
  flag(x, z, y, c, hgt) {
    hgt = hgt || 3.2;
    this.box(x, y + hgt / 2, z, 0.07, hgt, 0.07, COL.ink, { geo: 'cyl' });
    const f = this.box(x + 0.5, y + hgt - 0.35, z, 0.95, 0.6, 0.04, c);
    const ph = Math.random() * 9;
    this.lv.anims.push((dt, t) => { f.rotation.y = Math.sin(t * 2.4 + ph) * 0.28; });
  },
  cloud(x, y, z, s, c) {
    const col = c == null ? this.lv.theme.cloud : c;
    const g = new THREE.Group(); g.position.set(x, y, z); this.lv.group.add(g);
    [[0, 0, 0, 1.4], [1.2, 0.15, 0.2, 1.0], [-1.2, 0.05, -0.1, 1.05], [0.4, 0.5, -0.3, 0.9]].forEach((q) => { const m = mesh('sphLo', col, { basic: true }); m.position.set(q[0] * s, q[1] * s, q[2] * s); m.scale.set(q[3] * s, q[3] * s * 0.62, q[3] * s * 0.8); g.add(m); });
    const ph = Math.random() * 9;
    this.lv.anims.push((dt, t) => { g.position.x = x + Math.sin(t * 0.08 + ph) * 3; });
    return g;
  },
  // far-away set dressing shared by every world
  backdrop(o) {
    o = o || {};
    const lv = this.lv, th = lv.theme, b = lv.bounds;
    const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, span = Math.max(b.x1 - b.x0, b.z1 - b.z0) + 70;
    const sea = new THREE.Mesh(G('plane'), M(th.cloud, { basic: true, opacity: 0.55 }));
    sea.rotation.x = -Math.PI / 2; sea.scale.set(span * 3, span * 3, 1); sea.position.set(cx, lv.killY + 3, cz); lv.group.add(sea);
    const rng = mulberry((o.seed || 5) * 977);
    for (let i = 0; i < (o.clouds == null ? 9 : o.clouds); i++) this.cloud(cx + (rng() - 0.5) * span * 1.3, -7 + rng() * 5 + (i % 3 === 0 ? 22 : 0), cz + (rng() - 0.5) * span * 1.3 - 10, 1.6 + rng() * 2.2);
    // drifting token cubes in the paper's three chunk colours
    const bits = [];
    const cc = [COL.blue, COL.orange, COL.green, COL.paper];
    for (let i = 0; i < (o.bits == null ? 26 : o.bits); i++) {
      const m = mesh('box', cc[i % 4], { opacity: 0.85 });
      const s = 0.25 + rng() * 0.4; m.scale.setScalar(s);
      m.position.set(cx + (rng() - 0.5) * span, 3 + rng() * 16, cz + (rng() - 0.5) * span);
      lv.group.add(m); bits.push({ m, y: m.position.y, ph: rng() * 9, sp: 0.3 + rng() * 0.6 });
    }
    lv.anims.push((dt, t) => { for (let i = 0; i < bits.length; i++) { const q = bits[i]; q.m.rotation.x = t * q.sp; q.m.rotation.y = t * q.sp * 0.7; q.m.position.y = q.y + Math.sin(t * q.sp + q.ph) * 0.8; } });
    // motes
    const N = 140, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { pos[i * 3] = cx + (rng() - 0.5) * span * 0.8; pos[i * 3 + 1] = rng() * 14; pos[i * 3 + 2] = cz + (rng() - 0.5) * span * 0.8; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: th.mote, size: 0.14, transparent: true, opacity: 0.75, depthWrite: false }));
    pts.userData.own = true; pts.userData.ownGeo = true; lv.group.add(pts);
    lv.anims.push((dt, t) => { pts.position.y = Math.sin(t * 0.3) * 0.6; pts.rotation.y = Math.sin(t * 0.05) * 0.05; });
  },

  // ---------- path layout helper ----------
  path(x, z, y, heading) {
    const self = this;
    const D = { F: [0, -1], L: [-1, 0], R: [1, 0], B: [0, 1] };
    const P = { x, z, y: y || 0, h: heading || 'F', last: null };
    P.island = (w, d, o) => {
      const v = D[P.h];
      const ex = v[0] !== 0 ? d : w, ez = v[0] !== 0 ? w : d;
      const cx = P.x + v[0] * ex / 2, cz = P.z + v[1] * ez / 2;
      const r = self.island(cx, cz, ex, ez, P.y, o);
      r.enter = { x: P.x, z: P.z, h: P.h };
      self.lv.route.push({ x: cx, z: cz, y: P.y, w: ex, d: ez, island: true });
      P.x += v[0] * ex; P.z += v[1] * ez; P.last = r;
      return r;
    };
    P.exit = (dir, off) => {
      const r = P.last, v = D[dir]; off = off || 0;
      P.h = dir;
      P.x = r.x + v[0] * r.w / 2 + (v[0] === 0 ? off : 0);
      P.z = r.z + v[1] * r.d / 2 + (v[1] === 0 ? off : 0);
      self.lv.route.push({ x: P.x - v[0] * 1.2, z: P.z - v[1] * 1.2, y: P.y });
      return P;
    };
    P.bridge = (len, w, o) => {
      const v = D[P.h];
      const nx = P.x + v[0] * len, nz = P.z + v[1] * len;
      const br = self.bridge(P.x, P.z, nx, nz, P.y, w || 2.8, o);
      P.x = nx; P.z = nz;
      self.lv.route.push({ x: nx - v[0] * 0.6, z: nz - v[1] * 0.6, y: P.y });
      return br;
    };
    P.gate = (o) => {
      const v = D[P.h];
      return self.gate(P.x + v[0] * 0.5, P.z + v[1] * 0.5, P.y, Object.assign({ axis: v[0] !== 0 ? 'z' : 'x', w: 2.8 }, o || {}));
    };
    P.stones = (n, gap, size, rise) => {
      const v = D[P.h], out = []; gap = gap || 1.3; size = size || 1.9; rise = rise || 0;
      for (let i = 0; i < n; i++) {
        P.y += rise;
        const cx = P.x + v[0] * (gap + size / 2), cz = P.z + v[1] * (gap + size / 2);
        out.push(self.stone(cx, cz, P.y, size));
        self.lv.route.push({ x: cx, z: cz, y: P.y });
        P.x += v[0] * (gap + size); P.z += v[1] * (gap + size);
      }
      P.x += v[0] * gap; P.z += v[1] * gap;
      return out;
    };
    P.stairs = (n, rise, w) => {
      const v = D[P.h]; rise = rise == null ? 0.45 : rise; w = w || 3;
      const th = self.lv.theme;
      for (let i = 0; i < n; i++) {
        P.y += rise;
        const cx = P.x + v[0] * 0.5, cz = P.z + v[1] * 0.5;
        const bw = v[0] !== 0 ? 1 : w, bd = v[0] !== 0 ? w : 1;
        self.box(cx, P.y - 0.6, cz, bw, 1.2, bd, i % 2 ? th.trim : th.top, { pick: true });
        self.col(cx - bw / 2, cx + bw / 2, P.y - 1.2, P.y, cz - bd / 2, cz + bd / 2, { solid: true });
        self.grow(cx, cz, bw, bd);
        P.x += v[0]; P.z += v[1];
      }
      self.lv.route.push({ x: P.x - v[0] * 0.4, z: P.z - v[1] * 0.4, y: P.y });
    };
    P.gap = (len, o) => { const v = D[P.h]; P.x += v[0] * len; P.z += v[1] * len; self.lv.route.push(Object.assign({ x: P.x + v[0] * 0.8, z: P.z + v[1] * 0.8, y: P.y, nojump: true }, o || {})); };
    return P;
  }
};
