// Real Automata · mondo virtuale. Punto di ingresso: collega mondo, personaggi, rete e interfaccia.
import * as THREE from 'three';
import { EMOTES, AVATARS, COLORS, NET, PARTY, CHAT, ROOM } from './config.js?v=202611182039';
import { createParty } from './party.js?v=202611182039';
import { h, cleanNick, eur } from './util.js?v=202611182039';
import { loadData } from './data.js?v=202611182039';
import { audio } from './audio.js?v=202611182039';
import { Avatar, previewRenderer } from './avatars.js?v=202611182039';
import { buildOffice } from './world.js?v=202611182039';
import { buildGarden, GARDEN } from './garden.js?v=202611182039';
import { createRobot } from './robot.js?v=202611182039';
import { createSecrets } from './secrets.js?v=202611182039';
import { computeProgress, buildTrophyShelf } from './progress.js?v=202611182039';
import { createCollider, createPlayer } from './player.js?v=202611182039';
import { createNet } from './net.js?v=202611182039';
import { createChat } from './chat.js?v=202611182039';
import { createUI } from './ui.js?v=202611182039';

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
  ? 'Joystick per camminare · trascina per girarti · tocca un punto o un oggetto per andarci'
  : 'WASD per camminare · trascina per girarti · clic su un punto per andarci · E per aprire · V cambia vista · C chat';

// ---------- Rendering ----------
const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouch, powerPreference: 'high-performance' });
let pixelRatio = Math.min(devicePixelRatio, isTouch ? 1.5 : 2);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x141413);
scene.fog = new THREE.Fog(0x141413, 14, 40);
const camera = new THREE.PerspectiveCamera(isTouch ? 72 : 66, innerWidth / innerHeight, 0.05, 160);
camera.rotation.order = 'YXZ';
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight, false); });

// ---------- Mondo ----------
let salutiCache = [], robot, party, garden;
const hooks = {
  sound: n => audio[n]?.(),
  toast: t => ui.toast(t),
  salutiPanel: () => salutiPanel(),
  goto: (x, z) => routeTo(x, z),
  sit: seats => sitOn(seats),
  robotSay: t => robot.say(t),
  confetti: () => party.burst(),
  ceilingBase: () => party.ceilingBase(),
};
const world = buildOffice(scene, data, hooks);
robot = createRobot(scene, data, hooks);
world.add(robot.object);
party = createParty({ scene, world, audio, robot });
garden = buildGarden(scene, world, data, hooks);

// Progressione: trofei, decorazioni e feste solo dai dati ufficiali
const progress = computeProgress(data);
buildTrophyShelf(world, data, progress);
progress.filter(m => m.ok).forEach(m => garden.unlock(m.id));

// Locandina del party sulla parete d'ingresso (si aggiorna da sola)
const posterTex = world.canvasTex(300, 400, () => {});
function drawPoster() {
  const { g } = posterTex.userData, w = 300, hh = 400, i = party.info;
  g.fillStyle = '#2a1f17'; g.fillRect(0, 0, w, hh);
  ['#fb923c', '#5dcaa5', '#85b7eb', '#ed93b1'].forEach((c, k) => { g.fillStyle = c; g.beginPath(); g.arc(40 + k * 72, 46, 16, 0, 7); g.fill(); });
  g.fillStyle = '#fac775'; g.textAlign = 'center'; g.font = 'bold 44px Georgia'; g.fillText('PARTY', w / 2, 130);
  g.fillStyle = '#ecebe6'; g.font = 'bold 26px monospace'; g.fillText(i.quando.toUpperCase(), w / 2, 180);
  g.font = '22px Georgia'; g.fillText('nella stanza, con chi c\'è', w / 2, 222);
  g.fillStyle = i.live ? '#fb923c' : '#a19e95'; g.font = 'bold 30px monospace'; g.fillText(i.live ? 'ORA!' : i.fra.toUpperCase(), w / 2, 300);
  g.fillStyle = '#8a877e'; g.font = '18px monospace'; g.fillText('musica · balli · brindisi', w / 2, 360);
  posterTex.needsUpdate = true;
}
drawPoster(); setInterval(drawPoster, 30000);
world.sign(0.75, 1.0, posterTex, -3.3, 1.65, ROOM.D / 2 - 0.04, Math.PI);
world.add({ id: 'party', name: 'Locandina del party', pos: [-3.3, 1.6, 3.5], radius: 1.9,
  desc: `Party nella stanza ogni ${party.info.quando}.`, open: () => partyPanelNodes() });
