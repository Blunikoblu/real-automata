// Scoperte personali: ogni visitatore ha il suo taccuino, salvato solo nel suo browser (localStorage).
// Non passa dalla rete e non interferisce con gli altri. Nessun "punteggio" economico: sono curiosità.
import * as THREE from 'three';
import { h } from './util.js?v=202611182039';

export const SECRETS = [
  { id: 'moneta', nome: 'La moneta finta', dove: 'ufficio', aiuto: 'Qualcosa luccica vicino a una pianta.' },
  { id: 'salvadanaio', nome: 'Il salvadanaio', dove: 'ufficio', aiuto: 'Prova a scuotere qualcosa sulla scrivania.' },
  { id: 'tazza', nome: 'La tazza vuota', dove: 'ufficio', aiuto: 'Sulla scrivania c\'è qualcosa da bere. O forse no.' },
  { id: 'poster', nome: 'Il poster delle spese', dove: 'ufficio', aiuto: 'Leggi i muri vicino all\'uscita.' },
  { id: 'pulsante', nome: 'Il pulsante misterioso', dove: 'ufficio', aiuto: 'C\'è scritto di non farlo.' },
  { id: 'biglietto', nome: 'Il biglietto sotto il tappeto', dove: 'ufficio', aiuto: 'Guarda bene il tappeto.' },
  { id: 'trofeo', nome: 'Il trofeo impolverato', dove: 'ufficio', aiuto: 'Chi guarda in alto, vince.' },
  { id: 'paperella', nome: 'La paperella', dove: 'giardino', aiuto: 'Qualcuno nuota nel laghetto.' },
  { id: 'cartello', nome: 'Il cartello delle tre strade', dove: 'giardino', aiuto: 'Leggi le indicazioni.' },
  { id: 'gnomo', nome: 'Il nano da giardino', dove: 'giardino', aiuto: 'Si nasconde in un angolo, dietro un albero.' },
  { id: 'capsula', nome: 'La capsula del tempo', dove: 'giardino', aiuto: 'Qualcosa è sepolto in un angolo.' },
  { id: 'dormiglione', nome: 'Il robottino che dorme', dove: 'giardino', aiuto: 'Qualcuno russa vicino a una panchina.' },
  { id: 'girasoli', nome: 'I girasoli', dove: 'giardino', aiuto: 'Avvicinati ai fiori più alti.' },
];

export function createSecrets({ scene, ui, audio, onChange }) {
  const KEY = 'ra_scoperte';
  let found = new Set();
  try {
    found = new Set((localStorage.getItem(KEY) || '').split(',').filter(id => SECRETS.some(s => s.id === id)));
    if ((localStorage.getItem('ra_segreti') || '').includes('moneta')) found.add('moneta'); // vecchia versione
  } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, [...found].join(',')); } catch (e) {} };

  // scintille: un'unica nuvola di punti riutilizzata
  const N = 50, pos = new Float32Array(N * 3), vel = new Float32Array(N * 3);
  const pts = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)),
    new THREE.PointsMaterial({ color: 0xfac775, size: 0.08, transparent: true, depthWrite: false }));
  pts.visible = false; pts.frustumCulled = false; scene.add(pts);
  let life = 0;
  function sparkle(at) {
    for (let i = 0; i < N; i++) {
      pos[i * 3] = at.x; pos[i * 3 + 1] = at.y; pos[i * 3 + 2] = at.z;
      const a = Math.random() * 6.28, e = Math.random() * 1.2, s = 0.8 + Math.random() * 1.4;
      vel[i * 3] = Math.cos(a) * Math.cos(e) * s; vel[i * 3 + 1] = Math.sin(e) * s + 0.8; vel[i * 3 + 2] = Math.sin(a) * Math.cos(e) * s;
    }
    life = 1.3; pts.visible = true;
  }

  return {
    get count() { return found.size; },
    total: SECRETS.length,
    has: id => found.has(id),
    discover(id, at) {
      const s = SECRETS.find(x => x.id === id);
      if (!s || found.has(id)) return false;
      found.add(id); save();
      if (at) sparkle(at);
      audio.sparkle();
      ui.toast(`✨ Scoperta ${found.size}/${SECRETS.length}: ${s.nome}`, 'found');
      onChange?.(found.size);
      return true;
    },
    update(dt) {
      if (life <= 0) return;
      life -= dt;
      for (let i = 0; i < N; i++) { vel[i * 3 + 1] -= 3 * dt; pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt; }
      pts.geometry.attributes.position.needsUpdate = true; pts.material.opacity = Math.max(0, life / 1.3);
      if (life <= 0) pts.visible = false;
    },
    panel() {
      return [h('h2', {}, 'Il taccuino delle scoperte'),
        h('div', { class: 'big', style: 'font-size:34px' }, `${found.size}/${SECRETS.length}`),
        h('p', { class: 'muted' }, 'Curiosità nascoste tra ufficio e giardino. Il taccuino è solo tuo: resta in questo browser e nessun altro lo vede.'),
        h('ul', { class: 'list secrets' }, ...SECRETS.map(s => h('li', { class: found.has(s.id) ? 'ok' : '' },
          h('b', {}, found.has(s.id) ? '✨ ' + s.nome : '❔ ???'),
          h('span', {}, `${s.dove === 'ufficio' ? 'Ufficio' : 'Giardino'} · ${found.has(s.id) ? 'trovato' : s.aiuto}`)))),
        found.size === SECRETS.length ? h('p', {}, 'Le hai trovate tutte. Ne aggiungerò altre quando il mondo crescerà.') : null];
    },
  };
}
