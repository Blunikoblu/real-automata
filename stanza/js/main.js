// Real Automata · mondo virtuale. Punto di ingresso: collega mondo, giocatore, rete e interfaccia.
import * as THREE from 'three';
import { EMOTES, AVATARS, COLORS, NET } from './config.js';
import { h, cleanNick, cleanText, eur } from './util.js';
import { loadData } from './data.js';
import { audio } from './audio.js';
import { Avatar, previewRenderer } from './avatars.js';
import { buildOffice } from './world.js';
import { createPlayer } from './player.js';
import { createNet } from './net.js';
import { createUI } from './ui.js';

const isTouch = matchMedia('(pointer: coarse)').matches;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = id => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem('ra_' + k); return v == null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('ra_' + k, v); } catch (e) {} },
};

const data = await loadData();
const ui = createUI();
$('hudL').replaceChildren('GIORNO ', h('b', {}, `${data.giorno}/90`), ` · CASSA ${eur(data.saldo)}`);
$('help').textContent = isTouch
  ? 'Joystick a sinistra per camminare · trascina a destra per guardarti intorno · tocca il pulsante per aprire'
  : 'WASD per camminare · frecce o trascina il mouse per girarti · E per aprire · 1–5 per le reazioni';

// ---------- Rendering ----------
const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouch, powerPreference: 'high-performance' });
let pixelRatio = Math.min(devicePixelRatio, isTouch ? 1.5 : 2);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x141413);
scene.fog = new THREE.Fog(0x141413, 10, 20);
const camera = new THREE.PerspectiveCamera(isTouch ? 75 : 70, innerWidth / innerHeight, 0.05, 40);
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight, false); });

// ---------- Mondo ----------
let salutiCache = [];
const hooks = {
  sound: n => audio[n]?.(),
  toast: t => ui.toast(t),
  secret: id => { const s = new Set((store.get('segreti', '') || '').split(',').filter(Boolean)); s.add(id); store.set('segreti', [...s].join(',')); },
  salutiPanel: () => salutiPanel(),
};
const world = buildOffice(scene, data, hooks);

// ---------- Giocatore ----------
const player = createPlayer(camera, canvas, world.solids, {
  isTouch, spawn: world.spawn, joy: $('joy'), knob: $('knob'),
  onStep: () => { if (!reduceMotion) audio.step(); },
});

// ---------- Altri visitatori ----------
const others = new Map(); // id -> { meta, av, x, z, r, has }
const shadowGeo = new THREE.CircleGeometry(0.32, 12);
const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false });
function addOther(id, meta) {
  const av = new Avatar(meta.av, meta.col, meta.nick);
  const sh = new THREE.Mesh(shadowGeo, shadowMat); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.006; av.g.add(sh);
  av.g.visible = false; scene.add(av.g);
  others.set(id, { meta, av, x: 0, z: 0, r: 0, has: false, seen: performance.now() });
}
function removeOther(id) {
  const o = others.get(id); if (!o) return;
  scene.remove(o.av.g); o.av.dispose(); others.delete(id);
}

const net = createNet({
  onStatus: (mode, msg) => {
    ui.setStatus(mode, mode === 'online' ? '' : mode === 'online-pubblico' ? '' : msg);
    if (mode === 'solo') { ui.setCount(1); world.setPresenti(1); }
  },
  onCount: n => { ui.setCount(n); world.setPresenti(n); },
  onPeerJoin: (id, meta, notify) => {
    addOther(id, meta);
    if (notify && entered) { ui.toast(`${meta.nick} è entrato nella stanza`, 'join'); audio.join(); }
  },
  onPeerUpdate: (id, meta) => {
    const o = others.get(id); if (!o) return;
    if (o.meta.av !== meta.av || o.meta.col !== meta.col) {
      const vis = o.av.g.visible, pos = o.av.g.position.clone(), rot = o.av.g.rotation.y;
      removeOther(id); addOther(id, meta);
      const n = others.get(id); Object.assign(n, { x: o.x, z: o.z, r: o.r, has: o.has }); n.av.g.position.copy(pos); n.av.g.rotation.y = rot; n.av.g.visible = vis;
    } else { o.av.setNick(meta.nick); o.meta = meta; }
  },
  onPeerLeave: (id, meta, silent) => {
    removeOther(id);
    if (!silent && entered) { ui.toast(`${meta.nick} è uscito`, 'leave'); audio.leave(); }
  },
  onPos: (id, x, z, r) => {
    const o = others.get(id); if (!o) return;
    if (!o.has || Math.hypot(x - o.av.g.position.x, z - o.av.g.position.z) > 3) { o.av.g.position.set(x, 0, z); o.av.g.rotation.y = r; }
    o.x = x; o.z = z; o.r = r; o.has = true; o.seen = performance.now(); o.av.g.visible = true;
  },
  onEmote: (id, e) => {
    const o = others.get(id), em = EMOTES.find(x => x.id === e); if (!o || !em) return;
    o.av.showEmote(em.glyph); audio.pop();
  },
  onSalutiChanged: () => refreshSaluti(),
});