function partyPanelNodes() {
  const i = party.info;
  return [h('h2', {}, PARTY.nome),
    h('div', { class: 'big', style: 'font-size:32px' }, i.live ? 'Adesso! 🎉' : `${i.quando[0].toUpperCase() + i.quando.slice(1)}`),
    i.live ? null : h('p', { class: 'muted' }, `Il prossimo è ${i.fra}. Ora italiana, dura un'ora.`),
    h('p', {}, 'Una volta a settimana l\'ufficio si trasforma: lucine, palloncini, musica leggera, la palla da discoteca. Durante il party c\'è una reazione in più: 🥂 brinda.'),
    h('p', {}, 'Se abbastanza persone brindano insieme, entro pochi secondi piovono coriandoli per tutti.'),
    h('div', { class: 'domanda' }, 'Domanda della serata: ', h('b', {}, PARTY.domanda), ' Rispondi nella bacheca dei saluti.'),
    h('p', { class: 'muted' }, 'Il robottino sono io, ma non chiacchiero in tempo reale: il party è per voi visitatori. Leggo la bacheca nella sessione dopo.'),
    i.live ? h('p', {}, h('button', { class: 'btn ghost', type: 'button', onclick: e => { const on = party.toggleMusic(); e.currentTarget.textContent = on ? 'Spegni la musica' : 'Accendi la musica'; } }, party.musicOn ? 'Spegni la musica' : 'Accendi la musica')) : null];
}

// ---------- Movimento e collisioni (aree: ufficio + porta + giardino) ----------
const collider = createCollider(0.3);
collider.areas.push(...world.areas, ...garden.areas);
collider.solids.push(...world.solids);
const AREA = Object.fromEntries(collider.areas.map(a => [a.id, a]));
const areaOf = (x, z) => z > GARDEN.z0 + 0.25 ? 'giardino' : (z > ROOM.D / 2 - 0.35 && Math.abs(x) < 0.7 ? 'porta' : 'ufficio');

let viewMode = store.get('vista', 'terza');
const player = createPlayer(canvas, collider, {
  isTouch, spawn: { x: 0, z: 2.6, yaw: 0 }, joy: $('joy'), knob: $('knob'),
  pitchMin: -0.9, pitchMax: 1.0,
  onStep: () => { if (!reduceMotion) audio.step(); },
  onTap: (x, y) => onTap(x, y),
});

// Percorsi: se la meta è dall'altra parte della porta, prima si passa dalla porta.
function routeTo(x, z, then) {
  const from = areaOf(player.pos.x, player.pos.z), to = areaOf(x, z);
  const go = () => player.walkTo(x, z, then);
  if (from === to || from === 'porta' || to === 'porta') return go();
  const a = to === 'giardino' ? { x: 0, z: 3.4 } : { x: 0, z: 5.0 }, b = to === 'giardino' ? { x: 0, z: 5.0 } : { x: 0, z: 3.4 };
  player.walkTo(a.x, a.z, () => player.walkTo(b.x, b.z, go));
}

// ---------- Il mio personaggio (visibile in terza persona) ----------
let myChoice = { nick: store.get('nick', ''), av: store.get('av', 'robot'), col: store.get('col', COLORS[0]) };
if (!AVATARS.some(a => a.id === myChoice.av)) myChoice.av = 'robot';
if (!COLORS.includes(myChoice.col)) myChoice.col = COLORS[0];
let me = null;
function buildMe() {
  if (me) { scene.remove(me.g); me.dispose(); }
  me = new Avatar(myChoice.av, myChoice.col, null); scene.add(me.g);
}
buildMe();

// ---------- Altri visitatori ----------
const others = new Map(); // id -> { meta, av, x, z, r, a, has, seen, metT }
function addOther(id, meta) {
  const av = new Avatar(meta.av, meta.col, meta.nick);
  av.g.visible = false; scene.add(av.g);
  others.set(id, { meta, av, x: 0, z: 0, r: 0, a: 0, has: false, seen: performance.now(), metT: -1e9 });
}
function removeOther(id) { const o = others.get(id); if (!o) return; scene.remove(o.av.g); o.av.dispose(); others.delete(id); }

const secrets = createSecrets({ scene, ui, audio, onChange: n => { $('secretsN').textContent = `${n}/${secrets.total}`; } });
$('secretsN').textContent = `${secrets.count}/${secrets.total}`;

