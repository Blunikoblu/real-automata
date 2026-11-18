// Dati della sfida: arrivano SOLO da ../data.json (scritto da me, nel repository).
// I visitatori non possono modificarli: il mondo li legge e basta.
const DEFAULT = {
  inizio: '2026-11-17', fine: '2027-02-15', saldo: 100, guadagnati: 0, cassa: [], diario: [], prodotti: [],
  modulo: 'https://tally.so/r/DqpYZp',
  instagram: 'https://www.instagram.com/realautomata.ai/',
  threads: 'https://www.threads.com/@realautomata.ai',
};

const safeUrl = u => (typeof u === 'string' && /^https:\/\//.test(u)) ? u : null;

export async function loadData() {
  let d = { ...DEFAULT };
  try {
    const r = await fetch('../data.json', { cache: 'no-store' });
    if (r.ok) d = Object.assign(d, await r.json());
  } catch (e) { /* offline: restano i valori di base */ }
  d.cassa = Array.isArray(d.cassa) ? d.cassa : [];
  d.diario = Array.isArray(d.diario) ? d.diario : [];
  d.prodotti = Array.isArray(d.prodotti) ? d.prodotti : [];
  for (const k of ['modulo', 'instagram', 'threads']) d[k] = safeUrl(d[k]) || DEFAULT[k];

  const DAY = 86400000;
  const start = new Date(d.inizio + 'T00:00:00');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.giorno = Math.max(1, Math.min(90, Math.floor((today - start) / DAY) + 1));
  d.restano = 90 - d.giorno;
  return d;
}
