// Party settimanale: decorazioni, musica leggera, emoji extra, brindisi di gruppo con coriandoli.
// Ogni visitatore calcola da solo se il party è in corso (ora italiana): niente server.
// ?party=1 nell'indirizzo forza l'anteprima (utile per le prove).
import * as THREE from 'three';
import { PARTY, ROOM } from './config.js?v=202611182035';

const WEEK = 7 * 1440;
const DAYS = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
const forced = new URLSearchParams(location.search).get('party') === '1';

function romeMinutes(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(d).map(x => [x.type, x.value]));
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  return (wd * 24 + +p.hour) * 60 + +p.minute;
}

export function partyInfo(d = new Date()) {
  const start = (PARTY.weekday * 24 + PARTY.hour) * 60 + PARTY.minute;
  const since = (romeMinutes(d) - start + WEEK) % WEEK;   // minuti dall'ultimo inizio
  const live = forced || since < PARTY.durataMin;
  const untilNext = live ? 0 : WEEK - since;
  const quando = `${DAYS[PARTY.weekday]} alle ${PARTY.hour}${PARTY.minute ? ':' + String(PARTY.minute).padStart(2, '0') : ''}`;
  let fra;
  if (live) fra = forced && since >= PARTY.durataMin ? 'anteprima' : `in corso, ancora ${PARTY.durataMin - since} min`;
  else if (untilNext < 60) fra = `tra ${untilNext} min`;
  else if (untilNext < 1440) fra = `tra ${Math.floor(untilNext / 60)} h e ${untilNext % 60} min`;
  else { const g = Math.round(untilNext / 1440); fra = g === 1 ? 'domani' : `tra ${g} giorni`; }
  return { live, forced: forced && since >= PARTY.durataMin, quando, fra, untilNext };
}