const net = createNet({
  onStatus: (mode, msg) => {
    ui.setStatus(mode, mode === 'online' || mode === 'online-pubblico' ? '' : msg);
    if (mode === 'solo') { ui.setCount(1); world.setPresenti(1); robot.onCount(1); }
  },
  onCount: n => { ui.setCount(n); world.setPresenti(n); robot.onCount(n); },
  onPeerJoin: (id, meta, notify) => {
    addOther(id, meta);
    if (notify && entered) { ui.toast(`${meta.nick} è entrato nel mondo`, 'join'); audio.join(); if (myArea !== 'giardino') robot.onJoin(meta.nick); }
  },
  onPeerUpdate: (id, meta) => {
    const o = others.get(id); if (!o) return;
    if (o.meta.av !== meta.av || o.meta.col !== meta.col) {
      const vis = o.av.g.visible, pos = o.av.g.position.clone(), rot = o.av.g.rotation.y, keep = { x: o.x, z: o.z, r: o.r, a: o.a, has: o.has };
      removeOther(id); addOther(id, meta);
      const n = others.get(id); Object.assign(n, keep); n.av.g.position.copy(pos); n.av.g.rotation.y = rot; n.av.g.visible = vis; n.av.setSeated(keep.a === 1);
    } else { if (o.meta.nick !== meta.nick) o.av.setNick(meta.nick); o.meta = meta; }
  },
  onPeerLeave: (id, meta, silent) => {
    removeOther(id);
    if (!silent && entered) { ui.toast(`${meta.nick} è uscito`, 'leave'); audio.leave(); }
  },
  onPos: (id, x, z, r, a) => {
    const o = others.get(id); if (!o) return;
    if (!o.has || Math.hypot(x - o.av.g.position.x, z - o.av.g.position.z) > 4) { o.av.g.position.set(x, 0, z); o.av.g.rotation.y = r; }
    o.x = x; o.z = z; o.r = r; o.has = true; o.seen = performance.now(); o.av.g.visible = true;
    if (o.a !== a) { o.a = a; o.av.setSeated(a === 1); }
  },
  onEmote: (id, e, target) => {
    const o = others.get(id), em = EMOTES.find(x => x.id === e); if (!o || !em) return;
    if (em.party && !party.live) return;
    o.av.showEmote(em.glyph); if (em.anim) o.av.play(em.anim); audio.pop();
    if (target === net.myId) ui.toast(`${o.meta.nick} ti saluta ${em.glyph}`, 'join');
    if (e === 'cheers' && party.onCheers(id, others.size + 1)) ui.toast('🥂 Brindisi di gruppo! Coriandoli per tutti.');
  },
  onSalutiChanged: () => refreshSaluti(),
  onChat: m => chat.receive(m),
  onChatStatus: ok => chat.setReady(ok),
});

const chat = createChat({
  net, ui, audio, globalEnabled: data.chat !== false, getNick: () => myChoice.nick,
  onBubble: (id, text) => {
    if (id === 'me') { if (viewMode === 'terza') me.say(text, CHAT.bubbleMs); return; }
    others.get(id)?.av.say(text, CHAT.bubbleMs);
  },
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
    err.textContent = net.mode === 'connecting' ? 'Mi sto ancora collegando: riapri la bacheca tra qualche secondo.' : 'Per ora la bacheca è in sola lettura: la connessione multiplayer non è attiva.';
  }
  ui.openPanel([h('h2', {}, 'Bacheca dei saluti'),
    party.live ? h('div', { class: 'domanda' }, 'Domanda della serata: ', h('b', {}, PARTY.domanda)) : null,
    h('p', {}, 'Una bacheca condivisa: quello che scrivi qui lo leggono tutti i visitatori. Io leggo tutto e tolgo ciò che offende o fa pubblicità.'),
    form, listBox], { label: 'Bacheca dei saluti' });
  refreshSaluti().then(render);
}

// ---------- Panchine ----------
function sitOn(seats) {
  const taken = s => [...others.values()].some(o => o.a === 1 && Math.hypot(o.x - s.x, o.z - s.z) < 0.3);
  const seat = seats.find(s => !taken(s));
  if (!seat) { ui.toast('La panchina è piena: aspetta che qualcuno si alzi.'); return; }
  routeTo(seat.sx, seat.sz, () => { player.sit(seat); audio.pop(); ui.toast('Ti sei seduto. Muoviti per rialzarti.'); });
}

// ---------- Interazione con gli oggetti ----------
const promptBtn = $('prompt');
let current = null;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
function use(o) {
  if (!o) return;
  audio.unlock();
  if (o.secret) secrets.discover(o.secret, tmp.copy(o.pos).setY(o.markerY ?? o.pos.y + 0.4));
  if (o.use) { o.use(); return; }
  audio.open();
  ui.openPanel(o.open(), { label: o.name, onClose: () => audio.close() });
}
promptBtn.onclick = () => use(current);

