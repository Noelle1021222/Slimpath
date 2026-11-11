// ===== audio (all synthesized, starts after the first tap) =====
const AU = {
  ctx: null, master: null, sfxG: null, musG: null,
  sfxOn: true, musOn: true, theme: null, timer: null, step: 0, nextT: 0,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.9; this.master.connect(this.ctx.destination);
      this.sfxG = this.ctx.createGain(); this.sfxG.gain.value = this.sfxOn ? 1 : 0; this.sfxG.connect(this.master);
      this.musG = this.ctx.createGain(); this.musG.gain.value = this.musOn ? 1 : 0; this.musG.connect(this.master);
      const len = this.ctx.sampleRate * 0.4;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { this.ctx = null; }
  },
  setSfx(on) { this.sfxOn = on; if (this.sfxG) this.sfxG.gain.value = on ? 1 : 0; },
  setMusic(on) { this.musOn = on; if (this.musG) this.musG.gain.value = on ? 1 : 0; },
  tone(freq, dur, type, vol, when, slide, dest) {
    if (!this.ctx) return;
    const c = this.ctx, t0 = c.currentTime + (when || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol || 0.1), t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || this.sfxG);
    o.start(t0); o.stop(t0 + dur + 0.03);
  },
  noise(dur, vol, when, freq, q) {
    if (!this.ctx) return;
    const c = this.ctx, t0 = c.currentTime + (when || 0);
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 900; f.Q.value = q || 0.8;
    const g = c.createGain(); g.gain.setValueAtTime(vol || 0.08, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(this.sfxG); s.start(t0); s.stop(t0 + dur + 0.02);
  },
  sfx(name, p) {
    if (!this.ctx || !this.sfxOn) return;
    const T = (f, d, ty, v, w, s) => this.tone(f, d, ty, v, w, s);
    switch (name) {
      case 'step': this.noise(0.05, 0.035, 0, 500 + Math.random() * 300, 1.2); break;
      case 'jump': T(300, 0.18, 'square', 0.05, 0, 620); break;
      case 'land': this.noise(0.09, 0.07, 0, 240, 0.7); break;
      case 'coin': { const b = 660 * Math.pow(1.06, Math.min(p || 0, 10)); T(b, 0.08, 'triangle', 0.1); T(b * 1.5, 0.16, 'triangle', 0.1, 0.07); break; }
      case 'ok': T(523, 0.1, 'triangle', 0.11); T(659, 0.1, 'triangle', 0.11, 0.09); T(784, 0.2, 'triangle', 0.11, 0.18); break;
      case 'bad': T(196, 0.16, 'sawtooth', 0.06); T(156, 0.24, 'sawtooth', 0.06, 0.13); break;
      case 'tap': T(880, 0.04, 'sine', 0.05); break;
      case 'page': this.noise(0.14, 0.05, 0, 2200, 0.5); break;
      case 'open': T(392, 0.12, 'triangle', 0.1); T(523, 0.12, 'triangle', 0.1, 0.1); T(659, 0.12, 'triangle', 0.1, 0.2); T(1046, 0.4, 'sine', 0.1, 0.3); break;
      case 'gate': T(110, 0.5, 'sawtooth', 0.05, 0, 55); this.noise(0.5, 0.05, 0, 300, 0.4); T(880, 0.5, 'sine', 0.07, 0.25); break;
      case 'star': T(1046, 0.1, 'sine', 0.1); T(1318, 0.1, 'sine', 0.1, 0.08); T(1568, 0.3, 'sine', 0.1, 0.16); break;
      case 'win': [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => T(f, i === 6 ? 0.6 : 0.14, 'triangle', 0.11, i * 0.12)); break;
      case 'hit': T(160, 0.2, 'square', 0.09, 0, 60); this.noise(0.2, 0.1, 0, 400, 0.5); break;
      case 'zap': T(1400, 0.25, 'sawtooth', 0.05, 0, 200); break;
      case 'boom': this.noise(0.6, 0.16, 0, 120, 0.4); T(80, 0.6, 'sine', 0.16, 0, 30); break;
      case 'pick': T(440, 0.06, 'square', 0.05); T(660, 0.1, 'square', 0.05, 0.05); break;
      case 'drop': T(330, 0.12, 'square', 0.05, 0, 200); break;
      case 'tick': T(1200, 0.03, 'square', 0.03); break;
      case 'crumble': this.noise(0.5, 0.12, 0, 180, 0.3); T(140, 0.4, 'sawtooth', 0.05, 0, 50); break;
      case 'compute': T(220 + (p || 0) * 30, 0.08, 'square', 0.035); break;
      case 'roar': T(90, 0.9, 'sawtooth', 0.12, 0, 45); this.noise(0.9, 0.09, 0, 200, 0.3); break;
      case 'warp': T(200, 0.7, 'sine', 0.1, 0, 1600); break;
      default: break;
    }
  },
  // gentle generative loop; each world passes its own scale and pulse
  music(theme) {
    this.stopMusic();
    if (!theme) return;
    this.theme = theme; this.step = 0;
    if (!this.ctx) return;
    this.nextT = this.ctx.currentTime + 0.1;
    this.rng = mulberry(theme.seed || 7);
    this.timer = setInterval(() => this.pump(), 120);
  },
  stopMusic() { if (this.timer) clearInterval(this.timer); this.timer = null; this.theme = null; },
  pump() {
    const th = this.theme; if (!th || !this.ctx) return;
    if (this.ctx.state !== 'running' || !this.musOn) { this.nextT = this.ctx.currentTime + 0.1; return; }
    const beat = 60 / th.bpm / 2;
    while (this.nextT < this.ctx.currentTime + 0.3) {
      const i = this.step, when = this.nextT - this.ctx.currentTime;
      const sc = th.scale, root = th.root;
      const f = (deg, oct) => root * Math.pow(2, (sc[((deg % sc.length) + sc.length) % sc.length] + 12 * (oct + Math.floor(deg / sc.length))) / 12);
      const bar = Math.floor(i / 8), prog = th.prog[bar % th.prog.length];
      if (i % 8 === 0) { this.tone(f(prog, -1), beat * 7, 'triangle', 0.035, when, null, this.musG); this.tone(f(prog + 2, 0), beat * 7, 'sine', 0.016, when, null, this.musG); this.tone(f(prog + 4, 0), beat * 7, 'sine', 0.014, when, null, this.musG); }
      if (i % 4 === 2) this.tone(f(prog, -1) * 1.5, beat * 1.5, 'triangle', 0.016, when, null, this.musG);
      const r = this.rng();
      if (r < th.density) {
        const deg = prog + [0, 2, 4, 5, 7, 9][Math.floor(this.rng() * 6)];
        this.tone(f(deg, 1), beat * (r < th.density * 0.3 ? 3 : 1.4), th.lead || 'sine', 0.028, when, null, this.musG);
      }
      this.step++; this.nextT += beat;
    }
  }
};
const MUSIC = {
  title: { bpm: 84, root: 220, scale: [0, 2, 4, 7, 9], prog: [0, 3, 4, 2], density: 0.5, seed: 11 },
  w1: { bpm: 96, root: 261.6, scale: [0, 2, 4, 7, 9], prog: [0, 2, 3, 4], density: 0.6, seed: 3 },
  w2: { bpm: 76, root: 196, scale: [0, 2, 3, 7, 9], prog: [0, 4, 3, 0], density: 0.45, seed: 5, lead: 'triangle' },
  w3: { bpm: 80, root: 174.6, scale: [0, 3, 5, 7, 10], prog: [0, 2, 4, 3], density: 0.4, seed: 8 },
  w4: { bpm: 72, root: 233, scale: [0, 2, 4, 5, 7, 9, 11], prog: [0, 5, 3, 4], density: 0.42, seed: 13 },
  w5: { bpm: 100, root: 196, scale: [0, 2, 5, 7, 9], prog: [0, 3, 0, 4], density: 0.55, seed: 21, lead: 'triangle' },
  w6: { bpm: 104, root: 164.8, scale: [0, 3, 5, 7, 10], prog: [0, 0, 3, 4], density: 0.6, seed: 34, lead: 'triangle' },
  w7: { bpm: 92, root: 207.6, scale: [0, 2, 4, 7, 9], prog: [0, 4, 5, 3], density: 0.5, seed: 55 },
  w8: { bpm: 112, root: 246.9, scale: [0, 2, 4, 7, 9], prog: [0, 3, 4, 4], density: 0.65, seed: 89, lead: 'triangle' },
  w9: { bpm: 120, root: 146.8, scale: [0, 1, 3, 7, 8], prog: [0, 0, 1, 4], density: 0.7, seed: 144, lead: 'sawtooth' }
};
