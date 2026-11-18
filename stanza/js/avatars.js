// Personaggi low-poly: 8 tipi su uno "scheletro" comune (corpo, testa, braccia e gambe con perno),
// così le animazioni (camminata, saluto, festa, risata, incontro, attesa) valgono per tutti.
// Guardano verso -Z, come la camera con yaw = 0.
import * as THREE from 'three';

const cache = new Map();
const G = (key, make) => cache.get(key) || (cache.set(key, make()), cache.get(key));
const box = (w, h, d) => G(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
const ico = (r, d = 0) => G(`i${r},${d}`, () => new THREE.IcosahedronGeometry(r, d));
const cyl = (a, b, h, s = 7) => G(`c${a},${b},${h},${s}`, () => new THREE.CylinderGeometry(a, b, h, s));
const cone = (r, h, s = 4) => G(`k${r},${h},${s}`, () => new THREE.ConeGeometry(r, h, s));
const matCache = new Map();
const lam = c => { const k = 'l' + c; if (!matCache.has(k)) matCache.set(k, new THREE.MeshLambertMaterial({ color: c, flatShading: true })); return matCache.get(k); };
const flat = c => { const k = 'f' + c; if (!matCache.has(k)) matCache.set(k, new THREE.MeshBasicMaterial({ color: c })); return matCache.get(k); };

function part(geo, mat, x, y, z, parent) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; }
// Arto con perno in alto (anca o spalla): ruota in modo naturale.
function limb(w, h, d, mat, x, y, z, parent) {
  const piv = new THREE.Group(); piv.position.set(x, y, z); parent.add(piv);
  part(G(`limb${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d).translate(0, -h / 2, 0)), mat, 0, 0, 0, piv);
  return piv;
}
const shade = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();
const lighten = (hex, k) => new THREE.Color(hex).lerp(new THREE.Color(0xffffff), k).getHex();

// Ogni costruttore riempie: body (gruppo che contiene torso e testa), head, arms[sx,dx], legs[sx,dx], extra.
// Le coordinate di braccia e torso sono relative al bacino (body), quelle delle gambe al suolo (g).
const BUILDERS = {
  robot(c, r) {
    const dark = lam(0x3a3833), light = lam(0xecebe6);
    r.hip = 0.62; part(box(0.42, 0.5, 0.3), lam(c), 0, 0.25, 0, r.body);
    r.headY = 0.66; part(box(0.38, 0.3, 0.32), light, 0, 0, 0, r.head);
    part(box(0.28, 0.1, 0.02), flat(0x141413), 0, 0.02, -0.17, r.head);
    r.eyes = [part(box(0.05, 0.05, 0.02), flat(c), -0.07, 0.02, -0.18, r.head), part(box(0.05, 0.05, 0.02), flat(c), 0.07, 0.02, -0.18, r.head)];
    part(cyl(0.012, 0.012, 0.16, 5), dark, 0, 0.23, 0, r.head); part(ico(0.04), flat(c), 0, 0.33, 0, r.head);
    r.arms = [limb(0.09, 0.4, 0.09, dark, -0.27, 0.46, 0, r.body), limb(0.09, 0.4, 0.09, dark, 0.27, 0.46, 0, r.body)];
    r.legs = [limb(0.12, 0.62, 0.12, dark, -0.11, 0.62, 0, r.g), limb(0.12, 0.62, 0.12, dark, 0.11, 0.62, 0, r.g)];
  },
  gatto(c, r) {
    const light = lam(0xf3efe6), d = lam(shade(c, 0.65));
    r.hip = 0.6; part(box(0.4, 0.52, 0.32), lam(c), 0, 0.26, 0, r.body); part(box(0.26, 0.3, 0.04), light, 0, 0.24, -0.17, r.body);
    r.headY = 0.72; part(box(0.4, 0.33, 0.35), lam(c), 0, 0, 0, r.head);
    const e1 = part(cone(0.09, 0.17), lam(c), -0.13, 0.23, 0, r.head), e2 = part(cone(0.09, 0.17), lam(c), 0.13, 0.23, 0, r.head); e1.rotation.y = e2.rotation.y = Math.PI / 4;
    r.eyes = [part(box(0.05, 0.08, 0.02), flat(0x141413), -0.08, 0.04, -0.18, r.head), part(box(0.05, 0.08, 0.02), flat(0x141413), 0.08, 0.04, -0.18, r.head)];
    part(box(0.06, 0.04, 0.02), lam(0xed93b1), 0, -0.04, -0.18, r.head);
    [-1, 1].forEach(s => { const w = part(box(0.14, 0.012, 0.012), flat(0xecebe6), s * 0.17, -0.05, -0.18, r.head); w.rotation.z = s * 0.15; });
    r.tail = new THREE.Group(); r.tail.position.set(0, 0.08, 0.17); r.body.add(r.tail);
    part(G('tail', () => new THREE.BoxGeometry(0.07, 0.07, 0.5).translate(0, 0, 0.25)), lam(c), 0, 0, 0, r.tail); r.tail.rotation.x = -0.7;
    r.arms = [limb(0.1, 0.36, 0.1, lam(c), -0.25, 0.46, 0, r.body), limb(0.1, 0.36, 0.1, lam(c), 0.25, 0.46, 0, r.body)];
    r.legs = [limb(0.13, 0.6, 0.13, d, -0.1, 0.6, 0, r.g), limb(0.13, 0.6, 0.13, d, 0.1, 0.6, 0, r.g)];
  },
  pinguino(c, r) {
    const black = lam(0x22211f), white = lam(0xf3efe6), yel = lam(0xfac775);
    r.hip = 0.4; part(cyl(0.25, 0.31, 0.72, 8), black, 0, 0.36, 0, r.body);
    part(G('pbelly', () => new THREE.CylinderGeometry(0.2, 0.25, 0.58, 8, 1, false, -Math.PI * 0.75, Math.PI * 0.5)), white, 0, 0.34, -0.04, r.body);
    part(box(0.52, 0.09, 0.38), lam(c), 0, 0.66, 0, r.body); part(box(0.12, 0.26, 0.05), lam(c), 0.14, 0.52, -0.2, r.body); // sciarpa
    r.headY = 0.92; part(ico(0.23, 0), black, 0, 0, 0, r.head);
    part(cone(0.06, 0.16), yel, 0, -0.02, -0.25, r.head).rotation.x = -Math.PI / 2;
    r.eyes = [part(box(0.05, 0.05, 0.02), flat(0xf3efe6), -0.08, 0.06, -0.19, r.head), part(box(0.05, 0.05, 0.02), flat(0xf3efe6), 0.08, 0.06, -0.19, r.head)];
    r.arms = [limb(0.07, 0.42, 0.2, black, -0.3, 0.62, 0, r.body), limb(0.07, 0.42, 0.2, black, 0.3, 0.62, 0, r.body)];
    r.legs = [limb(0.14, 0.4, 0.2, yel, -0.11, 0.4, -0.03, r.g), limb(0.14, 0.4, 0.2, yel, 0.11, 0.4, -0.03, r.g)];
  },
  volpe(c, r) {
    const white = lam(0xf3efe6), dark = lam(0x2a2925);
    r.hip = 0.6; part(box(0.38, 0.5, 0.3), lam(c), 0, 0.25, 0, r.body); part(box(0.24, 0.32, 0.04), white, 0, 0.3, -0.16, r.body);
    r.headY = 0.72; part(box(0.38, 0.3, 0.32), lam(c), 0, 0, 0, r.head);
    part(cone(0.12, 0.26, 4), white, 0, -0.06, -0.26, r.head).rotation.x = -Math.PI / 2;
    part(ico(0.035), flat(0x141413), 0, -0.05, -0.39, r.head);
    [-1, 1].forEach(s => { const e = part(cone(0.1, 0.24, 3), lam(c), s * 0.13, 0.26, 0, r.head); e.rotation.z = -s * 0.15; });
    r.eyes = [part(box(0.05, 0.06, 0.02), flat(0x141413), -0.09, 0.05, -0.17, r.head), part(box(0.05, 0.06, 0.02), flat(0x141413), 0.09, 0.05, -0.17, r.head)];
    r.tail = new THREE.Group(); r.tail.position.set(0, 0.08, 0.16); r.body.add(r.tail);
    part(G('ftail', () => new THREE.ConeGeometry(0.12, 0.55, 5).rotateX(-Math.PI / 2).translate(0, 0, 0.28)), lam(c), 0, 0, 0, r.tail);
    part(ico(0.075), white, 0, 0, 0.56, r.tail); r.tail.rotation.x = -0.5;
    r.arms = [limb(0.09, 0.36, 0.09, lam(c), -0.24, 0.45, 0, r.body), limb(0.09, 0.36, 0.09, lam(c), 0.24, 0.45, 0, r.body)];
    r.legs = [limb(0.12, 0.6, 0.12, dark, -0.1, 0.6, 0, r.g), limb(0.12, 0.6, 0.12, dark, 0.1, 0.6, 0, r.g)];
  },
  rana(c, r) {
    const belly = lam(lighten(c, 0.55)), d = lam(shade(c, 0.7)), white = lam(0xf3efe6);
    r.hip = 0.42; part(box(0.5, 0.45, 0.36), lam(c), 0, 0.22, 0, r.body); part(box(0.34, 0.3, 0.04), belly, 0, 0.2, -0.19, r.body);
    r.headY = 0.6; part(box(0.52, 0.26, 0.4), lam(c), 0, 0, 0, r.head);
    [-1, 1].forEach(s => { part(ico(0.1, 0), white, s * 0.15, 0.17, -0.06, r.head); });
    r.eyes = [part(box(0.06, 0.07, 0.02), flat(0x141413), -0.15, 0.17, -0.16, r.head), part(box(0.06, 0.07, 0.02), flat(0x141413), 0.15, 0.17, -0.16, r.head)];
    part(box(0.3, 0.025, 0.02), flat(0x5f2a1a), 0, -0.05, -0.205, r.head); // sorriso
    r.arms = [limb(0.09, 0.3, 0.09, d, -0.3, 0.38, 0, r.body), limb(0.09, 0.3, 0.09, d, 0.3, 0.38, 0, r.body)];
    r.legs = [limb(0.15, 0.42, 0.16, d, -0.14, 0.42, 0, r.g), limb(0.15, 0.42, 0.16, d, 0.14, 0.42, 0, r.g)];
  },
  orso(c, r) {
    const muzzle = lam(lighten(c, 0.5)), d = lam(shade(c, 0.7));
    r.hip = 0.55; part(box(0.5, 0.56, 0.38), lam(c), 0, 0.28, 0, r.body); part(box(0.3, 0.34, 0.04), muzzle, 0, 0.26, -0.2, r.body);
    r.headY = 0.8; part(ico(0.24, 0), lam(c), 0, 0, 0, r.head);
    part(box(0.18, 0.12, 0.08), muzzle, 0, -0.06, -0.21, r.head); part(box(0.07, 0.05, 0.03), flat(0x141413), 0, -0.02, -0.26, r.head);
    [-1, 1].forEach(s => part(ico(0.075, 0), lam(c), s * 0.17, 0.18, 0, r.head));
    r.eyes = [part(box(0.045, 0.045, 0.02), flat(0x141413), -0.08, 0.05, -0.21, r.head), part(box(0.045, 0.045, 0.02), flat(0x141413), 0.08, 0.05, -0.21, r.head)];
    r.arms = [limb(0.13, 0.42, 0.13, lam(c), -0.32, 0.5, 0, r.body), limb(0.13, 0.42, 0.13, lam(c), 0.32, 0.5, 0, r.body)];
    r.legs = [limb(0.16, 0.55, 0.16, d, -0.13, 0.55, 0, r.g), limb(0.16, 0.55, 0.16, d, 0.13, 0.55, 0, r.g)];
  },
  fantasma(c, r) {
    const sheet = lam(lighten(c, 0.75));
    r.hip = 0.35; r.floats = true;
    part(G('ghost', () => new THREE.CylinderGeometry(0.28, 0.36, 0.85, 9, 1, true)), new THREE.MeshLambertMaterial({ color: lighten(c, 0.75), flatShading: true, side: THREE.DoubleSide }), 0, 0.42, 0, r.body);
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; part(cone(0.07, 0.14, 4), sheet, Math.sin(a) * 0.33, -0.05, Math.cos(a) * 0.33, r.body).rotation.x = Math.PI; }
    r.headY = 0.95; part(ico(0.29, 1), sheet, 0, 0, 0, r.head);
    r.eyes = [part(box(0.07, 0.11, 0.02), flat(0x141413), -0.09, 0.03, -0.27, r.head), part(box(0.07, 0.11, 0.02), flat(0x141413), 0.09, 0.03, -0.27, r.head)];
    part(ico(0.04), flat(0x141413), 0, -0.1, -0.27, r.head); // "oh"
    part(box(0.07, 0.04, 0.02), flat(c), -0.17, -0.06, -0.24, r.head); part(box(0.07, 0.04, 0.02), flat(c), 0.17, -0.06, -0.24, r.head); // guance
    r.arms = [limb(0.09, 0.25, 0.09, sheet, -0.33, 0.66, 0, r.body), limb(0.09, 0.25, 0.09, sheet, 0.33, 0.66, 0, r.body)];
    r.legs = [];
  },
  astronauta(c, r) {
    const white = lam(0xecebe6), grey = lam(0x8a877e), accent = lam(c);
    r.hip = 0.6; part(box(0.44, 0.52, 0.34), white, 0, 0.26, 0, r.body); part(box(0.46, 0.07, 0.36), accent, 0, 0.02, 0, r.body);
    part(box(0.16, 0.12, 0.04), accent, 0.08, 0.34, -0.18, r.body); part(box(0.34, 0.42, 0.16), grey, 0, 0.28, 0.24, r.body); // zaino
    r.headY = 0.78; part(ico(0.25, 1), white, 0, 0, 0, r.head);
    part(G('visor', () => new THREE.SphereGeometry(0.2, 10, 6, -Math.PI * 0.85, Math.PI * 0.7, Math.PI * 0.3, Math.PI * 0.4)), new THREE.MeshLambertMaterial({ color: shade(c, 0.55), emissive: shade(c, 0.25), side: THREE.DoubleSide }), 0, 0, -0.07, r.head);
    r.eyes = [];
    part(cyl(0.01, 0.01, 0.14, 4), grey, 0.14, 0.24, 0.05, r.head); part(ico(0.025), flat(c), 0.14, 0.32, 0.05, r.head);
    r.arms = [limb(0.12, 0.4, 0.12, white, -0.29, 0.47, 0, r.body), limb(0.12, 0.4, 0.12, white, 0.29, 0.47, 0, r.body)];
    r.legs = [limb(0.15, 0.6, 0.15, white, -0.11, 0.6, 0, r.g), limb(0.15, 0.6, 0.15, white, 0.11, 0.6, 0, r.g)];
    r.legs.forEach(l => part(box(0.17, 0.1, 0.2), accent, 0, -0.56, -0.02, l));
  },
};

function makeSprite(canvas, h) {
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
  s.scale.set(canvas.width / canvas.height * h, h, 1); s.renderOrder = 10; return s;
}
// Etichetta sopra la testa: testo disegnato su canvas (mai HTML).
export function makeLabel(text, color = '#fb923c') {
  const c = document.createElement('canvas'), g = c.getContext('2d');
  const font = '600 40px ui-sans-serif, system-ui, sans-serif';
  g.font = font; const w = Math.ceil(g.measureText(text).width) + 44;
  c.width = Math.min(512, w); c.height = 64;
  g.font = font; g.fillStyle = 'rgba(20,20,19,0.82)';
  g.beginPath(); g.roundRect(0, 0, c.width, 64, 30); g.fill();
  g.fillStyle = color; g.beginPath(); g.arc(24, 32, 8, 0, 7); g.fill();
  g.fillStyle = '#ecebe6'; g.textBaseline = 'middle'; g.fillText(text, 38, 34, c.width - 46);
  return makeSprite(c, 0.2);
}
// Fumetto con testo (chat o battute del robottino). Il testo è disegnato su canvas: niente HTML.
export function makeBubble(text, opts = {}) {
  const c = document.createElement('canvas'), g = c.getContext('2d');
  const W = 520, font = '500 30px ui-sans-serif, system-ui, sans-serif';
  g.font = font;
  const words = String(text).split(' '); const lines = []; let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > W - 48 && line) { lines.push(line); line = w; } else line = t; }
  lines.push(line); if (lines.length > 3) { lines.length = 3; lines[2] = lines[2].replace(/\s*\S*$/, '') + '…'; }
  const tw = Math.min(W - 48, Math.max(...lines.map(l => g.measureText(l).width)));
  c.width = Math.ceil(tw + 48); c.height = 30 + lines.length * 38 + 26;
  g.font = font;
  g.fillStyle = opts.bg || '#ecebe6'; g.beginPath(); g.roundRect(2, 2, c.width - 4, c.height - 26, 18); g.fill();
  g.beginPath(); g.moveTo(c.width / 2 - 12, c.height - 25); g.lineTo(c.width / 2, c.height - 4); g.lineTo(c.width / 2 + 12, c.height - 25); g.fill();
  g.fillStyle = opts.fg || '#141413'; g.textBaseline = 'top';
  lines.forEach((l, i) => g.fillText(l, 24, 18 + i * 38, c.width - 48));
  return makeSprite(c, c.height / 512 * 1.15 * (opts.scale || 1));
}

const emoteTex = new Map();
function emoteSprite(glyph) {
  if (!emoteTex.has(glyph)) {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    g.fillStyle = '#ecebe6'; g.beginPath(); g.arc(64, 60, 54, 0, 7); g.fill();
    g.beginPath(); g.moveTo(52, 108); g.lineTo(64, 126); g.lineTo(76, 108); g.fill();
    g.font = '64px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(glyph, 64, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; emoteTex.set(glyph, t);
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: emoteTex.get(glyph), transparent: true, depthWrite: false }));
  s.scale.set(0.4, 0.4, 1); s.renderOrder = 11;
  return s;
}

const shadowGeo = new THREE.CircleGeometry(0.32, 12);
const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false });

const ANIMS = { wave: 2.0, laugh: 1.8, party: 2.6, hop: 0.6, meet: 1.3 };

export class Avatar {
  constructor(kind, color, nick, opts = {}) {
    this.kind = BUILDERS[kind] ? kind : 'robot'; this.color = color;
    this.g = new THREE.Group();
    this.body = new THREE.Group(); this.head = new THREE.Group();
    this.g.add(this.body); this.body.add(this.head);
    const r = { g: this.g, body: this.body, head: this.head, arms: [], legs: [], eyes: [] };
    BUILDERS[this.kind](new THREE.Color(color).getHex(), r);
    Object.assign(this, { arms: r.arms, legs: r.legs, eyes: r.eyes, tail: r.tail, floats: !!r.floats, hip: r.hip });
    this.body.position.y = r.hip; this.head.position.y = r.headY;
    this.topY = r.hip + r.headY + 0.45;
    if (!opts.noShadow) { const sh = new THREE.Mesh(shadowGeo, shadowMat); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.006; this.g.add(sh); }
    if (nick != null) { this.label = makeLabel(nick, color); this.label.position.y = this.topY; this.g.add(this.label); }
    this.walk = 0; this.emote = null; this.bubble = null; this.anim = null; this.seated = false;
    this.lookT = 0; this.lookYaw = 0; this.seed = Math.random() * 100;
  }
  setNick(nick) {
    if (this.label) { this.g.remove(this.label); this.label.material.map.dispose(); this.label.material.dispose(); }
    this.label = makeLabel(nick, this.color); this.label.position.y = this.topY; this.g.add(this.label);
  }
  showEmote(glyph) {
    if (this.emote) { this.g.remove(this.emote.s); this.emote.s.material.dispose(); }
    const s = emoteSprite(glyph); s.position.y = this.topY + 0.4; this.g.add(s);
    this.emote = { s, t: 0 };
  }
  say(text, ms = 6000, opts) {
    this.clearBubble();
    const s = makeBubble(text, opts); s.position.y = this.topY + 0.2 + s.scale.y / 2; this.g.add(s);
    this.bubble = { s, t: 0, life: ms / 1000 };
  }
  clearBubble() {
    if (!this.bubble) return; this.g.remove(this.bubble.s); this.bubble.s.material.map.dispose(); this.bubble.s.material.dispose(); this.bubble = null;
  }
  play(name) { if (ANIMS[name]) this.anim = { name, t: 0, dur: ANIMS[name] }; }
  dance() { this.play('party'); }
  setSeated(v) { this.seated = v; }

  // speed: metri al secondo (stimati dall'interpolazione per gli avatar remoti)
  update(dt, speed, time) {
    const moving = speed > 0.15 && !this.seated;
    this.walk += dt * (moving ? Math.min(12, 5 + speed * 2.5) : 0);
    const sw = moving ? Math.sin(this.walk) * 0.5 : 0;
    const L = this.legs, A = this.arms, k = Math.min(1, dt * 12);
    let bodyY = this.hip, bodyRotY = 0, bodyRotX = 0, bodyRotZ = 0, headRotX = 0, headRotZ = 0;
    let armL = -sw * 0.8, armR = sw * 0.8, armLz = 0, armRz = 0, legL = sw, legR = -sw;

    // piccoli movimenti da fermo: respiro, sguardo che si sposta, braccia rilassate
    if (!moving) {
      this.lookT -= dt;
      if (this.lookT <= 0) { this.lookT = 2.5 + Math.random() * 4; this.lookYaw = (Math.random() - 0.5) * 1.1; }
      bodyY += Math.sin(time * 2 + this.seed) * 0.008;
      armLz = -0.05 - Math.sin(time * 2 + this.seed) * 0.03; armRz = -armLz;
    } else { this.lookYaw = 0; bodyY += Math.abs(Math.sin(this.walk)) * 0.04; bodyRotX = 0.06; }
    if (this.floats) { bodyY += 0.12 + Math.sin(time * 2.2 + this.seed) * 0.05; legL = legR = 0; armL *= 0.4; armR *= 0.4; }
    if (this.seated) { legL = legR = -1.45; bodyY = 0.48 + (this.floats ? 0.1 : 0); armL = armR = this.typing ? -1.25 : -0.3; if (this.typing) { armL += Math.sin(time * 14) * 0.08; armR += Math.sin(time * 14 + 1.7) * 0.08; } }
    if (this.lookOverride != null) this.lookYaw = this.lookOverride;

    const a = this.anim;
    if (a) {
      a.t += dt; const p = a.t / a.dur, env = Math.sin(Math.min(1, p) * Math.PI);
      if (a.name === 'wave') { armR = -2.7 * Math.min(1, a.t * 5) * (p < 0.92 ? 1 : (1 - p) / 0.08); armRz = Math.sin(a.t * 14) * 0.45; headRotZ = 0.15 * env; }
      else if (a.name === 'laugh') { bodyRotX = -0.25 * env; headRotX = -0.35 * env; bodyY += Math.abs(Math.sin(a.t * 22)) * 0.03 * env; armL = armR = -0.4 * env; armLz = 0.4 * env; armRz = -0.4 * env; bodyRotZ = Math.sin(a.t * 18) * 0.05 * env; }
      else if (a.name === 'party') { bodyRotY = p * Math.PI * 2; bodyY += Math.abs(Math.sin(a.t * 9)) * 0.18; armL = armR = -2.9; armLz = Math.sin(a.t * 9) * 0.4; armRz = -armLz; legL = Math.sin(a.t * 9) * 0.3; legR = -legL; }
      else if (a.name === 'hop') { bodyY += Math.sin(Math.min(1, p) * Math.PI) * 0.12; armL = armR = -0.6 * env; }
      else if (a.name === 'meet') { bodyY += Math.sin(Math.min(1, p * 2) * Math.PI) * 0.1; armR = -2.5 * env; armRz = Math.sin(a.t * 12) * 0.35 * env; headRotZ = 0.2 * env; }
      if (a.t >= a.dur) this.anim = null;
    }

    if (L.length) { L[0].rotation.x += (legL - L[0].rotation.x) * k; L[1].rotation.x += (legR - L[1].rotation.x) * k; }
    if (A.length) {
      A[0].rotation.x += (armL - A[0].rotation.x) * k; A[1].rotation.x += (armR - A[1].rotation.x) * k;
      A[0].rotation.z += (armLz - A[0].rotation.z) * k; A[1].rotation.z += (armRz - A[1].rotation.z) * k;
    }
    this.body.position.y += (bodyY - this.body.position.y) * Math.min(1, dt * 20);
    this.body.rotation.y = bodyRotY; this.body.rotation.x += (bodyRotX - this.body.rotation.x) * k; this.body.rotation.z = bodyRotZ;
    this.head.rotation.y += (this.lookYaw - this.head.rotation.y) * Math.min(1, dt * 3);
    this.head.rotation.x += (headRotX - this.head.rotation.x) * k; this.head.rotation.z += (headRotZ - this.head.rotation.z) * k;
    if (this.tail) this.tail.rotation.y = Math.sin(time * (moving ? 8 : 3) + this.seed) * 0.4;
    const blink = (time + this.seed) % 4 < 0.12;
    for (const e of this.eyes) e.scale.y = blink ? 0.15 : 1;

    if (this.emote) {
      const e = this.emote; e.t += dt;
      e.s.position.y = this.topY + 0.4 + Math.min(e.t, 0.3) * 0.5 + (this.bubble ? this.bubble.s.scale.y : 0);
      const s = e.t < 0.15 ? e.t / 0.15 : e.t > 2.2 ? Math.max(0, 1 - (e.t - 2.2) / 0.4) : 1;
      e.s.scale.set(0.4 * s, 0.4 * s, 1);
      if (e.t > 2.6) { this.g.remove(e.s); e.s.material.dispose(); this.emote = null; }
    }
    if (this.bubble) {
      const b = this.bubble; b.t += dt;
      b.s.material.opacity = b.t < 0.15 ? b.t / 0.15 : b.t > b.life - 0.3 ? Math.max(0, (b.life - b.t) / 0.3) : 1;
      if (b.t > b.life) this.clearBubble();
    }
  }
  dispose() {
    this.clearBubble();
    if (this.label) { this.label.material.map.dispose(); this.label.material.dispose(); }
    if (this.emote) this.emote.s.material.dispose();
  }
}

// Anteprima per la scelta dell'avatar (renderer separato, solo mentre è visibile).
export function previewRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  r.setPixelRatio(Math.min(devicePixelRatio, 2));
  const sc = new THREE.Scene();
  sc.add(new THREE.HemisphereLight(0xfff1e0, 0x2a2622, 1.6));
  const dl = new THREE.DirectionalLight(0xffffff, 1.2); dl.position.set(2, 3, -2); sc.add(dl);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 20); cam.position.set(0, 1.2, -3.9); cam.lookAt(0, 0.92, 0);
  let av = null, run = true, last = performance.now(), demoT = 0;
  function set(kind, color) {
    if (av) { sc.remove(av.g); av.dispose(); }
    av = new Avatar(kind, color, null, { noShadow: true }); sc.add(av.g); av.play('wave');
  }
  function loop(t) {
    if (!run) return;
    const w = canvas.clientWidth, hh = canvas.clientHeight;
    if (w && canvas.width !== Math.round(w * r.getPixelRatio())) { r.setSize(w, hh, false); cam.aspect = w / hh; cam.updateProjectionMatrix(); }
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (av) {
      av.g.rotation.y = Math.sin(t / 1600) * 0.5; av.update(dt, 0, t / 1000);
      demoT += dt; if (demoT > 4) { demoT = 0; av.play(['wave', 'laugh', 'party', 'hop'][Math.floor(Math.random() * 4)]); }
    }
    r.render(sc, cam); requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  return { set, stop() { run = false; r.dispose(); r.forceContextLoss(); } };
}
