// ===== 3D engine: renderer, player, camera, input, collisions =====
const PH = { speed: 6.4, accel: 13, g: 30, jump: 10.6, r: 0.42, height: 1.5, step: 0.58, guard: 0.8 };
const E = {
  ok: false, running: false, mode: 'idle', t: 0, quality: 'high',
  level: null, tweens: [], auto: null, focusT: 0, focusPos: null, lockInput: false,
  keys: {}, stick: { x: 0, y: 0, on: false }, jumpQ: false,
  camYaw: 0, camPitch: 0.74, camDist: 13.5, yawOff: 0, pitchOff: 0,
  p: null,

  init(canvas) {
    if (!window.THREE) return false;
    try {
      this.canvas = canvas;
      const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
      this.renderer = r;
      r.shadowMap.type = THREE.PCFSoftShadowMap;
      this.scene = new THREE.Scene();
      this.cam = new THREE.PerspectiveCamera(48, 1, 0.3, 400);
      this.camTarget = new THREE.Vector3();
      this.hemi = new THREE.HemisphereLight(0xffffff, 0x445577, 0.85);
      this.sun = new THREE.DirectionalLight(0xffffff, 0.75);
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(1024, 1024);
      const sc = this.sun.shadow.camera;
      sc.left = -24; sc.right = 24; sc.top = 24; sc.bottom = -24; sc.near = 1; sc.far = 90;
      this.sun.shadow.bias = -0.0012;
      this.scene.add(this.hemi, this.sun, this.sun.target);
      this.ray = new THREE.Raycaster();
      this.p = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, grounded: true, groundCol: null, air: 0, coy: 0, safe: new THREE.Vector3(), safeT: 0, moveAmt: 0, squash: 0, model: null, carry: null };
      this.fxInit();
      this.bindInput();
      this.setQuality(SV.d.opt.q || 'auto');
      this.resize();
      window.addEventListener('resize', () => this.resize());
      if (window.ResizeObserver) new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
      this.ok = true;
      return true;
    } catch (e) {
      console.warn('WebGL init failed', e);
      this.ok = false;
      return false;
    }
  },

  setQuality(q) {
    if (!this.renderer) return;
    this.qPref = q;
    const coarse = isCoarse();
    const eff = q === 'auto' ? (coarse ? 'mid' : 'high') : q;
    this.quality = eff;
    const dpr = window.devicePixelRatio || 1;
    this.renderer.setPixelRatio(eff === 'low' ? 1 : Math.min(dpr, eff === 'mid' ? 1.5 : 2));
    this.renderer.shadowMap.enabled = eff !== 'low';
    this.sun.castShadow = eff !== 'low';
    this.scene.traverse((o) => { if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.needsUpdate = true; }); } });
    this.resize();
  },

  resize() {
    if (!this.renderer) return;
    const w = Math.max(1, this.canvas.parentElement.clientWidth), hgt = Math.max(1, this.canvas.parentElement.clientHeight);
    this.renderer.setSize(w, hgt, false);
    this.cam.aspect = w / hgt;
    this.portrait = w < hgt;
    this.cam.fov = this.portrait ? 58 : 48;
    this.cam.updateProjectionMatrix();
  },

  // ---------- input ----------
  bindInput() {
    const c = this.canvas;
    window.addEventListener('keydown', (e) => {
      if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].indexOf(k) >= 0) e.preventDefault();
      if (!this.keys[k]) bus.emit('key', k, e);
      this.keys[k] = true;
      if (k === ' ' && !UI.blocking()) this.jumpQ = true;
    });
    window.addEventListener('keyup', (e) => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; this.keys[k] = false; });
    window.addEventListener('blur', () => { this.keys = {}; this.stick.on = false; this.stick.x = this.stick.y = 0; });

    // virtual stick
    const st = $('#stick'), knob = $('#stick-knob');
    let sid = null;
    const setStick = (e) => {
      const r = st.getBoundingClientRect();
      let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      const len = Math.hypot(dx, dy);
      if (len > 1) { dx /= len; dy /= len; }
      this.stick.x = dx; this.stick.y = dy; this.stick.on = true;
      knob.style.transform = 'translate(' + dx * r.width * 0.3 + 'px,' + dy * r.height * 0.3 + 'px)';
    };
    const endStick = () => { sid = null; this.stick.on = false; this.stick.x = this.stick.y = 0; knob.style.transform = ''; };
    st.addEventListener('pointerdown', (e) => { e.preventDefault(); AU.init(); sid = e.pointerId; try { st.setPointerCapture(sid); } catch (er) { /* no capture */ } setStick(e); });
    st.addEventListener('pointermove', (e) => { if (e.pointerId === sid) setStick(e); });
    st.addEventListener('pointerup', (e) => { if (e.pointerId === sid) endStick(); });
    st.addEventListener('pointercancel', endStick);
    $('#btn-jump').addEventListener('pointerdown', (e) => { e.preventDefault(); AU.init(); if (!UI.blocking()) this.jumpQ = true; });

    // canvas: tap to walk, drag to look around, wheel to zoom
    let drag = null;
    c.addEventListener('pointerdown', (e) => {
      AU.init();
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: false };
      try { c.setPointerCapture(e.pointerId); } catch (er) { /* no capture */ }
    });
    c.addEventListener('pointermove', (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 9) drag.moved = true;
      if (drag.moved && this.mode === 'play') {
        this.yawOff = clamp(this.yawOff - dx * 0.006, -1.5, 1.5);
        this.pitchOff = clamp(this.pitchOff + dy * 0.004, -0.4, 0.4);
        this.lookT = this.t;
      }
      drag.x = e.clientX; drag.y = e.clientY;
    });
    const up = (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      const d = drag; drag = null;
      if (!d.moved && performance.now() - d.t < 400) this.tap(e.clientX, e.clientY);
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', () => { drag = null; });
    c.addEventListener('wheel', (e) => { e.preventDefault(); this.camDist = clamp(this.camDist + e.deltaY * 0.01, 8, 22); }, { passive: false });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
  },

  tap(cx, cy) {
    if (this.mode !== 'play' || UI.blocking() || this.lockInput || !this.level) return;
    const r = this.canvas.getBoundingClientRect();
    const v = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(v, this.cam);
    const hits = this.ray.intersectObjects(this.level.pick, false);
    if (!hits.length) return;
    const pt = hits[0].point;
    let near = null, nd = 2.2;
    this.level.inter.forEach((it) => { if (it.enabled === false) return; const d = Math.hypot(it.x - pt.x, it.z - pt.z); if (d < nd) { nd = d; near = it; } });
    this.auto = { x: near ? near.x : pt.x, z: near ? near.z : pt.z, inter: near, stuck: 0, last: this.p.pos.clone() };
    if (this.level.tapRing) { this.level.tapRing.position.set(this.auto.x, pt.y + 0.06, this.auto.z); this.level.tapRing.visible = true; this.level.tapRing.userData.t = 0; }
  },

  // ---------- level plumbing ----------
  setLevel(lv) {
    this.clearLevel();
    this.level = lv;
    this.scene.add(lv.group);
    const th = lv.theme;
    this.scene.background = lv.skyTex;
    this.scene.fog = new THREE.Fog(th.fog, th.fogNear || 34, th.fogFar || 95);
    this.hemi.color.setHex(th.hemiSky); this.hemi.groundColor.setHex(th.hemiGround); this.hemi.intensity = th.hemiI == null ? 0.62 : th.hemiI;
    this.sun.color.setHex(th.sun); this.sun.intensity = th.sunI == null ? 0.5 : th.sunI;
    this.sunDir = new THREE.Vector3(th.sunDir[0], th.sunDir[1], th.sunDir[2]).normalize();
    this.camYaw = lv.cam.yaw || 0; this.camPitch = lv.cam.pitch || 0.74; this.camDist = lv.cam.dist || 13.5;
    this.yawOff = 0; this.pitchOff = 0;
    const s = lv.spawn;
    this.teleport(s.x, s.y, s.z);
    this.p.yaw = Math.PI;
    if (this.p.model) { if (!this.p.model.parent) this.scene.add(this.p.model); this.p.model.visible = lv.showPlayer !== false; }
    if (this.kv) { if (!this.kv.parent) this.scene.add(this.kv); this.kv.visible = lv.showPlayer !== false; this.kv.position.set(s.x + 1, s.y + 2, s.z); }
    if (this.blob) this.blob.visible = lv.showPlayer !== false;
    this.snapCam();
  },
  clearLevel() {
    const lv = this.level;
    if (!lv) return;
    this.scene.remove(lv.group);
    lv.group.traverse((o) => {
      if (o.userData && o.userData.own) {
        if (o.geometry) o.geometry.dispose();
        if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
      }
    });
    if (lv.skyTex) lv.skyTex.dispose();
    this.level = null; this.auto = null; this.tweens.length = 0; this.focusPos = null; this.lockInput = false;
    if (this.p) this.p.carry = null;
    UI.setPrompt(null); UI.actHud(null);
  },
  teleport(x, y, z) {
    const p = this.p;
    p.pos.set(x, y, z); p.vel.set(0, 0, 0); p.grounded = true; p.groundCol = null; p.safe.set(x, y, z); p.air = 0;
    this.auto = null;
  },
  snapCam() {
    const p = this.p;
    this.camTarget.set(p.pos.x, p.pos.y + 1.3 + ((this.level && this.level.camLift) || 0), p.pos.z);
    this.placeCam(1);
  },
  placeCam(k) {
    const yaw = this.camYaw + this.yawOff, pitch = clamp(this.camPitch + this.pitchOff, 0.25, 1.25);
    const d = this.camDist * (this.portrait ? 1.28 : 1);
    const cx = this.camTarget.x + Math.sin(yaw) * Math.cos(pitch) * d;
    const cy = this.camTarget.y + Math.sin(pitch) * d;
    const cz = this.camTarget.z + Math.cos(yaw) * Math.cos(pitch) * d;
    if (k >= 1) this.cam.position.set(cx, cy, cz);
    else { this.cam.position.x = lerp(this.cam.position.x, cx, k); this.cam.position.y = lerp(this.cam.position.y, cy, k); this.cam.position.z = lerp(this.cam.position.z, cz, k); }
    this.cam.lookAt(this.camTarget);
  },
  // short cinematic look at a point; resolves when the camera comes back
  focus(x, y, z, secs) {
    return new Promise((res) => {
      this.focusPos = new THREE.Vector3(x, y, z); this.focusT = secs || 1.6; this.focusRes = res; this.lockInput = true;
    });
  },
  tween(dur, fn, done) { this.tweens.push({ t: 0, dur, fn, done }); },
  addCol(c) { this.level.cols.push(c); return c; },
  removeCol(c) { const i = this.level.cols.indexOf(c); if (i >= 0) this.level.cols.splice(i, 1); },
  addInter(it) { this.level.inter.push(it); return it; },
  removeInter(it) { const i = this.level.inter.indexOf(it); if (i >= 0) this.level.inter.splice(i, 1); },

  groundAt(x, z, maxY) {
    const cols = this.level.cols;
    let best = null, by = -1e9;
    const m = 0.16;
    for (let i = 0; i < cols.length; i++) {
      const c = cols[i];
      if (c.walk === false) continue;
      if (x < c.x0 - m || x > c.x1 + m || z < c.z0 - m || z > c.z1 + m) continue;
      if (c.y1 > maxY || c.y1 < by) continue;
      by = c.y1; best = c;
    }
    return best;
  },
  groundWide(x, z, maxY) {
    let g = this.groundAt(x, z, maxY);
    const o = PH.r * 0.6;
    const pts = [[o, 0], [-o, 0], [0, o], [0, -o]];
    for (let i = 0; i < 4; i++) { const h2 = this.groundAt(x + pts[i][0], z + pts[i][1], maxY); if (h2 && (!g || h2.y1 > g.y1)) g = h2; }
    return g;
  },
  pushOut(pos, feet) {
    const cols = this.level.cols, r = PH.r;
    for (let it = 0; it < 2; it++) {
      for (let i = 0; i < cols.length; i++) {
        const c = cols[i];
        if (c.solid === false) continue;
        if (c.y1 <= feet + PH.step || c.y0 >= feet + PH.height) continue;
        const cx = clamp(pos.x, c.x0, c.x1), cz = clamp(pos.z, c.z0, c.z1);
        let dx = pos.x - cx, dz = pos.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;
        if (d2 > 1e-8) { const d = Math.sqrt(d2); pos.x += (dx / d) * (r - d); pos.z += (dz / d) * (r - d); }
        else {
          const l = pos.x - c.x0, rr = c.x1 - pos.x, n = pos.z - c.z0, f = c.z1 - pos.z, mn = Math.min(l, rr, n, f);
          if (mn === l) pos.x = c.x0 - r; else if (mn === rr) pos.x = c.x1 + r; else if (mn === n) pos.z = c.z0 - r; else pos.z = c.z1 + r;
        }
      }
    }
  },

  // ---------- frame ----------
  start() { if (this.running || !this.ok) return; this.running = true; this.last = performance.now(); requestAnimationFrame((t) => this.frame(t)); },
  frame(now) {
    if (!this.running) return;
    requestAnimationFrame((t) => this.frame(t));
    let dt = (now - this.last) / 1000; this.last = now;
    if (dt > 0.05) dt = 0.05; if (dt <= 0) return;
    this.t += dt;
    this.perf(dt);
    const lv = this.level;
    if (lv) {
      const paused = UI.blocking();
      if (this.mode === 'play') {
        this.moveMovers(dt, lv);
        this.updatePlayer(dt, paused);
        if (!paused) { this.updateInteract(); for (let i = 0; i < lv.updates.length; i++) lv.updates[i](dt, this.t); }
      } else if (this.mode === 'title') {
        this.camYaw += dt * 0.12;
        for (let i = 0; i < lv.updates.length; i++) lv.updates[i](dt, this.t);
      }
      for (let i = 0; i < lv.anims.length; i++) lv.anims[i](dt, this.t);
      for (let i = this.tweens.length - 1; i >= 0; i--) {
        const tw = this.tweens[i]; tw.t += dt;
        const k = Math.min(1, tw.t / tw.dur);
        tw.fn(k);
        if (k >= 1) { this.tweens.splice(i, 1); if (tw.done) tw.done(); }
      }
      this.fxUpdate(dt);
      this.updateCam(dt);
    }
    this.renderer.render(this.scene, this.cam);
  },
  perf(dt) {
    if (this.qPref !== 'auto' || this.mode !== 'play') return;
    this.pfT = (this.pfT || 0) + dt; this.pfN = (this.pfN || 0) + 1;
    if (this.pfT > 4) {
      const fps = this.pfN / this.pfT; this.pfT = 0; this.pfN = 0;
      if (fps < 26 && this.quality !== 'low') { this.slow = (this.slow || 0) + 1; if (this.slow >= 2) { const nq = this.quality === 'high' ? 'mid' : 'low'; this.quality = nq; this.renderer.setPixelRatio(nq === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, 1.5)); if (nq === 'low') { this.renderer.shadowMap.enabled = false; this.sun.castShadow = false; this.scene.traverse((o) => { if (o.material && o.material.needsUpdate !== undefined) o.material.needsUpdate = true; }); } this.resize(); this.slow = 0; } }
      else this.slow = 0;
    }
  },
  moveMovers(dt, lv) {
    const p = this.p;
    for (let i = 0; i < lv.movers.length; i++) {
      const m = lv.movers[i];
      const ox = m.mesh.position.x, oy = m.mesh.position.y, oz = m.mesh.position.z;
      m.move(this.t, m);
      const dx = m.mesh.position.x - ox, dy = m.mesh.position.y - oy, dz = m.mesh.position.z - oz;
      const c = m.col;
      c.x0 += dx; c.x1 += dx; c.y0 += dy; c.y1 += dy; c.z0 += dz; c.z1 += dz;
      if (p.grounded && p.groundCol === c) { p.pos.x += dx; p.pos.y += dy; p.pos.z += dz; }
    }
  },
  inputVec() {
    let ix = 0, iz = 0;
    const k = this.keys;
    if (k.a || k.ArrowLeft) ix -= 1; if (k.d || k.ArrowRight) ix += 1;
    if (k.w || k.ArrowUp) iz -= 1; if (k.s || k.ArrowDown) iz += 1;
    if (this.stick.on) { ix += this.stick.x; iz += this.stick.y; }
    const len = Math.hypot(ix, iz);
    if (len > 1) { ix /= len; iz /= len; }
    return [ix, iz, len];
  },
  updatePlayer(dt, paused) {
    const p = this.p, lv = this.level;
    let wx = 0, wz = 0;
    const frozen = paused || this.lockInput;
    if (!frozen) {
      const iv = this.inputVec();
      if (iv[2] > 0.08) {
        this.auto = null;
        const yaw = this.camYaw + this.yawOff;
        const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
        wx = rx * iv[0] + fx * -iv[1]; wz = rz * iv[0] + fz * -iv[1];
      } else if (this.auto) {
        const a = this.auto, dx = a.x - p.pos.x, dz = a.z - p.pos.z, d = Math.hypot(dx, dz);
        const stopAt = a.inter ? Math.max(0.9, (a.inter.r || 2.2) * 0.6) : 0.22;
        if (d < stopAt) {
          const it = a.inter; this.auto = null;
          if (it && it.enabled !== false && UI.promptActs && UI.promptActs.length === 1 && !it.noAuto) UI.firePrompt(0);
        } else {
          wx = dx / d; wz = dz / d;
          a.stuck += dt;
          if (a.stuck > 0.5) { if (a.last.distanceTo(p.pos) < 0.25) this.auto = null; else { a.last.copy(p.pos); a.stuck = 0; } }
        }
      }
    } else this.jumpQ = false;
    const sp = PH.speed * (lv.speedMul || 1);
    const k = 1 - Math.exp(-PH.accel * dt);
    p.vel.x = lerp(p.vel.x, wx * sp, k); p.vel.z = lerp(p.vel.z, wz * sp, k);
    if (frozen) { p.vel.x *= 0.8; p.vel.z *= 0.8; }
    // jump
    p.coy = p.grounded ? 0.11 : Math.max(0, p.coy - dt);
    let jumped = false;
    if (this.jumpQ) {
      this.jumpQ = false;
      if (p.coy > 0 && !frozen) { p.vel.y = PH.jump * (lv.jumpMul || 1); p.grounded = false; p.coy = 0; jumped = true; p.squash = -0.25; AU.sfx('jump'); this.fx.burst(p.pos.x, p.pos.y + 0.1, p.pos.z, 0xffffff, 6, 1.6, 0.4); }
    }
    const feet = p.pos.y;
    let nx = p.pos.x + p.vel.x * dt, nz = p.pos.z + p.vel.z * dt;
    // ledge guard: walking never drops you off an edge; jumping can
    if (p.grounded && !jumped) {
      const okAt = (x, z) => { const g = this.groundWide(x, z, feet + PH.step); return g && g.y1 >= feet - PH.guard; };
      if (!okAt(nx, nz)) {
        if (okAt(nx, p.pos.z)) nz = p.pos.z; else if (okAt(p.pos.x, nz)) nx = p.pos.x; else { nx = p.pos.x; nz = p.pos.z; }
      }
    }
    const np = this._np || (this._np = new THREE.Vector3());
    np.set(nx, 0, nz);
    this.pushOut(np, feet);
    p.pos.x = np.x; p.pos.z = np.z;
    // vertical
    p.vel.y -= PH.g * dt;
    if (p.vel.y < -30) p.vel.y = -30;
    let ny = p.pos.y + p.vel.y * dt;
    const g = this.groundWide(p.pos.x, p.pos.z, feet + PH.step);
    const was = p.grounded;
    if (g && ny <= g.y1 && p.vel.y <= 0) {
      ny = g.y1; p.vel.y = 0; p.grounded = true; p.groundCol = g;
      if (!was) {
        if (p.air > 0.18) { AU.sfx('land'); p.squash = 0.28; this.fx.burst(p.pos.x, ny + 0.05, p.pos.z, 0xffffff, 8, 2, 0.45); for (let i = 0; i < lv.onLand.length; i++) lv.onLand[i](g, p.air); }
      }
      p.air = 0;
    } else { p.grounded = false; p.air += dt; if (!g || ny > g.y1 + 0.05) p.groundCol = null; }
    p.pos.y = ny;
    if (p.grounded && g && !g.unsafe) { p.safeT += dt; if (p.safeT > 0.25) { p.safeT = 0; const gi = this.groundAt(p.pos.x, p.pos.z, feet + PH.step); if (gi && gi === g && !g.mover) p.safe.copy(p.pos); } }
    if (p.pos.y < lv.killY) {
      this.teleport(p.safe.x, p.safe.y + 0.2, p.safe.z);
      AU.sfx('drop'); bus.emit('fell');
    }
    // model
    const hv = Math.hypot(p.vel.x, p.vel.z);
    p.moveAmt = lerp(p.moveAmt, clamp(hv / PH.speed, 0, 1), 1 - Math.exp(-10 * dt));
    if (hv > 0.4) {
      const want = Math.atan2(p.vel.x, p.vel.z);
      let d = want - p.yaw; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
      p.yaw += d * (1 - Math.exp(-14 * dt));
    }
    p.squash = lerp(p.squash, 0, 1 - Math.exp(-9 * dt));
    if (p.model) {
      const m = p.model;
      m.position.x = p.pos.x; m.position.z = p.pos.z;
      m.position.y = lerp(m.position.y, p.pos.y, Math.abs(m.position.y - p.pos.y) > 1.2 ? 1 : 1 - Math.exp(-28 * dt));
      m.rotation.y = p.yaw;
      m.scale.set(1 + p.squash * 0.5, 1 - p.squash, 1 + p.squash * 0.5);
      animRobot(m, this.t, p.moveAmt, p.grounded, dt);
      if (p.grounded && p.moveAmt > 0.5) { this.stepT = (this.stepT || 0) + dt * p.moveAmt; if (this.stepT > 0.3) { this.stepT = 0; AU.sfx('step'); } }
    }
    if (this.blob) {
      const bg = this.groundAt(p.pos.x, p.pos.z, p.pos.y + 0.2);
      if (bg) { this.blob.visible = lv.showPlayer !== false; this.blob.position.set(p.pos.x, bg.y1 + 0.03, p.pos.z); const s = clamp(1 - (p.pos.y - bg.y1) * 0.22, 0.35, 1); this.blob.scale.set(s, s, s); }
      else this.blob.visible = false;
    }
    if (this.kv) {
      const yaw = this.camYaw + this.yawOff;
      const tx = p.pos.x + Math.cos(yaw) * 1.05 + Math.sin(p.yaw) * -0.5, tz = p.pos.z - Math.sin(yaw) * 1.05 + Math.cos(p.yaw) * -0.5;
      const ty = p.pos.y + 1.95 + Math.sin(this.t * 2.4) * 0.14;
      const kk = 1 - Math.exp(-4 * dt);
      this.kv.position.x = lerp(this.kv.position.x, tx, kk); this.kv.position.y = lerp(this.kv.position.y, ty, kk); this.kv.position.z = lerp(this.kv.position.z, tz, kk);
      this.kv.rotation.y += dt * 1.6;
      if (this.kv.userData.ring) this.kv.userData.ring.rotation.x += dt * 2.2;
    }
    if (p.carry) { p.carry.position.set(p.pos.x, p.model.position.y + 2.45 + Math.sin(this.t * 4) * 0.05, p.pos.z); p.carry.rotation.y += dt * 1.5; }
    // sun follows the player so shadows stay sharp near them
    this.sun.position.set(p.pos.x + this.sunDir.x * 40, p.pos.y + this.sunDir.y * 40, p.pos.z + this.sunDir.z * 40);
    this.sun.target.position.set(p.pos.x, p.pos.y, p.pos.z);
    // pickups & triggers
    if (!paused) {
      const gems = lv.gems;
      for (let i = 0; i < gems.length; i++) {
        const gm = gems[i]; if (gm.got) continue;
        const dx = gm.x - p.pos.x, dy = gm.y - (p.pos.y + 0.8), dz = gm.z - p.pos.z;
        if (dx * dx + dy * dy + dz * dz < 1.25) { gm.got = true; gm.mesh.visible = false; bus.emit('gem', gm); }
      }
      const tr = lv.triggers;
      for (let i = 0; i < tr.length; i++) {
        const t = tr[i]; if (t.off) continue;
        const dx = t.x - p.pos.x, dz = t.z - p.pos.z;
        const inside = dx * dx + dz * dz < t.r * t.r && Math.abs((t.y || 0) - p.pos.y) < (t.h || 2.5);
        if (inside && !t.in) { t.in = true; t.fn(t); if (t.once) t.off = true; } else if (!inside) t.in = false;
      }
    }
  },
  updateInteract() {
    const p = this.p, lv = this.level;
    if (this.lockInput) { UI.setPrompt(null); return; }
    let best = null, bd = 1e9;
    for (let i = 0; i < lv.inter.length; i++) {
      const it = lv.inter[i];
      if (it.enabled === false) continue;
      const dx = it.x - p.pos.x, dz = it.z - p.pos.z, d = Math.hypot(dx, dz), r = it.r || 2.2;
      if (d < r && Math.abs((it.y || 0) - p.pos.y) < 3 && d < bd) { bd = d; best = it; }
    }
    this.nearInter = best;
    if (!best) { UI.setPrompt(null); return; }
    const acts = best.acts ? best.acts() : [{ label: best.label, fn: best.fn }];
    UI.setPrompt(acts && acts.length ? acts : null);
  },
  updateCam(dt) {
    const p = this.p;
    if (this.focusPos) {
      this.focusT -= dt;
      this.camTarget.lerp(this.focusPos, 1 - Math.exp(-4 * dt));
      if (this.focusT <= 0) { this.focusPos = null; this.lockInput = false; const r = this.focusRes; this.focusRes = null; if (r) r(); }
    } else if (this.mode === 'play') {
      const tx = p.pos.x, ty = p.pos.y + 1.3, tz = p.pos.z;
      const k = 1 - Math.exp(-7 * dt);
      this.camTarget.x = lerp(this.camTarget.x, tx, k); this.camTarget.z = lerp(this.camTarget.z, tz, k);
      this.camTarget.y = lerp(this.camTarget.y, ty, 1 - Math.exp(-3.5 * dt));
      // ease the look-around offset back while walking
      if (this.t - (this.lookT || 0) > 2.5 && p.moveAmt > 0.3) { this.yawOff = lerp(this.yawOff, 0, 1 - Math.exp(-1.5 * dt)); this.pitchOff = lerp(this.pitchOff, 0, 1 - Math.exp(-1.5 * dt)); }
    }
    this.placeCam(this.mode === 'title' ? 1 : 1 - Math.exp(-9 * dt));
    const lv = this.level;
    if (lv && lv.tapRing && lv.tapRing.visible) { const u = lv.tapRing.userData; u.t += dt; const s = 1 + u.t * 1.5; lv.tapRing.scale.set(s, s, s); lv.tapRing.material.opacity = Math.max(0, 0.8 - u.t * 1.4); if (u.t > 0.6) lv.tapRing.visible = false; }
  },

  // ---------- particles ----------
  fxInit() {
    const N = 360;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size: 0.26, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    this.scene.add(pts);
    const parts = [];
    for (let i = 0; i < N; i++) { parts.push({ life: 0, max: 1, vx: 0, vy: 0, vz: 0, r: 1, g: 1, b: 1, grav: 1 }); pos[i * 3 + 1] = -999; }
    const tmp = new THREE.Color();
    let cursor = 0;
    this.fx = {
      burst(x, y, z, color, n, speed, life, grav) {
        tmp.setHex(color);
        for (let k = 0; k < n; k++) {
          const i = cursor; cursor = (cursor + 1) % N;
          const pp = parts[i], a = Math.random() * TAU, u = Math.random() * 2 - 1, s = (speed || 3) * (0.4 + Math.random() * 0.6), q = Math.sqrt(1 - u * u);
          pp.vx = Math.cos(a) * q * s; pp.vz = Math.sin(a) * q * s; pp.vy = Math.abs(u) * s + 1.2;
          pp.life = pp.max = (life || 0.7) * (0.6 + Math.random() * 0.6); pp.r = tmp.r; pp.g = tmp.g; pp.b = tmp.b; pp.grav = grav == null ? 1 : grav;
          pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
        }
      }
    };
    this.fxUpdate = (dt) => {
      for (let i = 0; i < N; i++) {
        const pp = parts[i];
        if (pp.life <= 0) continue;
        pp.life -= dt;
        if (pp.life <= 0) { pos[i * 3 + 1] = -999; col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0; continue; }
        pp.vy -= 7 * dt * pp.grav;
        pos[i * 3] += pp.vx * dt; pos[i * 3 + 1] += pp.vy * dt; pos[i * 3 + 2] += pp.vz * dt;
        const f = pp.life / pp.max;
        col[i * 3] = pp.r * f; col[i * 3 + 1] = pp.g * f; col[i * 3 + 2] = pp.b * f;
      }
      geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
    };
  }
};