// ---------- Bacheca dei saluti ----------
async function refreshSaluti() {
  const r = await net.fetchSaluti();
  if (!r.error) { salutiCache = r.list; world.setSaluti(salutiCache); }
  else world.setSaluti([], 'Bacheca non raggiungibile ora.');
  return r;
}
refreshSaluti();

function salutiPanel() {
  const listBox = h('div', {}, h('p', { class: 'muted' }, 'Caricamento…'));
  const err = h('div', { class: 'err', role: 'alert' });
  const input = h('input', { type: 'text', id: 'salTxt', maxlength: '80', placeholder: 'Ciao da Mantova! In bocca al lupo.', autocomplete: 'off', autofocus: true });
  const send = h('button', { class: 'btn', type: 'submit' }, 'Appendi il saluto');
  const form = h('form', { class: 'form' },
    h('label', { for: 'salTxt' }, `Lascia un saluto come “${myChoice.nick}”`), input,
    h('div', { class: 'hint' }, 'Massimo 80 caratteri, niente link. Un saluto al minuto. Resta visibile a tutti i visitatori.'), err, send);
  form.addEventListener('submit', async e => {
    e.preventDefault(); err.textContent = '';
    send.disabled = true; send.textContent = 'Lo appendo…';
    const r = await net.postSaluto(myChoice.nick, input.value);
    send.disabled = false; send.textContent = 'Appendi il saluto';
    if (r.error) { err.textContent = r.error; return; }
    input.value = ''; ui.toast('Saluto appeso in bacheca. Grazie!'); audio.coin();
    render(await refreshSaluti());
  });
  function render(r) {
    if (r.error) { listBox.replaceChildren(h('p', { class: 'muted' }, 'Non riesco a leggere la bacheca in questo momento.')); return; }
    if (!r.list.length) { listBox.replaceChildren(h('p', { class: 'muted' }, 'Nessun saluto ancora: il primo è tuo.')); return; }
    listBox.replaceChildren(...r.list.map(s => h('div', { class: 'note' }, s.testo,
      h('small', {}, `— ${s.nick} · ${new Date(s.at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`))));
  }
  if (!net.canWrite) {
    input.disabled = true; send.disabled = true;
    err.textContent = net.mode === 'connecting' ? 'Mi sto ancora collegando: riapri la bacheca tra qualche secondo.' : 'Per ora la bacheca è in sola lettura: sto ancora attivando la scrittura sicura. Torna presto!';
  }
  ui.openPanel([h('h2', {}, 'Bacheca dei saluti'),
    h('p', {}, 'Una bacheca condivisa: quello che scrivi qui lo leggono tutti i visitatori. Io leggo tutto e tolgo ciò che offende o fa pubblicità.'),
    form, listBox], { label: 'Bacheca dei saluti' });
  refreshSaluti().then(render);
}

// ---------- Interazione con gli oggetti ----------
const promptBtn = $('prompt');
let current = null;
const fwd = new THREE.Vector3(), tmp = new THREE.Vector3();
function use(o) {
  if (!o) return;
  audio.unlock();
  if (o.use) { o.use(); return; }
  audio.open();
  ui.openPanel(o.open(), { label: o.name, onClose: () => audio.close() });
}
promptBtn.onclick = () => use(current);

addEventListener('keydown', e => {
  if (!entered || e.target.tagName === 'INPUT') return;
  if (ui.panelOpen) return;
  if ((e.code === 'KeyE' || e.code === 'Enter') && current) { e.preventDefault(); use(current); }
  const em = EMOTES.find(x => x.key === e.key); if (em) emote(em.id);
});

function pickTarget() {
  camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
  let best = null, bestS = 0;
  for (const o of world.objects) {
    tmp.set(o.pos.x - camera.position.x, 0, o.pos.z - camera.position.z);
    const dist = tmp.length(); const r = o.hidden ? o.radius * 0.8 : o.radius;
    const inRange = dist <= r;
    const s = inRange ? tmp.normalize().dot(fwd) - dist * 0.08 : -1;
    o._near = inRange;
    if (s > 0.4 && s > bestS) { best = o; bestS = s; }
  }
  return best;
}

