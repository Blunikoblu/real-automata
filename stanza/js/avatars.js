// Avatar low-poly dei visitatori, etichette con il nickname e nuvolette delle emoji.
import * as THREE from 'three';

const geoCache = new Map();
const G = (key, make) => geoCache.get(key) || (geoCache.set(key, make()), geoCache.get(key));
const box = (w, h, d) => G(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
const lam = c => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
const glow = c => new THREE.MeshBasicMaterial({ color: c });

function part(geo, mat, x, y, z, parent) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; }
// Gamba con il perno all'anca (così oscilla in modo naturale).
function leg(w, h, d, mat, x, z, parent) {
  const geo = G(`leg${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d).translate(0, -h / 2, 0));
  return part(geo, mat, x, h, z, parent);
}

// Ogni avatar ha: body (che oscilla camminando), legs (2), una "testa".
// Guarda verso -Z (come la camera con yaw = 0).
const BUILDERS = {
  robot(col) {
    const g = new THREE.Group(), c = lam(col), dark = lam(0x3a3833), light = lam(0xecebe6);
    const body = new THREE.Group(); g.add(body);
    part(box(0.42, 0.5, 0.3), c, 0, 0.88, 0, body);
    part(box(0.36, 0.3, 0.32), light, 0, 1.32, 0, body);
    part(box(0.24, 0.06, 0.02), glow(0x141413), 0, 1.34, -0.17, body);
    const eyeL = part(box(0.05, 0.05, 0.02), glow(col), -0.06, 1.34, -0.18, body);
    const eyeR = part(box(0.05, 0.05, 0.02), glow(col), 0.06, 1.34, -0.18, body);
    part(G('ant', () => new THREE.CylinderGeometry(0.012, 0.012, 0.18, 5)), dark, 0, 1.56, 0, body);
    part(G('tip', () => new THREE.IcosahedronGeometry(0.04, 0)), glow(col), 0, 1.66, 0, body);
    part(box(0.08, 0.36, 0.08), dark, -0.27, 0.9, 0, body); part(box(0.08, 0.36, 0.08), dark, 0.27, 0.9, 0, body);
    const legs = [leg(0.11, 0.62, 0.11, dark, -0.11, 0, g), leg(0.11, 0.62, 0.11, dark, 0.11, 0, g)];
    return { g, body, legs, eyes: [eyeL, eyeR] };
  },
  gatto(col) {
    const g = new THREE.Group(), c = lam(col), light = lam(0xf3efe6), dark = lam(0x2a2925);
    const body = new THREE.Group(); g.add(body);
    part(box(0.4, 0.55, 0.32), c, 0, 0.86, 0, body);
    part(box(0.26, 0.3, 0.04), light, 0, 0.86, -0.17, body);
    part(box(0.38, 0.32, 0.34), c, 0, 1.33, 0, body);
    const ear = G('ear', () => new THREE.ConeGeometry(0.08, 0.16, 4));
    const e1 = part(ear, c, -0.12, 1.55, 0, body); e1.rotation.y = Math.PI / 4;
    const e2 = part(ear, c, 0.12, 1.55, 0, body); e2.rotation.y = Math.PI / 4;
    const eyeL = part(box(0.05, 0.07, 0.02), glow(0x141413), -0.08, 1.37, -0.18, body);
    const eyeR = part(box(0.05, 0.07, 0.02), glow(0x141413), 0.08, 1.37, -0.18, body);
    part(box(0.05, 0.03, 0.02), lam(0xed93b1), 0, 1.29, -0.18, body);
    const tail = part(box(0.06, 0.06, 0.45), c, 0, 0.7, 0.35, body); tail.rotation.x = -0.6;
    const legs = [leg(0.12, 0.6, 0.12, dark, -0.1, 0, g), leg(0.12, 0.6, 0.12, dark, 0.1, 0, g)];
    return { g, body, legs, eyes: [eyeL, eyeR], tail };
  },
  pinguino(col) {
    const g = new THREE.Group(), black = lam(0x22211f), white = lam(0xf3efe6), c = lam(col);
    const body = new THREE.Group(); g.add(body);
    part(G('pbody', () => new THREE.CylinderGeometry(0.24, 0.3, 0.8, 7)), black, 0, 0.82, 0, body);
    const belly = part(G('pbelly', () => new THREE.CylinderGeometry(0.18, 0.23, 0.62, 7, 1, false, -Math.PI * 0.75, Math.PI * 0.5)), white, 0, 0.8, -0.03, body);
    belly.scale.set(1, 1, 1.05);
    part(G('phead', () => new THREE.IcosahedronGeometry(0.22, 0)), black, 0, 1.35, 0, body);
    part(G('pbeak', () => new THREE.ConeGeometry(0.06, 0.16, 4)), lam(0xfac775), 0, 1.33, -0.24, body).rotation.x = -Math.PI / 2;
    const eyeL = part(box(0.05, 0.05, 0.02), glow(0xf3efe6), -0.08, 1.42, -0.18, body);
    const eyeR = part(box(0.05, 0.05, 0.02), glow(0xf3efe6), 0.08, 1.42, -0.18, body);
    part(box(0.5, 0.08, 0.36), c, 0, 1.12, 0, body); // sciarpa del colore scelto
    part(box(0.07, 0.4, 0.18), black, -0.3, 0.86, 0, body); part(box(0.07, 0.4, 0.18), black, 0.3, 0.86, 0, body);
    const legs = [leg(0.14, 0.42, 0.2, lam(0xfac775), -0.1, -0.03, g), leg(0.14, 0.42, 0.2, lam(0xfac775), 0.1, -0.03, g)];
    return { g, body, legs, eyes: [eyeL, eyeR] };
  },
};

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
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
  s.scale.set(c.width / 64 * 0.2, 0.2, 1);
  s.renderOrder = 10;
  return s;
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

export class Avatar {
  constructor(kind, color, nick) {
    const build = BUILDERS[kind] || BUILDERS.robot;
    Object.assign(this, build(color));
    this.kind = kind; this.color = color;
    this.label = makeLabel(nick, color); this.label.position.y = 1.95; this.g.add(this.label);
    this.walk = 0; this.emote = null;
    this.g.traverse(o => { if (o.isMesh) o.castShadow = false; });
  }
  setNick(nick) {
    this.g.remove(this.label); this.label.material.map.dispose(); this.label.material.dispose();
    this.label = makeLabel(nick, this.color); this.label.position.y = 1.95; this.g.add(this.label);
  }
  showEmote(glyph) {
    if (this.emote) this.g.remove(this.emote.s);
    const s = emoteSprite(glyph); s.position.y = 2.35; this.g.add(s);
    this.emote = { s, t: 0 };
  }
  // speed: metri al secondo stimati dall'interpolazione
  update(dt, speed, time) {
    const moving = speed > 0.15;
    this.walk += dt * (moving ? 9 : 0);
    const sw = moving ? Math.sin(this.walk) * 0.45 : 0;
    this.legs[0].rotation.x += (sw - this.legs[0].rotation.x) * 0.3;
    this.legs[1].rotation.x += (-sw - this.legs[1].rotation.x) * 0.3;
    this.body.position.y = moving ? Math.abs(Math.sin(this.walk)) * 0.04 : Math.sin(time * 2 + this.g.id) * 0.01;
    if (this.tail) this.tail.rotation.y = Math.sin(time * 3 + this.g.id) * 0.4;
    // battito delle palpebre ogni tanto
    const blink = (time + this.g.id * 0.37) % 4 < 0.12;
    for (const e of this.eyes) e.scale.y = blink ? 0.15 : 1;
    if (this.emote) {
      const e = this.emote; e.t += dt;
      e.s.position.y = 2.35 + Math.min(e.t, 0.3) * 0.5;
      const k = e.t < 0.15 ? e.t / 0.15 : e.t > 2.2 ? Math.max(0, 1 - (e.t - 2.2) / 0.4) : 1;
      e.s.scale.set(0.4 * k, 0.4 * k, 1);
      if (e.t > 2.6) { this.g.remove(e.s); this.emote = null; }
    }
  }
  dispose() {
    this.g.traverse(o => { if (o.material) { if (o.material.map && o === this.label) o.material.map.dispose(); o.material.dispose(); } });
  }
}

// Anteprima piccola per la scelta dell'avatar (renderer separato, solo nella schermata iniziale).
export function previewRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  r.setPixelRatio(Math.min(devicePixelRatio, 2));
  const sc = new THREE.Scene();
  sc.add(new THREE.HemisphereLight(0xfff1e0, 0x2a2622, 1.6));
  const dl = new THREE.DirectionalLight(0xffffff, 1.2); dl.position.set(2, 3, -2); sc.add(dl);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 20); cam.position.set(0, 1.25, -3.6); cam.lookAt(0, 1.0, 0);
  let av = null, run = true, last = performance.now();
  function set(kind, color) {
    if (av) { sc.remove(av.g); av.dispose(); }
    av = new Avatar(kind, color, ' '); av.g.remove(av.label); sc.add(av.g);
  }
  function loop(t) {
    if (!run) return;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * r.getPixelRatio())) { r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    const dt = (t - last) / 1000; last = t;
    if (av) { av.g.rotation.y = Math.sin(t / 1400) * 0.6; av.update(dt, 0, t / 1000); }
    r.render(sc, cam); requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  return { set, stop() { run = false; r.dispose(); } };
}
