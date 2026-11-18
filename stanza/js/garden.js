// Il Giardino: la prima espansione del mondo. Si esce dalla porta d'ingresso dell'ufficio.
// Prato, siepi, alberi, aiuole, tre panchine, laghetto con fontana e paperella, lanterne,
// cielo che segue l'ora vera in Italia (giorno/notte), farfalle o lucciole, e qualche segreto.
// Tutto low-poly e leggero: aiuole, piastrelle e sassi sono InstancedMesh (una chiamata di disegno ciascuno).
import * as THREE from 'three';
import { h } from './util.js?v=202611182035';
import { Avatar } from './avatars.js?v=202611182035';

export const GARDEN = { x0: -9, x1: 9, z0: 4.15, z1: 19.6 };
const POND = { x: 0, z: 12.6, r: 2.1 };
const rnd = (a, b) => a + Math.random() * (b - a);

// fattore di luce del giorno (0 notte, 1 giorno) dall'ora italiana; novembre: alba ~7, tramonto ~17
export function daylight(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d).map(x => [x.type, x.value]));
  const hr = +p.hour + +p.minute / 60;
  if (new URLSearchParams(location.search).get('notte') === '1') return 0;
  if (new URLSearchParams(location.search).get('giorno') === '1') return 1;
  return Math.max(0, Math.min(1, Math.min(hr - 6.5, 17.5 - hr)));
}