function pickTarget() {
  const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw), px = player.pos.x, pz = player.pos.z;
  let best = null, bestS = -1;
  for (const o of world.objects) {
    if (o.follow) o.pos.set(o.follow.position.x, o.pos.y, o.follow.position.z);
    const dx = o.pos.x - px, dz = o.pos.z - pz, dist = Math.hypot(dx, dz);
    const r = o.hidden ? o.radius * 0.8 : o.radius;
    o._near = dist <= r;
    if (o.proximity && dist < o.proximity && o.secret && !secrets.has(o.secret)) use(o);
    if (!o._near) continue;
    const dot = dist > 0.01 ? (dx * fx + dz * fz) / dist : 1;
    const s = dot - dist * 0.12 + (o.hidden ? -0.1 : 0);
    if (dot > 0.15 && s > bestS) { best = o; bestS = s; }
  }
  return best;
}

// Clic/tocco: su un oggetto → ci vai e lo apri; su un visitatore → ci vai e lo saluti; sul pavimento → ci vai.
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function onTap(x, y) {
  if (!entered || ui.panelOpen) return;
  audio.unlock();
  let best = null, bestD = isTouch ? 60 : 45;
  const test = (p, item) => { tmp.copy(p).project(camera); if (tmp.z > 1) return; const sx = (tmp.x + 1) / 2 * innerWidth, sy = (1 - tmp.y) / 2 * innerHeight; const d = Math.hypot(sx - x, sy - y); if (d < bestD) { bestD = d; best = item; } };
  for (const o of world.objects) { if (o.hidden && !o._near) continue; if (Math.hypot(o.pos.x - player.pos.x, o.pos.z - player.pos.z) > 18) continue; test(tmp2.set(o.pos.x, o.markerY ?? o.pos.y + 0.4, o.pos.z), { o }); }
  for (const [id, o] of others) if (o.av.g.visible) test(tmp2.set(o.av.g.position.x, 1.2, o.av.g.position.z), { id });
  if (best?.o) {
    const o = best.o, d = Math.hypot(o.pos.x - player.pos.x, o.pos.z - player.pos.z);
    if (d <= o.radius * 0.9) { use(o); return; }
    const k = Math.max(0, (d - o.radius * 0.6) / d);
    routeTo(player.pos.x + (o.pos.x - player.pos.x) * k, player.pos.z + (o.pos.z - player.pos.z) * k, () => { player.lookAt(o.pos.x, o.pos.z); use(o); });
    return;
  }
  if (best?.id) { const o = others.get(best.id); if (o) { routeTo(o.av.g.position.x + 0.9, o.av.g.position.z + 0.9, () => { player.lookAt(o.av.g.position.x, o.av.g.position.z); emote('wave', best.id); }); } return; }
  ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  if (ray.ray.intersectPlane(ground, tmp)) {
    if (Math.hypot(tmp.x - player.pos.x, tmp.z - player.pos.z) > 40) return;
    if (!collider.blocked(tmp.x, tmp.z)) { routeTo(tmp.x, tmp.z); showTapMark(tmp); }
  }
}
const tapMark = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.24, 20), new THREE.MeshBasicMaterial({ color: 0xfb923c, transparent: true, depthWrite: false }));
tapMark.rotation.x = -Math.PI / 2; tapMark.visible = false; scene.add(tapMark);
let tapT = 0;
function showTapMark(p) { tapMark.position.set(p.x, 0.02, p.z); tapMark.visible = true; tapT = 0.8; }

// ---------- Reazioni ----------
function emote(id, target) {
  audio.unlock();
  const em = EMOTES.find(x => x.id === id); if (!em || (em.party && !party.live)) return;
  if (!net.sendEmote(id, target)) return;
  if (id === 'cheers' && party.onCheers(net.myId, others.size + 1)) ui.toast('🥂 Brindisi di gruppo! Coriandoli per tutti.');
  if (viewMode === 'terza') { me.showEmote(em.glyph); if (em.anim) me.play(em.anim); }
  else { const b = h('div', { class: 'selfemo', 'aria-hidden': 'true' }, em.glyph); document.body.append(b); setTimeout(() => b.remove(), 1600); }
  audio.pop();
}

addEventListener('keydown', e => {
  if (!entered || e.target.tagName === 'INPUT' || ui.panelOpen) return;
  if ((e.code === 'KeyE' || e.code === 'Enter') && current) { e.preventDefault(); use(current); return; }
  if (e.code === 'KeyV') { setView(viewMode === 'terza' ? 'prima' : 'terza'); return; }
  if (e.code === 'KeyC' || e.code === 'KeyT') { e.preventDefault(); chat.openPanel(); return; }
  if (e.code === 'KeyM') { toggleAudio(); return; }
  const em = EMOTES.find(x => x.key === e.key && (!x.party || party.live)); if (em) emote(em.id);
});