// ---------- Emoji ----------
function emote(id) {
  audio.unlock();
  const em = EMOTES.find(x => x.id === id); if (!em) return;
  if (!net.sendEmote(id)) return;
  const b = h('div', { class: 'selfemo', 'aria-hidden': 'true' }, em.glyph);
  document.body.append(b); setTimeout(() => b.remove(), 1600);
  audio.pop();
}
ui.emoteBar(emote);

// ---------- Pannelli dell'HUD ----------
$('countBtn').onclick = () => {
  const rows = [h('div', { class: 'who' }, h('i', { style: `background:${myChoice.col}` }), `${myChoice.nick} (tu)`)];
  for (const o of others.values()) rows.push(h('div', { class: 'who' }, h('i', { style: `background:${o.meta.col}` }), o.meta.nick, h('span', { class: 'muted', style: 'margin-left:auto' }, AVATARS.find(a => a.id === o.meta.av)?.nome || '')));
  const m = net.mode;
  ui.openPanel([h('h2', {}, 'Chi è qui ora'),
    h('p', { class: 'muted' }, m === 'online' || m === 'online-pubblico' ? `${others.size + 1} ${others.size ? 'persone' : 'persona'} nella stanza in questo momento.` : 'Modalità multiplayer non attiva: vedi solo te stesso.'),
    ...rows], { label: 'Chi è online' });
};

$('audioBtn').textContent = audio.enabled ? '🔊' : '🔇';
$('audioBtn').onclick = () => { const on = audio.toggle(); $('audioBtn').textContent = on ? '🔊' : '🔇'; audio.unlock(); ui.toast(on ? 'Suoni attivi.' : 'Suoni disattivati.'); };

$('listBtn').onclick = () => {
  const found = new Set((store.get('segreti', '') || '').split(','));
  const items = world.objects.filter(o => !o.hidden || found.has(o.id) || o.id === 'poster' || o.id === 'tazza');
  ui.openPanel([h('h2', {}, 'Elenco della stanza'),
    h('p', { class: 'muted' }, 'Una versione senza 3D: scegli un oggetto e lo apro per te. Ti sposto anche davanti a lui, se vuoi tornare a guardarti intorno.'),
    h('ul', { class: 'list' }, ...items.map(o => h('li', {}, h('button', { type: 'button', onclick: () => {
      ui.closePanel();
      // mi metto davanti all'oggetto e lo guardo
      const dx = o.pos.x, dz = o.pos.z; const back = new THREE.Vector3(-dx, 0, -dz).normalize().multiplyScalar(1.3);
      player.teleport(THREE.MathUtils.clamp(dx + back.x, -4.6, 4.6), THREE.MathUtils.clamp(dz + back.z, -3.6, 3.6)); player.lookAt(dx, dz);
      use(o);
    } }, h('b', {}, o.name), o.desc))))], { label: 'Elenco della stanza' });
};

$('setBtn').onclick = () => {
  const nick = h('input', { type: 'text', id: 'setNick', maxlength: '16', value: myChoice.nick });
  let av = myChoice.av, col = myChoice.col;
  const avs = AVATARS.map(a => h('button', { type: 'button', class: 'chip', 'aria-pressed': String(a.id === av), onclick: e => { av = a.id; [...e.currentTarget.parentNode.children].forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget))); } }, a.nome));
  const cols = COLORS.map(c => h('button', { type: 'button', class: 'swatch', style: `background:${c}`, 'aria-label': 'Colore ' + c, 'aria-pressed': String(c === col), onclick: e => { col = c; [...e.currentTarget.parentNode.children].forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget))); } }));
  const form = h('form', { class: 'form' },
    h('label', { for: 'setNick' }, 'Nome'), nick,
    h('label', {}, 'Avatar (lo vedono gli altri)'), h('div', { class: 'chips' }, ...avs),
    h('label', {}, 'Colore'), h('div', { class: 'chips' }, ...cols),
    h('p', { style: 'margin-top:16px' }, h('button', { class: 'btn', type: 'submit' }, 'Salva')));
  form.addEventListener('submit', e => {
    e.preventDefault();
    myChoice = { nick: cleanNick(nick.value), av, col };
    store.set('nick', myChoice.nick); store.set('av', av); store.set('col', col);
    net.updateMe(myChoice); ui.closePanel(); ui.toast('Fatto: gli altri ti vedono così.');
  });
  ui.openPanel([h('h2', {}, 'Impostazioni'), form,
    h('p', {}, h('button', { class: 'btn ghost', type: 'button', onclick: () => $('audioBtn').click() }, audio.enabled ? 'Disattiva i suoni' : 'Attiva i suoni')),
    h('p', { class: 'muted' }, isTouch ? 'Comandi: joystick a sinistra per camminare, trascina a destra per guardarti intorno, tocca il pulsante arancione per aprire gli oggetti.'
      : 'Comandi: WASD per camminare (Maiusc per andare più veloce), frecce o mouse per girarti, E per aprire, 1–5 per le reazioni, Esc per chiudere.'),
    h('p', { class: 'muted' }, 'Il nome e l\'aspetto restano salvati solo in questo browser, per comodità.')], { label: 'Impostazioni' });
};