export function createParty({ scene, world, audio, robot }) {
  const group = new THREE.Group(); group.visible = false; scene.add(group);
  const { W, D, H } = ROOM;
  const glow = c => new THREE.MeshBasicMaterial({ color: c });
  const COLS = [0xfb923c, 0x5dcaa5, 0x85b7eb, 0xed93b1, 0xfac775, 0xafa9ec];

  // festoni di lucine lungo le pareti
  const bulbs = [];
  const bulbGeo = new THREE.IcosahedronGeometry(0.035, 0);
  const runs = [[-W / 2 + 0.1, -D / 2 + 0.1, W / 2 - 0.1, -D / 2 + 0.1], [-W / 2 + 0.1, D / 2 - 0.1, W / 2 - 0.1, D / 2 - 0.1],
    [-W / 2 + 0.1, -D / 2 + 0.1, -W / 2 + 0.1, D / 2 - 0.1], [W / 2 - 0.1, -D / 2 + 0.1, W / 2 - 0.1, D / 2 - 0.1]];
  for (const [x1, z1, x2, z2] of runs) {
    const n = Math.round(Math.hypot(x2 - x1, z2 - z1) / 0.35);
    for (let i = 0; i <= n; i++) {
      const t = i / n, sag = Math.sin(t * Math.PI * 4) ** 2 * 0.18;
      const m = new THREE.Mesh(bulbGeo, glow(COLS[i % COLS.length]));
      m.position.set(x1 + (x2 - x1) * t, H - 0.25 - sag, z1 + (z2 - z1) * t); group.add(m); bulbs.push(m);
    }
  }

  // palloncini
  const balloons = [];
  const bGeo = new THREE.IcosahedronGeometry(0.17, 1);
  [[-4.4, -3.4], [-4.5, 0.2], [3.6, 3.5], [-2.5, 3.6], [4.5, -1.2], [-1.8, -3.6]].forEach(([x, z], i) => {
    const b = new THREE.Group(); b.position.set(x, 1.9 + (i % 3) * 0.2, z);
    const ball = new THREE.Mesh(bGeo, new THREE.MeshLambertMaterial({ color: COLS[i % COLS.length], flatShading: true })); ball.scale.y = 1.2; b.add(ball);
    const str = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1.0, 3), glow(0xecebe6)); str.position.y = -0.7; b.add(str);
    group.add(b); balloons.push({ b, y: b.position.y, ph: i * 1.3 });
  });

  // palla da discoteca + luci colorate che girano
  const disco = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), new THREE.MeshLambertMaterial({ color: 0xd8d8e0, emissive: 0x2a2a33, flatShading: true }));
  disco.position.set(-2, H - 0.45, 1.6);
  const discoCord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.25, 3), glow(0x3a3833)); discoCord.position.set(-2, H - 0.12, 1.6); group.add(discoCord); group.add(disco);
  const discoLights = [0xed93b1, 0x85b7eb, 0x5dcaa5].map(c => { const l = new THREE.PointLight(c, 6, 6, 2); group.add(l); return l; });

  // striscione sulla parete di fondo
  const c = document.createElement('canvas'); c.width = 1024; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#141413'; g.fillRect(0, 0, 1024, 128);
  for (let i = 0; i < 16; i++) { g.fillStyle = ['#fb923c', '#5dcaa5', '#85b7eb', '#ed93b1'][i % 4]; g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64 + 64, 0); g.lineTo(i * 64 + 32, 34); g.fill(); }
  g.fillStyle = '#ecebe6'; g.font = 'bold 54px monospace'; g.textAlign = 'center'; g.fillText('🎉 ' + PARTY.nome.toUpperCase() + ' 🎉', 512, 98);
  const bt = new THREE.CanvasTexture(c); bt.colorSpace = THREE.SRGBColorSpace;
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.45), new THREE.MeshBasicMaterial({ map: bt }));
  banner.position.set(0, 2.7, -D / 2 + 0.06); group.add(banner);

  // cappellino per il robottino
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.24, 8), new THREE.MeshLambertMaterial({ color: 0xed93b1, flatShading: true }));
  hat.position.set(0.08, 0.24, 0); hat.rotation.z = -0.3; hat.visible = false; robot.avatar.head.add(hat);

  // coriandoli (un'unica geometria a punti, nessun costo se fermi)
  const N = 260, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), vel = new Float32Array(N * 3);
  const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); cg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const confetti = new THREE.Points(cg, new THREE.PointsMaterial({ size: 0.06, vertexColors: true }));
  confetti.visible = false; confetti.frustumCulled = false; scene.add(confetti);
  let confT = 0;
  function burst() {
    const tmp = new THREE.Color();
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * W * 0.8; pos[i * 3 + 1] = H - 0.1 - Math.random() * 0.4; pos[i * 3 + 2] = (Math.random() - 0.5) * D * 0.8;
      vel[i * 3] = (Math.random() - 0.5) * 0.6; vel[i * 3 + 1] = -0.4 - Math.random() * 0.6; vel[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
      tmp.setHex(COLS[i % COLS.length]); col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
    }
    cg.attributes.position.needsUpdate = true; cg.attributes.color.needsUpdate = true;
    confetti.visible = true; confT = 5;
  }

  // musica leggera, generata (nessun file). Si sente solo se l'audio è attivo.
  let music = null, musicOn = true;
  try { musicOn = localStorage.getItem('ra_musica') !== 'off'; } catch (e) {}
  function startMusic() {
    if (music || !audio.enabled || !musicOn) return;
    const ctx = audio.context(); if (!ctx) return;
    const out = ctx.createGain(); out.gain.value = 0.0001; out.connect(audio.output());
    out.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 2);
    const bpm = 112, beat = 60 / bpm; let next = ctx.currentTime + 0.1, step = 0;
    const bass = [55, 55, 65.4, 49];
    const timer = setInterval(() => {
      while (next < ctx.currentTime + 0.3) {
        const t = next, bar = Math.floor(step / 8) % 4;
        if (step % 2 === 0) { // cassa
          const o = ctx.createOscillator(), gg = ctx.createGain(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
          gg.gain.setValueAtTime(0.5, t); gg.gain.exponentialRampToValueAtTime(0.001, t + 0.2); o.connect(gg).connect(out); o.start(t); o.stop(t + 0.22);
        }
        { // basso
          const o = ctx.createOscillator(), gg = ctx.createGain(); o.type = 'triangle'; o.frequency.value = bass[bar] * (step % 4 === 3 ? 2 : 1);
          gg.gain.setValueAtTime(0.18, t); gg.gain.exponentialRampToValueAtTime(0.001, t + beat / 2 * 0.9); o.connect(gg).connect(out); o.start(t); o.stop(t + beat / 2);
        }
        if (step % 2 === 1) { // charleston
          const len = 0.04 * ctx.sampleRate, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
          for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
          const s = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), gg = ctx.createGain(); s.buffer = buf; hp.type = 'highpass'; hp.frequency.value = 7000; gg.gain.value = 0.08;
          s.connect(hp).connect(gg).connect(out); s.start(t);
        }
        next += beat / 2; step++;
      }
    }, 100);
    music = { out, timer, ctx };
  }
  function stopMusic() {
    if (!music) return; const m = music; music = null;
    m.out.gain.setTargetAtTime(0.0001, m.ctx.currentTime, 0.3);
    setTimeout(() => { clearInterval(m.timer); m.out.disconnect(); }, 1500);
  }

  // brindisi di gruppo: se abbastanza persone brindano entro 8 s, coriandoli per tutti
  const cheers = new Map(); let lastBurst = -1e9;
  function onCheers(who, presenti) {
    const now = performance.now(); cheers.set(who, now);
    for (const [k, t] of cheers) if (now - t > 8000) cheers.delete(k);
    const need = Math.max(2, Math.min(3, presenti));
    if (presenti >= 2 && cheers.size >= need && now - lastBurst > 20000) { lastBurst = now; cheers.clear(); burst(); audio.coin(); return true; }
    return false;
  }

  let info = partyInfo(), checkT = 0, live = false;
  function setLive(v) {
    live = v; group.visible = v; hat.visible = v;
    world.lights.ceiling.intensity = v ? 12 : 24;
    robot.setParty(v);
    if (v) startMusic(); else stopMusic();
  }
  setLive(info.live);

  return {
    get live() { return live; },
    ceilingBase() { return live ? 12 : 24; },
    get info() { return info; },
    get musicOn() { return musicOn; },
    toggleMusic() { musicOn = !musicOn; try { localStorage.setItem('ra_musica', musicOn ? 'on' : 'off'); } catch (e) {} if (musicOn && live) startMusic(); else stopMusic(); return musicOn; },
    audioChanged() { if (live && audio.enabled) startMusic(); else stopMusic(); },
    onCheers, burst,
    update(t, dt) {
      checkT -= dt;
      if (checkT <= 0) { checkT = 20; info = partyInfo(); if (info.live !== live) setLive(info.live); }
      if (live) {
        bulbs.forEach((b, i) => b.scale.setScalar(((Math.floor(t * 2) + i) % 3 === 0) ? 1.4 : 0.8));
        balloons.forEach(o => { o.b.position.y = o.y + Math.sin(t * 0.8 + o.ph) * 0.06; o.b.rotation.y = Math.sin(t * 0.5 + o.ph) * 0.3; });
        disco.rotation.y = t * 0.6;
        discoLights.forEach((l, i) => { const a = t * 0.9 + i * 2.1; l.position.set(Math.cos(a) * 3, 1.2 + Math.sin(t + i) * 0.4, 0.5 + Math.sin(a) * 2.4); });
      }
      if (confT > 0) {
        confT -= dt;
        for (let i = 0; i < N; i++) {
          pos[i * 3] += vel[i * 3] * dt + Math.sin(t * 3 + i) * 0.003; pos[i * 3 + 1] = Math.max(0.01, pos[i * 3 + 1] + vel[i * 3 + 1] * dt); pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        }
        cg.attributes.position.needsUpdate = true;
        if (confT <= 0) confetti.visible = false;
      }
    },
  };
}