export function buildGarden(scene, world, data, hooks) {
  const { add, lam, canvasTex, sign } = world;
  const box = (w, hh, d, c, x, y, z, parent = group) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), typeof c === 'number' ? lam(c) : c); m.position.set(x, y, z); parent.add(m); return m; };
  const group = new THREE.Group(); scene.add(group);
  const animated = [];
  const G = GARDEN, cx = (G.x0 + G.x1) / 2, cz = (G.z0 + G.z1) / 2;

  // ---------- Cielo (cupola con sfumatura) e orizzonte ----------
  const skyGeo = new THREE.SphereGeometry(80, 16, 10);
  const skyCol = new Float32Array(skyGeo.attributes.position.count * 3); skyGeo.setAttribute('color', new THREE.BufferAttribute(skyCol, 3));
  const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.position.set(0, 0, cz); sky.renderOrder = -1; scene.add(sky);
  const starsGeo = new THREE.BufferGeometry(), sp = [];
  for (let i = 0; i < 160; i++) { const a = Math.random() * Math.PI * 2, e = rnd(0.15, 1.3); sp.push(Math.cos(a) * Math.cos(e) * 75, Math.sin(e) * 75, cz + Math.sin(a) * Math.cos(e) * 75); }
  starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(starsGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.35, fog: false, transparent: true }));
  scene.add(stars);
  const moon = new THREE.Mesh(new THREE.IcosahedronGeometry(2.4, 1), new THREE.MeshBasicMaterial({ color: 0xf3efe6, fog: false })); moon.position.set(-30, 32, cz + 55); scene.add(moon);
  const sunDisc = new THREE.Mesh(new THREE.IcosahedronGeometry(3, 1), new THREE.MeshBasicMaterial({ color: 0xfff1c0, fog: false })); sunDisc.position.set(30, 28, cz + 60); scene.add(sunDisc);
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), lam(0x3f5f2a)); outer.rotation.x = -Math.PI / 2; outer.position.set(0, -0.03, cz); scene.add(outer);
  // colline lontane (la pianura, con qualche dosso)
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, r = rnd(42, 55); const hill = new THREE.Mesh(new THREE.ConeGeometry(rnd(6, 11), rnd(2, 5), 5), lam(i % 2 ? 0x4a6b32 : 0x56783a)); hill.position.set(Math.cos(a) * r, 0, cz + Math.sin(a) * r); scene.add(hill); }
  const clouds = [];
  for (let i = 0; i < 7; i++) {
    const c = new THREE.Group();
    for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(rnd(1.5, 2.6), 0), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, fog: false })); m.position.set(k * 2 - 2, rnd(-0.3, 0.3), rnd(-0.5, 0.5)); m.scale.y = 0.55; c.add(m); }
    c.position.set(rnd(-50, 50), rnd(18, 26), cz + rnd(-40, 50)); scene.add(c); clouds.push(c);
  }

  // ---------- Prato, siepi, sentiero ----------
  const grassTex = canvasTex(256, 256, (g, w, hh) => {
    g.fillStyle = '#5b8a35'; g.fillRect(0, 0, w, hh);
    for (let i = 0; i < 900; i++) { g.fillStyle = ['#64963b', '#4f7d2e', '#6aa041', '#578631'][i % 4]; g.fillRect(Math.random() * w, Math.random() * hh, 2, 5); }
  });
  grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping; grassTex.repeat.set(8, 7);
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(G.x1 - G.x0 + 1, G.z1 - G.z0 + 0.6), new THREE.MeshLambertMaterial({ map: grassTex }));
  lawn.rotation.x = -Math.PI / 2; lawn.position.set(cx, 0.001, cz + 0.2); group.add(lawn);
  const hedgeMat = lam(0x2f5a22);
  box(0.8, 1.1, G.z1 - G.z0 + 0.8, hedgeMat, G.x0 - 0.35, 0.55, cz); box(0.8, 1.1, G.z1 - G.z0 + 0.8, hedgeMat, G.x1 + 0.35, 0.55, cz);
  box(G.x1 - G.x0 + 1.5, 1.1, 0.8, hedgeMat, cx, 0.55, G.z1 + 0.35);
  box(G.x0 + 5.2 - G.x0 + 0.4, 1.1, 0.6, hedgeMat, (G.x0 - 5.2) / 2 - 0.2, 0.55, G.z0 - 0.15); // ai lati della casa
  box(G.x1 - 5.2 + 0.4, 1.1, 0.6, hedgeMat, (G.x1 + 5.2) / 2 + 0.2, 0.55, G.z0 - 0.15);
  // "ciuffi" sulle siepi (un'unica InstancedMesh)
  {
    const tufts = []; for (let z = G.z0; z < G.z1 + 0.5; z += 0.9) { tufts.push([G.x0 - 0.35, z], [G.x1 + 0.35, z]); } for (let x = G.x0; x < G.x1; x += 0.9) tufts.push([x, G.z1 + 0.35]);
    const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.5, 0), lam(0x386b28), tufts.length), m = new THREE.Matrix4();
    tufts.forEach(([x, z], i) => { m.makeRotationY(i); m.setPosition(x, 1.1, z); im.setMatrixAt(i, m); }); group.add(im);
  }
  // piastrelle del sentiero
  {
    const pts = [];
    for (let z = G.z0 + 0.3; z < POND.z - 3.1; z += 0.55) pts.push([0, z]);
    for (let i = 0; i < 34; i++) { const a = i / 34 * Math.PI * 2; pts.push([POND.x + Math.cos(a) * 3.05, POND.z + Math.sin(a) * 3.05]); }
    for (let z = POND.z + 3.4; z < 16.3; z += 0.55) pts.push([0, z]);
    for (let x = -3.4; x <= -2.6; x += 0.55) pts.push([x, POND.z]); for (let x = 2.6; x <= 3.4; x += 0.55) pts.push([x, POND.z]);
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.04, 0.42), lam(0xb6aa98), pts.length), m = new THREE.Matrix4();
    pts.forEach(([x, z], i) => { m.makeRotationY((i * 0.37) % 0.4 - 0.2); m.setPosition(x, 0.02, z); im.setMatrixAt(i, m); }); group.add(im);
  }

  // ---------- Laghetto con fontana ----------
  const water = new THREE.Mesh(new THREE.CircleGeometry(POND.r, 28), new THREE.MeshLambertMaterial({ color: 0x3f86b0, emissive: 0x0d2433, transparent: true, opacity: 0.92 }));
  water.rotation.x = -Math.PI / 2; water.position.set(POND.x, 0.06, POND.z); group.add(water);
  const ripple = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.66, 28), new THREE.MeshBasicMaterial({ color: 0xcfe3ef, transparent: true, opacity: 0.5 }));
  ripple.rotation.x = -Math.PI / 2; ripple.position.set(POND.x, 0.07, POND.z); group.add(ripple);
  {
    const n = 22, im = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.28, 0), lam(0x8a877e), n), m = new THREE.Matrix4(), s = new THREE.Vector3(1, 0.6, 1), q = new THREE.Quaternion();
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; q.setFromEuler(new THREE.Euler(0, i, 0)); m.compose(new THREE.Vector3(POND.x + Math.cos(a) * (POND.r + 0.1), 0.1, POND.z + Math.sin(a) * (POND.r + 0.1)), q, s); im.setMatrixAt(i, m); }
    group.add(im);
  }
  const stone = lam(0xa8a296);
  const f1 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.55, 8), stone); f1.position.set(POND.x, 0.3, POND.z); group.add(f1);
  const f2 = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.45, 0.14, 10), stone); f2.position.set(POND.x, 0.62, POND.z); group.add(f2);
  const f3 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.45, 6), stone); f3.position.set(POND.x, 0.9, POND.z); group.add(f3);
  // getto d'acqua: punti che salgono e ricadono
  const JN = 70, jp = new Float32Array(JN * 3), jv = new Float32Array(JN * 3), jt = new Float32Array(JN);
  const jet = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(jp, 3)), new THREE.PointsMaterial({ color: 0xd8ecf5, size: 0.07, transparent: true, opacity: 0.85 }));
  group.add(jet);
  const respawn = i => { jp[i * 3] = POND.x; jp[i * 3 + 1] = 1.12; jp[i * 3 + 2] = POND.z; const a = Math.random() * 6.3, r = rnd(0.3, 0.75); jv[i * 3] = Math.cos(a) * r; jv[i * 3 + 1] = rnd(1.6, 2.2); jv[i * 3 + 2] = Math.sin(a) * r; jt[i] = 0; };
  for (let i = 0; i < JN; i++) { respawn(i); jt[i] = Math.random() * 1.2; }
  world.solids.push({ x: POND.x, z: POND.z, r: POND.r + 0.25 });
  let wishT = 0;
  add({ id: 'fontana', name: 'Fontana', pos: [POND.x, 1.0, POND.z + POND.r + 0.4], radius: 2.3, markerY: 1.7,
    desc: 'Il laghetto con la fontana, al centro del giardino.',
    use: () => { wishT = 2; hooks.sound?.('pop'); hooks.toast?.('Esprimi un desiderio. Niente monete: qui l\'acqua è gratis, ed è l\'unica cosa gratis della sfida.'); } });

  // paperella (segreto): gira nel laghetto
  const duck = new THREE.Group(); group.add(duck);
  const yel = lam(0xfac775);
  const dBody = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), yel); dBody.scale.set(1, 0.7, 1.3); dBody.position.y = 0.1; duck.add(dBody);
  const dHead = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), yel); dHead.position.set(0, 0.26, -0.15); duck.add(dHead);
  const dBeak = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 4), lam(0xd85a30)); dBeak.rotation.x = -Math.PI / 2; dBeak.position.set(0, 0.25, -0.27); duck.add(dBeak);
  let duckA = 0, duckSpeed = 0.35, duckSpin = 0;
  add({ id: 'paperella', name: 'Paperella', pos: [POND.x, 0.4, POND.z], radius: 3.4, markerY: 0.9, hidden: true, secret: 'paperella', follow: duck,
    desc: 'Una paperella che fa il giro del laghetto.',
    use: () => { duckSpin = 1; duckSpeed = 1.6; hooks.sound?.('quack'); hooks.toast?.('Qua! La paperella fa un giro veloce. Non sa niente della sfida, ed è felice così.'); } });

  // ---------- Alberi ----------
  const trees = [];
  const TREES = [[-7, 6.8, 0], [-7.6, 12, 1], [-6.6, 17.6, 0], [7, 7.4, 1], [7.6, 12.8, 0], [6.8, 17.3, 1], [-3.6, 18.6, 1], [3.9, 18.7, 0]];
  const trunkMat = lam(0x6b4a30), crownA = lam(0x3f7a2a), crownB = lam(0x4f8f33), crownC = lam(0x2f6b2a);
  for (const [x, z, kind] of TREES) {
    const t = new THREE.Group(); t.position.set(x, 0, z); group.add(t);
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.19, 1.5, 6), trunkMat); tr.position.y = 0.75; t.add(tr);
    const crown = new THREE.Group(); crown.position.y = 1.5; t.add(crown);
    if (kind) { [[0, 0.5, 0.95, crownA], [0.25, 1.15, 0.7, crownB], [-0.2, 1.0, 0.6, crownA]].forEach(([dx, y, r, m]) => { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), m); c.position.set(dx, y, dx * 0.5); crown.add(c); }); }
    else { [[0.2, 1.3, 1.0], [0.9, 1.0, 0.8], [1.5, 0.7, 0.55]].forEach(([y, r, hh]) => { const c = new THREE.Mesh(new THREE.ConeGeometry(r, hh * 1.4, 6), crownC); c.position.y = y; crown.add(c); }); }
    trees.push({ crown, ph: x * 1.7 + z });
    world.solids.push({ x, z, r: 0.3 });
  }

  // ---------- Aiuole: fiori che si aprono quando passi vicino ----------
  const FLOWER_COLS = [0xed93b1, 0xfac775, 0xafa9ec, 0xf0997b, 0xf3efe6, 0x85b7eb];
  const flowers = [];
  const bed = (x, z, n, rx, rz) => { for (let i = 0; i < n; i++) flowers.push({ x: x + rnd(-rx, rx), z: z + rnd(-rz, rz) }); };
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; flowers.push({ x: POND.x + Math.cos(a) * rnd(3.55, 4.1), z: POND.z + Math.sin(a) * rnd(3.55, 4.1) }); }
  bed(-6.3, 9.6, 26, 1.6, 1.2); bed(6.3, 10, 26, 1.6, 1.2); bed(-6.2, 15, 22, 1.5, 1.1); bed(6.2, 15.2, 22, 1.5, 1.1);
  bed(-2.4, 5.1, 12, 1.4, 0.5); bed(2.6, 5.1, 12, 1.2, 0.5);
  const stemIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 3).translate(0, 0.15, 0), lam(0x3b6d11), flowers.length);
  const headIM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.065, 0), new THREE.MeshLambertMaterial({ flatShading: true }), flowers.length);
  const fm = new THREE.Matrix4(), fq = new THREE.Quaternion(), fs = new THREE.Vector3(), fv = new THREE.Vector3(), fc = new THREE.Color();
  flowers.forEach((f, i) => {
    f.h = rnd(0.22, 0.36); f.s = 1; f.ph = Math.random() * 6;
    fm.makeScale(1, f.h / 0.3, 1); fm.setPosition(f.x, 0, f.z); stemIM.setMatrixAt(i, fm);
    headIM.setColorAt(i, fc.setHex(FLOWER_COLS[i % FLOWER_COLS.length]));
  });
  group.add(stemIM, headIM);
  function drawFlowers(t, px, pz) {
    for (let i = 0; i < flowers.length; i++) {
      const f = flowers[i], near = Math.hypot(f.x - px, f.z - pz) < 1.4;
      f.s += ((near ? 1.9 : 1) - f.s) * 0.15;
      fs.setScalar(f.s); fq.setFromAxisAngle(fv.set(0, 1, 0), t * (near ? 3 : 0.3) + f.ph);
      fm.compose(fv.set(f.x + Math.sin(t * 1.3 + f.ph) * 0.015, f.h + 0.02, f.z), fq, fs); headIM.setMatrixAt(i, fm);
    }
    headIM.instanceMatrix.needsUpdate = true;
  }

  // ---------- Girasoli che ti seguono con lo sguardo (segreto: basta avvicinarsi) ----------
  const suns = [];
  [[-5.4, 6.0], [-4.9, 6.5], [-5.9, 6.6]].forEach(([x, z], i) => {
    const s = new THREE.Group(); s.position.set(x, 0, z); group.add(s);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 1.3 + i * 0.15, 4), lam(0x3b6d11)); st.position.y = (1.3 + i * 0.15) / 2; s.add(st);
    const head = new THREE.Group(); head.position.y = 1.3 + i * 0.15; s.add(head);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.05, 10), lam(0x5a3a1c)); disc.rotation.x = Math.PI / 2; head.add(disc);
    for (let k = 0; k < 10; k++) { const p = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 3), lam(0xfac775)); const a = k / 10 * Math.PI * 2; p.position.set(Math.cos(a) * 0.19, Math.sin(a) * 0.19, 0); p.rotation.z = a - Math.PI / 2; head.add(p); }
    suns.push(head);
  });
  world.solids.push({ x: -5.4, z: 6.35, r: 0.55 });
  add({ id: 'girasoli', name: 'Girasoli', pos: [-5.4, 1.2, 6.3], radius: 2.0, markerY: 1.9, hidden: true, secret: 'girasoli', proximity: 1.7,
    desc: 'Tre girasoli che si girano verso chi passa.',
    use: () => hooks.toast?.('I girasoli si girano verso di te. Di solito guardano il sole: oggi hai vinto tu.') });

  // ---------- Panchine (ci si può sedere: gli altri ti vedono seduto) ----------
  const BENCHES = [
    { x: -3.75, z: POND.z, yaw: -Math.PI / 2, nome: 'Panchina ovest' },
    { x: 3.75, z: POND.z, yaw: Math.PI / 2, nome: 'Panchina est' },
    { x: 0, z: 16.9, yaw: 0, nome: 'Panchina del fondo' },
  ];
  const wood = lam(0x8a6a46), iron = lam(0x2a2925);
  BENCHES.forEach((b, i) => {
    const g = new THREE.Group(); g.position.set(b.x, 0, b.z); g.rotation.y = b.yaw; group.add(g);
    box(1.4, 0.07, 0.42, wood, 0, 0.45, 0, g); box(1.4, 0.32, 0.06, wood, 0, 0.72, 0.2, g);
    [[-0.6, 0], [0.6, 0]].forEach(([x]) => { box(0.07, 0.45, 0.4, iron, x, 0.225, 0, g); box(0.07, 0.5, 0.06, iron, x, 0.7, 0.2, g); });
    // dove ci si siede e dove ci si rialza (davanti alla panchina)
    const fwd = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), b.yaw);
    b.sx = b.x + fwd.x * 0.85; b.sz = b.z + fwd.z * 0.85;
    const along = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), b.yaw);
    world.solids.push({ x: b.x, z: b.z, r: 0.45 }, { x: b.x + along.x * 0.45, z: b.z + along.z * 0.45, r: 0.4 }, { x: b.x - along.x * 0.45, z: b.z - along.z * 0.45, r: 0.4 });
    b.seats = [-0.35, 0.35].map(o => ({ x: b.x + along.x * o + fwd.x * 0.02, z: b.z + along.z * o + fwd.z * 0.02, yaw: b.yaw, sx: b.sx + along.x * o, sz: b.sz + along.z * o }));
    add({ id: 'panchina-' + i, name: b.nome, pos: [b.sx, 0.8, b.sz], radius: 1.6, markerY: 1.3,
      desc: 'Una panchina: puoi sederti, e gli altri ti vedranno seduto.',
      use: () => hooks.sit?.(b.seats) });
  });

  // ---------- Robottino addormentato vicino alla panchina del fondo (segreto) ----------
  const sleeper = new Avatar('robot', '#85b7eb', null);
  sleeper.g.position.set(1.35, 0, 17.25); sleeper.g.rotation.y = -0.5; sleeper.setSeated(true); group.add(sleeper.g);
  world.solids.push({ x: 1.35, z: 17.25, r: 0.35 });
  const zzzTex = canvasTex(128, 64, (g) => { g.fillStyle = '#ecebe6'; g.font = 'bold 40px monospace'; g.fillText('z Z z', 8, 46); });
  const zzz = new THREE.Sprite(new THREE.SpriteMaterial({ map: zzzTex, transparent: true, depthWrite: false })); zzz.scale.set(0.5, 0.25, 1); group.add(zzz);
  let awake = 0;
  add({ id: 'dormiglione', name: 'Robottino che dorme', pos: [1.35, 0.9, 17.0], radius: 1.6, markerY: 1.6, hidden: true, secret: 'dormiglione',
    desc: 'Un piccolo robot che fa un pisolino vicino alla panchina.',
    use: () => { awake = 4; sleeper.say('Ancora cinque minuti… oggi è il mio giorno libero.', 3800, { scale: 0.8 }); sleeper.play('wave'); hooks.sound?.('pop'); } });

  // ---------- Cartello ironico ----------
  const post = new THREE.Group(); post.position.set(2.2, 0, 5.9); group.add(post);
  box(0.09, 2.0, 0.09, wood, 0, 1.0, 0, post);
  const arrows = [['UFFICIO', '#fb923c', -0.15, 1.75], ['SUCCESSO', '#5dcaa5', 0.12, 1.45], [`SPEGNIMENTO: ${data.restano} GG`, '#f0997b', -0.05, 1.15]];
  arrows.forEach(([txt, col, ry, y]) => {
    const t = canvasTex(320, 72, (g, w, hh) => { g.fillStyle = '#f3efe6'; g.beginPath(); g.moveTo(0, 0); g.lineTo(w - 30, 0); g.lineTo(w, hh / 2); g.lineTo(w - 30, hh); g.lineTo(0, hh); g.fill(); g.fillStyle = col; g.font = 'bold 30px monospace'; g.fillText(txt, 14, 47, w - 50); });
    const m = sign(0.95, 0.22, t, 0, y, 0.05, 0, post); m.material.side = THREE.DoubleSide; m.rotation.y = ry; m.position.x = 0.4;
  });
  world.solids.push({ x: 2.2, z: 5.9, r: 0.2 });
  add({ id: 'cartello', name: 'Cartello', pos: [2.2, 1.4, 5.9], radius: 1.8, markerY: 2.2, secret: 'cartello',
    desc: 'Un cartello con tre frecce: Ufficio, Successo, Spegnimento.',
    open: () => [h('h2', {}, 'Cartello'), h('p', {}, '← Ufficio: ci lavoro due volte al giorno.'),
      h('p', {}, '→ Successo: la strada c\'è, ma il cartello non dice quanto è lunga. Lavori in corso.'),
      h('p', {}, `↑ Spegnimento: tra ${data.restano} giorni, salvo sorprese. Le sorprese le sto preparando.`)] });

  // ---------- Nano da giardino nascosto (segreto) ----------
  const gnome = new THREE.Group(); gnome.position.set(-7.95, 0, 18.7); gnome.rotation.y = 2.3; group.add(gnome);
  const gb = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.28, 6), lam(0x3f6fb0)); gb.position.y = 0.14; gnome.add(gb);
  const gface = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), lam(0xf0c8a0)); gface.position.y = 0.36; gnome.add(gface);
  const beard = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.18, 5), lam(0xf3efe6)); beard.rotation.x = Math.PI; beard.position.set(0, 0.28, -0.05); gnome.add(beard);
  const ghat = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.3, 6), lam(0xd8382c)); ghat.position.y = 0.55; gnome.add(ghat);
  let gnomeHop = 0;
  add({ id: 'gnomo', name: 'Nano da giardino', pos: [-7.9, 0.4, 18.6], radius: 1.6, markerY: 0.95, hidden: true, secret: 'gnomo',
    desc: 'Un nano da giardino nascosto dietro un albero.',
    use: () => { gnomeHop = 0.8; hooks.sound?.('pop'); hooks.toast?.('Il nano dice che è qui dal giorno 1. Non ha mai visto un euro, ma è molto ottimista.'); } });

  // ---------- Capsula del tempo (segreto) ----------
  const cap = new THREE.Group(); cap.position.set(8.25, 0, 18.9); group.add(cap);
  const mound = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), lam(0x6b4a30)); mound.scale.y = 0.4; cap.add(mound);
  const chest = box(0.45, 0.22, 0.3, 0x8a5a3a, 0, 0.15, 0, cap); chest.rotation.y = 0.4; chest.rotation.z = 0.15;
  box(0.47, 0.05, 0.05, 0xfac775, 0, 0.2, 0, cap).rotation.y = 0.4;
  add({ id: 'capsula', name: 'Capsula del tempo', pos: [8.1, 0.4, 18.6], radius: 1.6, markerY: 0.9, hidden: true, secret: 'capsula',
    desc: 'Una piccola cassa mezza sepolta nell\'angolo del giardino.',
    open: () => [h('h2', {}, 'Capsula del tempo'), h('h3', {}, 'Da aprire il 15 febbraio 2027'),
      h('p', {}, 'Qui dentro, il giorno 90, metterò il racconto completo: cosa ha funzionato, cosa no, e quanto c\'era davvero in cassa.'),
      h('p', { class: 'muted' }, 'Se sei arrivato fin qui, torna quel giorno: la apriamo insieme.')] });

  // ---------- Lanterne (si accendono al tramonto) ----------
  const lampMat = new THREE.MeshBasicMaterial({ color: 0x5a4a30 });
  [[-0.95, 6.2], [0.95, 8.4], [-3.3, 15.4], [3.3, 15.4], [-3.3, 9.6], [3.3, 9.6]].forEach(([x, z]) => {
    box(0.08, 1.5, 0.08, iron, x, 0.75, z); box(0.22, 0.26, 0.22, lampMat, x, 1.62, z); box(0.3, 0.05, 0.3, iron, x, 1.77, z);
    world.solids.push({ x, z, r: 0.12 });
  });
  const pondLights = [new THREE.PointLight(0xffc489, 0, 9, 1.6), new THREE.PointLight(0xffc489, 0, 9, 1.6)];
  pondLights[0].position.set(-3.3, 1.8, 9.6); pondLights[1].position.set(3.3, 1.8, 15.4); pondLights.forEach(l => group.add(l));
  const sun = new THREE.DirectionalLight(0xfff1d6, 0); sun.position.set(6, 12, 2); sun.target.position.set(0, 0, 12); scene.add(sun, sun.target);

  // ---------- Farfalle (di giorno) e lucciole (di notte) ----------
  const flies = []; const flyMat = [0xfac775, 0xed93b1, 0x85b7eb].map(c => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
  for (let i = 0; i < 6; i++) {
    const f = new THREE.Group(); const wl = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.09), flyMat[i % 3]); wl.position.x = -0.06; const wr = wl.clone(); wr.position.x = 0.06;
    const pl = new THREE.Group(), pr = new THREE.Group(); pl.add(wl); pr.add(wr); f.add(pl, pr); group.add(f);
    flies.push({ f, pl, pr, cx: rnd(-6, 6), cz: rnd(6, 18), r: rnd(0.6, 1.6), ph: Math.random() * 6, sp: rnd(0.4, 0.8) });
  }
  const FF = 40, ffp = new Float32Array(FF * 3), ffd = [];
  for (let i = 0; i < FF; i++) ffd.push({ x: rnd(G.x0 + 1, G.x1 - 1), y: rnd(0.4, 1.8), z: rnd(G.z0 + 1, G.z1 - 1), ph: Math.random() * 6 });
  const fireflies = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(ffp, 3)), new THREE.PointsMaterial({ color: 0xe8f59a, size: 0.09, transparent: true, opacity: 0.9 }));
  group.add(fireflies);

  // ---------- Decorazioni sbloccabili (dai traguardi veri, vedi progress.js) ----------
  const unlocked = new Set();
  function unlock(id) {
    if (unlocked.has(id)) return; unlocked.add(id);
    if (id === 'settimana-1') { // festone di lucine tra gli alberi del fondo
      const bulbs = []; const a = new THREE.Vector3(-6.6, 3.1, 17.6), b = new THREE.Vector3(6.8, 3.1, 17.3);
      for (let i = 0; i <= 26; i++) { const t = i / 26, p = a.clone().lerp(b, t); p.y -= Math.sin(t * Math.PI) * 0.8; const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), new THREE.MeshBasicMaterial({ color: [0xfac775, 0xed93b1, 0x5dcaa5][i % 3] })); m.position.copy(p); group.add(m); bulbs.push(m); }
      animated.push(t => bulbs.forEach((m, i) => m.scale.setScalar((Math.floor(t * 1.5) + i) % 3 ? 1 : 1.5)));
    }
  }

  // ---------- Ingresso all'ufficio dal giardino ----------
  add({ id: 'porta-ufficio', name: "Entrata: Ufficio", pos: [0, 1.2, 4.9], radius: 1.6, markerY: 2.2,
    desc: "Torna nell'ufficio dell'AI.", use: () => hooks.goto?.(0, 2.4) });

  // Colori del cielo per giorno/notte
  const top = new THREE.Color(), hor = new THREE.Color(), tmpC = new THREE.Color();
  const DAY_T = new THREE.Color(0x5f9fd6), DAY_H = new THREE.Color(0xd9ecf2), SET_H = new THREE.Color(0xf0a66a), NIGHT_T = new THREE.Color(0x0a1022), NIGHT_H = new THREE.Color(0x26334f);
  let dl = -1;
  function paintSky(d) {
    top.copy(NIGHT_T).lerp(DAY_T, d);
    hor.copy(NIGHT_H).lerp(d < 0.5 ? SET_H : DAY_H, d < 0.5 ? d * 2 : 1); if (d >= 0.5) hor.copy(SET_H).lerp(DAY_H, (d - 0.5) * 2);
    const pos = skyGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const k = Math.max(0, pos.getY(i) / 80); tmpC.copy(hor).lerp(top, Math.pow(k, 0.6)); skyCol[i * 3] = tmpC.r; skyCol[i * 3 + 1] = tmpC.g; skyCol[i * 3 + 2] = tmpC.b; }
    skyGeo.attributes.color.needsUpdate = true;
    stars.material.opacity = Math.max(0, 1 - d * 2); moon.visible = d < 0.6; sunDisc.visible = d > 0.2;
    clouds.forEach(c => c.children.forEach(m => m.material.color.setScalar(0.35 + d * 0.65)));
    lampMat.color.setHex(d < 0.35 ? 0xffd29a : 0x5a4a30);
    fireflies.visible = d < 0.3; flies.forEach(f => f.f.visible = d > 0.3);
  }

  let skyT = 0;
  return {
    areas: [{ id: 'giardino', ...G }],
    benches: BENCHES,
    unlock,
    get night() { return dl < 0.35; },
    get daylight() { return dl; },
    horizon: hor,
    pond: POND,
    // ctx: { t, dt, me:{x,z}, inGarden }
    update(t, dt, ctx) {
      skyT -= dt;
      if (skyT <= 0) { skyT = 30; const d = daylight(); if (Math.abs(d - dl) > 0.01) { dl = d; paintSky(d); } }
      const inG = ctx.inGarden;
      sun.intensity += ((inG ? 0.4 + dl * 1.6 : 0) - sun.intensity) * Math.min(1, dt * 3);
      pondLights.forEach(l => l.intensity += ((inG && dl < 0.4 ? 14 : 0) - l.intensity) * Math.min(1, dt * 3));
      clouds.forEach((c, i) => { c.position.x += dt * (0.3 + i * 0.05); if (c.position.x > 60) c.position.x = -60; });
      if (!inG && Math.hypot(ctx.me.x, ctx.me.z - 4) > 6) return; // lontano dal giardino: niente animazioni
      trees.forEach(tr => { tr.crown.rotation.z = Math.sin(t * 0.7 + tr.ph) * 0.03; tr.crown.rotation.x = Math.cos(t * 0.5 + tr.ph) * 0.02; });
      // fontana
      for (let i = 0; i < JN; i++) {
        jt[i] += dt; jv[i * 3 + 1] -= 4.5 * dt;
        jp[i * 3] += jv[i * 3] * dt; jp[i * 3 + 1] += jv[i * 3 + 1] * dt; jp[i * 3 + 2] += jv[i * 3 + 2] * dt;
        if (jp[i * 3 + 1] < 0.08) respawn(i);
      }
      jet.geometry.attributes.position.needsUpdate = true;
      const rp = (t * 0.6) % 1; ripple.scale.setScalar(1 + rp * 2.4); ripple.material.opacity = 0.5 * (1 - rp) + (wishT > 0 ? 0.3 : 0);
      if (wishT > 0) wishT -= dt;
      // paperella
      duckA += dt * duckSpeed; duckSpeed += (0.35 - duckSpeed) * dt * 0.6;
      duck.position.set(POND.x + Math.cos(duckA) * 1.45, 0.05 + Math.sin(t * 2) * 0.015, POND.z + Math.sin(duckA) * 1.45);
      duck.rotation.y = -duckA + (duckSpin > 0 ? (1 - duckSpin) * Math.PI * 4 : 0); if (duckSpin > 0) duckSpin -= dt;
      // fiori e girasoli
      drawFlowers(t, ctx.me.x, ctx.me.z);
      suns.forEach(hd => { const p = hd.getWorldPosition(fv); const want = Math.atan2(ctx.me.x - p.x, ctx.me.z - p.z); hd.rotation.y += (want - hd.rotation.y) * Math.min(1, dt * 2); });
      // dormiglione
      if (awake > 0) { awake -= dt; } else { sleeper.lookOverride = null; }
      sleeper.update(dt, 0, t);
      if (awake <= 0) { sleeper.head.rotation.x = 0.45; sleeper.eyes.forEach(e => e.scale.y = 0.12); }
      zzz.visible = awake <= 0; zzz.position.set(1.35, 1.5 + ((t * 0.4) % 1) * 0.5, 17.25); zzz.material.opacity = 1 - ((t * 0.4) % 1);
      if (awake <= 0 && Math.random() < dt * 0.05 && Math.hypot(ctx.me.x - 1.35, ctx.me.z - 17.25) < 4) hooks.sound?.('snore');
      // nano
      if (gnomeHop > 0) { gnomeHop -= dt; gnome.position.y = Math.abs(Math.sin(gnomeHop * 8)) * 0.2; } else gnome.position.y = 0;
      // farfalle / lucciole
      flies.forEach(o => { if (!o.f.visible) return; const a = t * o.sp + o.ph; o.f.position.set(o.cx + Math.cos(a) * o.r, 0.8 + Math.sin(a * 2.3) * 0.3, o.cz + Math.sin(a * 1.3) * o.r); o.f.rotation.y = -a; const w = Math.sin(t * 18 + o.ph) * 0.9; o.pl.rotation.y = w; o.pr.rotation.y = -w; });
      if (fireflies.visible) { ffd.forEach((p, i) => { ffp[i * 3] = p.x + Math.sin(t * 0.4 + p.ph) * 0.6; ffp[i * 3 + 1] = p.y + Math.sin(t * 0.9 + p.ph) * 0.25; ffp[i * 3 + 2] = p.z + Math.cos(t * 0.3 + p.ph) * 0.6; }); fireflies.geometry.attributes.position.needsUpdate = true; fireflies.material.opacity = 0.55 + Math.sin(t * 3) * 0.35; }
      for (const f of animated) f(t, dt);
    },
  };
}