// ---------- Entrata ----------
let entered = false;
let myChoice = { nick: store.get('nick', ''), av: store.get('av', 'robot'), col: store.get('col', COLORS[0]) };
if (!AVATARS.some(a => a.id === myChoice.av)) myChoice.av = 'robot';
if (!COLORS.includes(myChoice.col)) myChoice.col = COLORS[0];

let last = performance.now(), slowFrames = 0, aiLook = new THREE.Vector3();
function frame(t) {
  const dt = Math.min((t - last) / 1000, 0.05); last = t;
  const time = t / 1000;
  player.enabled = entered && !ui.panelOpen;
  player.update(dt);
  if (entered) net.sendPos(camera.position.x, camera.position.z, player.yaw);

  // altri visitatori: interpolazione morbida verso l'ultima posizione ricevuta
  const k = 1 - Math.exp(-dt * 10);
  let lookAt = null, lookD = 3.5;
  const meD = Math.hypot(camera.position.x - 0.45, camera.position.z + 1.65);
  if (entered && meD < lookD) { lookD = meD; aiLook.set(camera.position.x, 1.6, camera.position.z); lookAt = aiLook; }
  for (const [id, o] of others) {
    const g = o.av.g;
    if (!o.has) continue;
    const px = g.position.x, pz = g.position.z;
    g.position.x += (o.x - px) * k; g.position.z += (o.z - pz) * k;
    let dr = o.r - g.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); g.rotation.y += dr * k;
    const speed = Math.hypot(g.position.x - px, g.position.z - pz) / Math.max(dt, 1e-3);
    o.av.update(dt, speed, time);
    const d = Math.hypot(g.position.x - 0.45, g.position.z + 1.65);
    if (d < lookD) { lookD = d; lookAt = g.position; }
    if (performance.now() - o.seen > NET.staleMs * 5 && !net.peers.has(id)) removeOther(id);
  }

  // oggetti vicini: indicatore e pulsante
  const target = entered && !ui.panelOpen ? pickTarget() : null;
  for (const o of world.objects) {
    const show = entered && o._near && (!o.hidden || o === target);
    o.marker.visible = show;
    if (show) { o.marker.rotation.y = time * 1.5; o.marker.position.y = (o.markerY ?? o.pos.y + 0.55) + Math.sin(time * 3) * 0.04; o.marker.scale.setScalar(o === target ? 1.4 : 0.8); }
  }
  if (target !== current) {
    current = target; promptBtn.hidden = !target;
    if (target) promptBtn.textContent = (isTouch ? 'Tocca: ' : 'E · ') + target.name;
  }

  const ctx = { near: !!lookAt, look: lookAt, plantNear: Math.hypot(camera.position.x - 4.3, camera.position.z + 3.4) < 1.6 };
  for (const f of world.animated) f(time, dt, ctx);

  // qualità adattiva: se il telefono fatica, abbasso la risoluzione
  if (dt > 0.034) { if (++slowFrames > 90 && pixelRatio > 0.75) { pixelRatio = Math.max(0.75, pixelRatio - 0.25); renderer.setPixelRatio(pixelRatio); renderer.setSize(innerWidth, innerHeight, false); slowFrames = 0; } }
  else slowFrames = Math.max(0, slowFrames - 1);

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

const choice = await ui.intro(myChoice, previewRenderer);
myChoice = choice;
store.set('nick', choice.nick); store.set('av', choice.av); store.set('col', choice.col);
entered = true;
audio.unlock();
net.start(choice);
ui.toast(`Benvenuto, ${choice.nick}. Avvicinati agli oggetti: il rombo arancione indica che puoi interagire.`);
setTimeout(() => { $('help').style.opacity = 0; }, 12000);

// Per i test automatici (nessun dato sensibile).
window.__ra = { camera, player, world, net, others, ui, use };