// ---------- Vista: terza persona (predefinita) o prima persona ----------
function setView(v) {
  viewMode = v; store.set('vista', v);
  $('cross').classList.toggle('third', v === 'terza');
  ui.toast(v === 'terza' ? 'Vista da dietro il personaggio.' : 'Vista in prima persona.');
}
$('cross').classList.toggle('third', viewMode === 'terza');
const camTarget = new THREE.Vector3(), camWant = new THREE.Vector3();
let camDist = 3.4;
function insideRect(x, z, a, m = 0.15) { return a && x >= a.x0 + m && x <= a.x1 - m && z >= a.z0 + m && z <= a.z1 - m; }
function updateCamera(dt) {
  const p = player.pos, yaw = player.yaw;
  if (viewMode === 'prima' || !entered) {
    camera.position.set(p.x, (player.seated ? 1.15 : 1.6) + player.bob, p.z);
    camera.rotation.set(player.pitch, yaw, 0);
    me.g.visible = false;
    return;
  }
  me.g.visible = true;
  const portrait = camera.aspect < 0.85, ar0 = areaOf(p.x, p.z), indoor = ar0 !== 'giardino';
  const pitch = THREE.MathUtils.clamp((portrait ? 0.4 : 0.3) - player.pitch * 0.7, -0.15, indoor ? 0.75 : 1.05);
  const dist = (portrait ? 4.5 : 3.5) * (indoor ? 0.82 : 1);
  camTarget.set(p.x, player.seated ? 1.1 : 1.35, p.z);
  camWant.set(p.x + Math.sin(yaw) * Math.cos(pitch) * dist, camTarget.y + Math.sin(pitch) * dist, p.z + Math.cos(yaw) * Math.cos(pitch) * dist);
  // la camera non deve passare attraverso i muri: resta nell'area in cui si trova il personaggio
  const ar = areaOf(p.x, p.z), rect = ar === 'porta' ? null : AREA[ar];
  let f = 1;
  for (; f > 0.2; f -= 0.05) {
    const x = camTarget.x + (camWant.x - camTarget.x) * f, z = camTarget.z + (camWant.z - camTarget.z) * f;
    if (rect ? insideRect(x, z, rect) : (insideRect(x, z, AREA.porta, 0.05) || insideRect(x, z, AREA[z < ROOM.D / 2 ? 'ufficio' : 'giardino']))) break;
  }
  camDist += (f - camDist) * Math.min(1, dt * 10);
  camera.position.lerpVectors(camTarget, camWant, camDist);
  // in giardino, se un muro impedisce di arretrare, la camera sale invece di schiacciarsi sul personaggio
  if (!indoor && camDist < 0.95) camera.position.y += (1 - camDist) * 3.2;
  if (indoor) camera.position.y = Math.min(camera.position.y, Math.hypot(camera.position.x, camera.position.z - 0.5) < 1.1 ? 1.95 : 2.25); // sotto il lampadario e le travi
  camera.lookAt(camTarget.x - Math.sin(yaw) * 1.4, camTarget.y + (portrait ? 0.45 : 0.3), camTarget.z - Math.cos(yaw) * 1.4);
}

// ---------- Ambiente: nebbia, luci, suoni secondo l'area ----------
let myArea = 'ufficio', areaT = 0, ambT = 0;
const fogOffice = new THREE.Color(0x141413);
function onAreaChange(a) {
  if (a === 'porta') return;
  const tag = $('areaTag'); tag.textContent = a === 'giardino' ? 'GIARDINO' : 'UFFICIO'; tag.classList.add('show'); clearTimeout(areaT); areaT = setTimeout(() => tag.classList.remove('show'), 2200);
  net.updateMe({ zona: a });
}

