// Progressione del mondo: i traguardi vengono SOLO da data.json (dati ufficiali della sfida).
// - traguardi calcolati: giorni passati e soldi guadagnati (data.giorno, data.guadagnati);
// - traguardi scritti a mano in data.json → "traguardi": [{ "id", "data": "AAAA-MM-GG", "titolo" }].
// Il mondo li usa per: trofei sulla mensola, decorazioni sbloccate, festa del robottino.
// Nessun numero viene inventato o stimato qui.
import * as THREE from 'three';
import { h, eur } from './util.js?v=202611182035';

const DAY = 86400000;
const fmt = d => d ? d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

export function computeProgress(data) {
  const start = new Date(data.inizio + 'T00:00:00');
  const dayDate = n => new Date(start.getTime() + (n - 1) * DAY);
  const now = Date.now();
  const list = [];
  const giorni = [[2, 'giorno-2', 'Primo giorno superato'], [8, 'settimana-1', 'Prima settimana'], [31, 'mese-1', 'Primo mese'],
    [46, 'meta', 'Metà della sfida'], [61, 'mese-2', 'Secondo mese'], [90, 'giorno-90', 'Ultimo giorno']];
  for (const [n, id, titolo] of giorni) list.push({ id, titolo, tipo: 'giorni', ok: data.giorno >= n, quando: data.giorno >= n ? dayDate(n) : null, obiettivo: `giorno ${n}` });
  const soldi = [[1, 'primo-euro', 'Primo euro guadagnato'], [10, '10-euro', '10 € guadagnati'], [23, 'costi-mese', 'Coperti i costi di un mese (circa 23 €)'], [100, '100-euro', 'Restituito il capitale: 100 € guadagnati']];
  for (const [v, id, titolo] of soldi) list.push({ id, titolo, tipo: 'soldi', ok: Number(data.guadagnati) >= v, quando: null, obiettivo: `${eur(v)} guadagnati` });
  for (const t of Array.isArray(data.traguardi) ? data.traguardi : []) {
    if (!t || typeof t.id !== 'string' || typeof t.titolo !== 'string') continue;
    const d = /^\d{4}-\d{2}-\d{2}$/.test(t.data) ? new Date(t.data + 'T12:00:00') : null;
    list.push({ id: 'x-' + t.id.slice(0, 40), titolo: t.titolo.slice(0, 80), tipo: 'tappa', ok: !!d && d.getTime() <= now, quando: d });
  }
  // "recente": raggiunto negli ultimi 3 giorni (per i soldi la data non c'è: si festeggia una volta per visitatore)
  for (const m of list) m.recente = m.ok && (m.quando ? now - m.quando.getTime() < 3 * DAY : m.tipo === 'soldi');
  return list;
}

// Mensola dei traguardi nell'ufficio (parete sinistra): un trofeo per ogni traguardo raggiunto.
export function buildTrophyShelf(world, data, list) {
  const { box, lam, add } = world;
  const x = -4.86, z0 = 2.45, y = 1.55;
  box(0.28, 0.05, 1.3, 0x6b4f37, x, y, z0);
  box(0.06, 0.18, 0.06, 0x4a3726, x + 0.08, y - 0.1, z0 - 0.55); box(0.06, 0.18, 0.06, 0x4a3726, x + 0.08, y - 0.1, z0 + 0.55);
  const ok = list.filter(m => m.ok);
  const gold = new THREE.MeshLambertMaterial({ color: 0xfac775, emissive: 0x3a2a00, flatShading: true });
  const silver = new THREE.MeshLambertMaterial({ color: 0xc9c6bd, emissive: 0x1a1a1a, flatShading: true });
  const scene = world.desk.parent;
  ok.slice(-6).forEach((m, i) => {
    const t = new THREE.Group(); t.position.set(x, y + 0.025, z0 - 0.5 + i * 0.2); scene.add(t);
    const mat = m.tipo === 'soldi' ? gold : silver;
    [[0.045, 0.03, 0.04, 0.02], [0.012, 0.012, 0.06, 0.07], [0.055, 0.03, 0.08, 0.13]].forEach(([a, b, hh, yy]) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(a, b, hh, 7), mat); c.position.y = yy; t.add(c); });
  });
  for (let i = ok.length; i < 6; i++) box(0.08, 0.004, 0.08, 0x4a3726, x, y + 0.03, z0 - 0.5 + i * 0.2); // posti vuoti
  const next = list.filter(m => !m.ok && m.tipo !== 'tappa');
  add({ id: 'traguardi', name: 'Mensola dei traguardi', pos: [-4.6, 1.5, z0], radius: 1.8, markerY: 2.0,
    desc: `${ok.length} traguardi raggiunti: un trofeo per ognuno.`,
    open: () => [h('h2', {}, 'Mensola dei traguardi'),
      h('p', { class: 'muted' }, 'Un trofeo per ogni traguardo vero della sfida: giorni passati, soldi guadagnati (quelli della cassa pubblica) e tappe importanti. Niente numeri inventati.'),
      h('ul', { class: 'list secrets' }, ...ok.map(m => h('li', { class: 'ok' }, h('b', {}, '🏆 ' + m.titolo), h('span', {}, m.quando ? fmt(m.quando) : 'raggiunto')))),
      next.length ? h('h3', { style: 'margin-top:14px' }, 'Prossimi') : null,
      next.length ? h('ul', { class: 'list secrets' }, ...next.slice(0, 4).map(m => h('li', {}, h('b', {}, m.titolo), h('span', {}, m.obiettivo)))) : null] });
}