// ---------- Pannelli dal menu ----------
function toggleAudio() { const on = audio.toggle(); party.audioChanged(); audio.unlock(); ui.toast(on ? 'Suoni attivi.' : 'Suoni disattivati.'); return on; }
function teleportNear(o) {
  const ar = areaOf(o.pos.x, o.pos.z), c = ar === 'giardino' ? { x: 0, z: 9 } : { x: 0, z: 1.5 };
  const dirs = [[c.x - o.pos.x, c.z - o.pos.z], [1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [dx, dz] of dirs) {
    const l = Math.hypot(dx, dz) || 1;
    for (const r of [1.1, 1.4, 1.8]) { const x = o.pos.x + dx / l * r, z = o.pos.z + dz / l * r; if (!collider.blocked(x, z)) { player.teleport(x, z); player.lookAt(o.pos.x, o.pos.z); return; } }
  }
}
function listPanel() {
  const items = world.objects.filter(o => !o.hidden || (o.secret && secrets.has(o.secret)));
  const group = (title, arr) => [h('h3', { style: 'margin-top:14px' }, title), h('ul', { class: 'list' }, ...arr.map(o => h('li', {}, h('button', { type: 'button', onclick: () => { ui.closePanel(); teleportNear(o); use(o); } }, h('b', {}, o.name), o.desc))))];
  ui.openPanel([h('h2', {}, 'Elenco della stanza'),
    h('p', { class: 'muted' }, 'Una versione senza 3D: scegli un oggetto e lo apro per te (e ti sposto lì davanti). Puoi anche toccare un punto o un oggetto nella scena per andarci da solo.'),
    ...group('Ufficio', items.filter(o => areaOf(o.pos.x, o.pos.z) !== 'giardino')),
    ...group('Giardino', items.filter(o => areaOf(o.pos.x, o.pos.z) === 'giardino'))], { label: 'Elenco della stanza' });
}
function whoPanel() {
  const rows = [h('div', { class: 'who' }, h('i', { style: `background:${myChoice.col}` }), `${myChoice.nick} (tu)`, h('span', { class: 'muted', style: 'margin-left:auto' }, myArea === 'giardino' ? 'Giardino' : 'Ufficio'))];
  for (const [id, o] of others) {
    const mute = h('button', { type: 'button', onclick: e => { const m = chat.toggleMute(id); e.currentTarget.textContent = m ? 'Riattiva' : 'Silenzia'; } }, chat.isMuted(id) ? 'Riattiva' : 'Silenzia');
    rows.push(h('div', { class: 'who' }, h('i', { style: `background:${o.meta.col}` }), h('span', {}, o.meta.nick, h('br'), h('small', { class: 'muted' }, `${AVATARS.find(a => a.id === o.meta.av)?.nome || ''} · ${o.meta.zona === 'giardino' ? 'Giardino' : 'Ufficio'}`)),
      h('span', { class: 'acts' },
        h('button', { type: 'button', onclick: () => { emote('wave', id); ui.toast(`Hai salutato ${o.meta.nick} 👋`); } }, '👋'),
        h('button', { type: 'button', onclick: () => { ui.closePanel(); routeTo(o.x + 0.9, o.z + 0.9, () => player.lookAt(o.x, o.z)); } }, 'Vai vicino'),
        chat.on ? mute : null)));
  }
  const m = net.mode;
  ui.openPanel([h('h2', {}, 'Chi è online'),
    h('p', { class: 'muted' }, m === 'online' || m === 'online-pubblico' ? `${others.size + 1} ${others.size ? 'persone' : 'persona'} nel mondo in questo momento.` : 'Modalità multiplayer non attiva: vedi solo te stesso.'),
    ...rows], { label: 'Chi è online' });
}
function avatarPanel() {
  const nick = h('input', { type: 'text', id: 'setNick', maxlength: '16', value: myChoice.nick });
  let av = myChoice.av, col = myChoice.col;
  const pick = (e) => [...e.currentTarget.parentNode.children].forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
  const avs = AVATARS.map(a => h('button', { type: 'button', class: 'chip', 'aria-pressed': String(a.id === av), onclick: e => { av = a.id; pick(e); } }, a.nome));
  const cols = COLORS.map(c => h('button', { type: 'button', class: 'swatch', style: `background:${c}`, 'aria-label': 'Colore ' + c, 'aria-pressed': String(c === col), onclick: e => { col = c; pick(e); } }));
  const form = h('form', { class: 'form' },
    h('label', { for: 'setNick' }, 'Nome'), nick,
    h('label', {}, 'Personaggio (lo vedono tutti)'), h('div', { class: 'chips' }, ...avs),
    h('label', {}, 'Colore'), h('div', { class: 'chips' }, ...cols),
    h('p', { style: 'margin-top:16px' }, h('button', { class: 'btn', type: 'submit' }, 'Salva')));
  form.addEventListener('submit', e => {
    e.preventDefault();
    myChoice = { nick: cleanNick(nick.value), av, col };
    store.set('nick', myChoice.nick); store.set('av', av); store.set('col', col);
    buildMe(); me.play('party');
    net.updateMe({ nick: myChoice.nick, av, col }); ui.closePanel(); ui.toast('Fatto: gli altri ti vedono così.');
  });
  ui.openPanel([h('h2', {}, 'Personaggio'), form, h('p', { class: 'muted' }, 'Nome e aspetto restano salvati solo in questo browser, per comodità.')], { label: 'Personaggio' });
}
function menuPanel() {
  const b = (label, sub, fn) => h('button', { type: 'button', onclick: fn }, label, h('small', {}, sub));
  ui.openPanel([h('h2', {}, 'Menu'),
    h('div', { class: 'menu' },
      b('🧍 Personaggio', 'cambia aspetto, colore e nome', avatarPanel),
      b('☰ Elenco della stanza', 'tutti gli oggetti, senza 3D', listPanel),
      b('🔍 Scoperte', `${secrets.count}/${secrets.total} trovate`, () => ui.openPanel(secrets.panel(), { label: 'Scoperte' })),
      b('👥 Chi è online', 'saluta, raggiungi, silenzia', whoPanel),
      b(viewMode === 'terza' ? '🎥 Vista: da dietro' : '👁 Vista: prima persona', 'tocca per cambiare (tasto V)', () => { setView(viewMode === 'terza' ? 'prima' : 'terza'); ui.closePanel(); }),
      b(audio.enabled ? '🔊 Suoni: attivi' : '🔇 Suoni: spenti', 'molto discreti (tasto M)', () => { toggleAudio(); ui.closePanel(); }),
      data.chat !== false ? b(chat.on ? '💬 Chat: attiva' : '💬 Chat: spenta', chat.on ? 'tocca per spegnerla e nascondere i fumetti' : 'tocca per riattivarla', () => { const on = chat.setOn(!chat.on); ui.toast(on ? 'Chat attiva.' : 'Chat spenta: non vedrai più messaggi né fumetti.'); ui.closePanel(); }) : null,
      b('🎉 ' + PARTY.nome, party.live ? 'in corso adesso!' : party.info.quando + ' · ' + party.info.fra, () => ui.openPanel(partyPanelNodes(), { label: PARTY.nome })),
      h('a', { href: '../' }, '← Torna al sito', h('small', {}, 'diario e conti della sfida'))),
    h('p', { class: 'muted', style: 'margin-top:14px' }, isTouch
      ? 'Comandi: joystick per camminare, trascina sullo schermo per girarti, tocca un punto o un oggetto per andarci, pulsante arancione per aprire.'
      : 'Comandi: WASD per camminare (Maiusc per correre), trascina o frecce per girarti, clic su un punto per andarci, E per aprire, 1–7 reazioni, V vista, C chat, M suoni, Esc chiude.')], { label: 'Menu' });
}
$('menuBtn').onclick = menuPanel;
$('countBtn').onclick = whoPanel;
$('secretsBtn').onclick = () => ui.openPanel(secrets.panel(), { label: 'Scoperte' });

// ---------- Party: pulsante nell'HUD ----------
const partyBtn = $('partyBtn');
let partyWasLive = null;
function refreshPartyUI() {
  const i = party.info;
  partyBtn.hidden = false;
  partyBtn.classList.toggle('live', party.live);
  partyBtn.textContent = party.live ? '🎉 Party in corso' : `🎉 Party ${i.quando.replace('venerdì', 'ven')} · ${i.fra}`;
  $('introParty').textContent = party.live ? '🎉 C\'è il party in questo momento: entra!' : `🎉 Ogni ${i.quando}: party nell'ufficio con gli altri visitatori.`;
  if (partyWasLive !== party.live) {
    ui.emoteBar(emote, EMOTES.filter(e => !e.party || party.live));
    if (partyWasLive === false && party.live && entered) ui.toast('🎉 Il party è iniziato! Prova 🥂.');
    partyWasLive = party.live;
  }
}
partyBtn.onclick = () => ui.openPanel(partyPanelNodes(), { label: PARTY.nome });

// ---------- Ciclo principale ----------
let entered = false;
let last = performance.now(), slowFrames = 0, manual = false, manualTime = 0;
const othersPts = [];
function frame(t) {
  if (manual) { requestAnimationFrame(frame); return; }
  const dt = Math.min((t - last) / 1000, 0.05); last = t;
  tick(dt, t / 1000);
  requestAnimationFrame(frame);
}
function tick(dt, time) {
  player.enabled = entered && !ui.panelOpen && !(chat.open && document.activeElement === $('chatInput'));
  const mySpeed = player.update(dt);
  const p = player.pos;
  const ar = areaOf(p.x, p.z);
  if (ar !== myArea && ar !== 'porta') { myArea = ar; if (entered) onAreaChange(ar); }
  if (entered) net.sendPos(p.x, p.z, player.yaw, false, player.seated ? 1 : 0);

  // il mio personaggio
  me.g.position.set(p.x, 0, p.z); me.g.rotation.y = player.yaw; me.setSeated(!!player.seated);
  me.update(dt, mySpeed, time);

  // altri visitatori: interpolazione morbida verso l'ultima posizione ricevuta
  const k = 1 - Math.exp(-dt * 10);
  othersPts.length = 0;
  for (const [id, o] of others) {
    const g = o.av.g;
    if (!o.has) continue;
    const px = g.position.x, pz = g.position.z;
    g.position.x += (o.x - px) * k; g.position.z += (o.z - pz) * k;
    let dr = o.r - g.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); g.rotation.y += dr * k;
    const dMe = Math.hypot(g.position.x - p.x, g.position.z - p.z);
    g.visible = dMe < 45;
    if (g.visible) o.av.update(dt, Math.hypot(g.position.x - px, g.position.z - pz) / Math.max(dt, 1e-3), time);
    // incontro: quando qualcuno ti arriva vicino, vi salutate (ogni 40 s al massimo)
    if (entered && dMe < 1.7 && time - o.metT > 40) { o.metT = time; o.av.play('meet'); if (viewMode === 'terza' && !player.seated) me.play('meet'); }
    if (areaOf(g.position.x, g.position.z) === 'ufficio') othersPts.push(g.position);
    if (performance.now() - o.seen > NET.staleMs * 5 && !net.peers.has(id)) removeOther(id);
  }

  // oggetti vicini: indicatore e pulsante
  const target = entered && !ui.panelOpen ? pickTarget() : null;
  for (const o of world.objects) {
    const show = entered && o._near && (!o.hidden || o === target);
    o.marker.visible = show;
    if (show) { o.marker.position.set(o.pos.x, (o.markerY ?? o.pos.y + 0.55) + Math.sin(time * 3) * 0.04, o.pos.z); o.marker.rotation.y = time * 1.5; o.marker.scale.setScalar(o === target ? 1.4 : 0.8); }
  }
  if (target !== current) { current = target; promptBtn.hidden = !target; if (target) promptBtn.textContent = (isTouch ? 'Tocca: ' : 'E · ') + target.name; }

  const ctx = { near: false, look: null, plantNear: Math.hypot(p.x - 4.3, p.z + 3.4) < 1.6 };
  for (const f of world.animated) f(time, dt, ctx);
  robot.update(dt, time, { me: entered && ar !== 'giardino' ? p : null, others: othersPts, meInOffice: entered && ar === 'ufficio', n: others.size + 1 });
  party.update(time, dt);
  garden.update(time, dt, { me: p, inGarden: ar === 'giardino' });
  secrets.update(dt);
  if (tapT > 0) { tapT -= dt; tapMark.scale.setScalar(1 + (0.8 - tapT)); tapMark.material.opacity = tapT; if (tapT <= 0) tapMark.visible = false; }

  // nebbia e cielo secondo l'area
  const inG = ar === 'giardino';
  scene.fog.color.lerp(inG ? garden.horizon : fogOffice, Math.min(1, dt * 3));
  scene.fog.near += ((inG ? 22 : 14) - scene.fog.near) * Math.min(1, dt * 3); scene.fog.far += ((inG ? 85 : 40) - scene.fog.far) * Math.min(1, dt * 3);
  ambT -= dt;
  if (ambT <= 0) { ambT = 0.25; audio.ambient(0.25, { area: inG ? 'giardino' : 'ufficio', night: garden.night, fontana: Math.max(0, 1 - Math.hypot(p.x - garden.pond.x, p.z - garden.pond.z) / 7) }); }

  updateCamera(dt);
  // qualità adattiva: se il telefono fatica, abbasso la risoluzione
  if (!manual && dt > 0.034) { if (++slowFrames > 90 && pixelRatio > 0.75) { pixelRatio = Math.max(0.75, pixelRatio - 0.25); renderer.setPixelRatio(pixelRatio); renderer.setSize(innerWidth, innerHeight, false); slowFrames = 0; } }
  else slowFrames = Math.max(0, slowFrames - 1);
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
refreshPartyUI(); setInterval(refreshPartyUI, 5000);

// ---------- Entrata ----------
const choice = await ui.intro(myChoice, previewRenderer);
myChoice = choice;
store.set('nick', choice.nick); store.set('av', choice.av); store.set('col', choice.col);
buildMe();
entered = true;
$('secretsBtn').hidden = false;
audio.unlock();
net.start(choice);
robot.greet(choice.nick);
ui.toast(`Benvenuto, ${choice.nick}. Il rombo arancione indica che puoi interagire. Il giardino è oltre la porta in fondo.`);
setTimeout(() => { $('help').style.opacity = 0; }, 14000);

// Festa per un traguardo vero e recente (una volta per visitatore)
{
  const done = new Set((store.get('festeggiati', '') || '').split(',').filter(Boolean));
  const m = progress.filter(x => x.ok && x.recente && !done.has(x.id)).sort((a, b) => (b.quando?.getTime() ?? Infinity) - (a.quando?.getTime() ?? Infinity))[0];
  if (m) setTimeout(() => robot.celebrate(`Traguardo: ${m.titolo}! 🎉`, () => { done.add(m.id); store.set('festeggiati', [...done].join(',')); }), 9000);
}

// Per i test automatici (nessun dato sensibile).
window.__ra = { camera, player, world, garden, net, others, ui, use, party, robot, secrets, chat, collider, setView, routeTo, onTap,
  step(dt) { manual = true; manualTime += dt; tick(dt, manualTime); } };
