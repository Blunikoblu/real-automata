// Rete del mondo: Supabase Realtime (Presence per chi c'è, Broadcast per i movimenti).
// - Presence: solo lo stato (nickname, avatar, colore, zona). Mai le coordinate.
// - Broadcast: posizione a frequenza limitata, emoji, avviso "bacheca aggiornata".
// - Accesso anonimo invisibile (sessione per scheda, in sessionStorage).
// - Se qualcosa non va: canale pubblico di ripiego, poi modalità individuale.
import { SUPABASE_URL, SUPABASE_KEY, CHANNEL_PRIVATE, CHANNEL_PUBLIC, NET, AVATARS, EMOTES, ROOM } from './config.js?v=202611181909';
import { cleanNick, cleanText, isColor, clamp, randomId } from './util.js?v=202611181909';

const AV_IDS = new Set(AVATARS.map(a => a.id));
const EMO_IDS = new Set(EMOTES.map(e => e.id));

export function createNet(h) {
  const myId = randomId(10);          // ID di sessione univoco (per scheda)
  let sb = null, ch = null, mode = 'off', userId = null;
  let meta = null, joinedOnce = false, retry = 0, retryTimer = null, closing = false;
  let peers = new Map();              // id -> meta validata
  const rate = new Map();             // id -> { t, n } per limitare i messaggi in arrivo
  let last = { x: 0, z: 0, r: 0, sent: 0, sx: 99, sz: 99, sr: 99 };
  let sbPromise = null;
  function client() {
    sbPromise ||= import('../supabase.min.js?v=202611181909').then(({ createClient }) => (sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { storage: window.sessionStorage, storageKey: 'ra-mondo-auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      realtime: { params: { eventsPerSecond: 20 }, heartbeatIntervalMs: 20000 },
    })));
    return sbPromise;
  }
  let lastEmote = 0, lastSalRefresh = 0;

  const status = (s, msg) => { mode = s; h.onStatus?.(s, msg); };

  function validMeta(m) {
    if (!m || typeof m !== 'object') return null;
    return {
      nick: cleanNick(m.n),
      av: AV_IDS.has(m.a) ? m.a : 'robot',
      col: isColor(m.c) ? m.c : '#fb923c',
      zona: m.z === 'ufficio' ? 'ufficio' : 'ufficio',
    };
  }

  function allow(id) {
    const now = performance.now(); let r = rate.get(id);
    if (!r || now - r.t > 1000) { r = { t: now, n: 0 }; rate.set(id, r); }
    return ++r.n <= NET.maxMsgPerSec;
  }

  function onSync() {
    const st = ch.presenceState();
    const next = new Map();
    for (const [key, list] of Object.entries(st)) {
      if (key === myId || typeof key !== 'string' || key.length > 16) continue;
      if (next.size >= NET.maxOthers) break;
      const m = validMeta(list[list.length - 1]);
      if (m) next.set(key, m);
    }
    for (const [id, m] of next) {
      const old = peers.get(id);
      if (!old) h.onPeerJoin?.(id, m, joinedOnce);
      else if (old.nick !== m.nick || old.av !== m.av || old.col !== m.col) h.onPeerUpdate?.(id, m);
    }
    for (const [id, m] of peers) if (!next.has(id)) h.onPeerLeave?.(id, m);
    peers = next; joinedOnce = true;
    h.onCount?.(peers.size + 1);
  }

  function onPos({ payload: p }) {
    if (!p || typeof p.i !== 'string' || !peers.has(p.i) || !allow(p.i)) return;
    const x = +p.x, z = +p.z, r = +p.r;
    if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(r)) return;
    h.onPos?.(p.i, clamp(x, -ROOM.W / 2, ROOM.W / 2), clamp(z, -ROOM.D / 2, ROOM.D / 2), Math.atan2(Math.sin(r), Math.cos(r)));
  }
  function onEmote({ payload: p }) {
    if (!p || typeof p.i !== 'string' || !peers.has(p.i) || !EMO_IDS.has(p.e) || !allow(p.i)) return;
    h.onEmote?.(p.i, p.e);
  }
  function onSal({ payload: p }) {
    if (!p || !peers.has(p.i) || !allow(p.i)) return;
    const now = performance.now(); if (now - lastSalRefresh < 3000) return; lastSalRefresh = now;
    h.onSalutiChanged?.();
  }

  function scheduleRetry() {
    if (closing || retryTimer) return;
    const wait = Math.min(30000, 2000 * 2 ** retry++);
    status('retry', `Connessione persa: riprovo tra ${Math.round(wait / 1000)} s.`);
    retryTimer = setTimeout(() => { retryTimer = null; connect(); }, wait);
  }

  async function openChannel(priv) {
    if (ch) { try { await sb.removeChannel(ch); } catch (e) {} ch = null; }
    peers.forEach((m, id) => h.onPeerLeave?.(id, m, true)); peers = new Map(); joinedOnce = false;
    const name = priv ? CHANNEL_PRIVATE : CHANNEL_PUBLIC;
    const c = sb.channel(name, { config: { private: priv, presence: { key: myId }, broadcast: { self: false, ack: false } } });
    c.on('presence', { event: 'sync' }, onSync)
     .on('broadcast', { event: 'pos' }, onPos)
     .on('broadcast', { event: 'emo' }, onEmote)
     .on('broadcast', { event: 'sal' }, onSal);
    ch = c;
    return new Promise(resolve => {
      let done = false, up = false;
      const t = setTimeout(() => { if (!done) { done = true; resolve(false); } }, 12000);
      c.subscribe(async (s) => {
        if (c !== ch) return;
        if (s === 'SUBSCRIBED') {
          retry = 0; up = true;
          try { await c.track(meta); } catch (e) {}
          if (!done) { done = true; clearTimeout(t); resolve(true); }
          status(priv ? 'online' : 'online-pubblico');
          sendPos(last.x, last.z, last.r, true);
        } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
          if (!done) { done = true; clearTimeout(t); resolve(false); }
          else if (up && !closing) { up = false; scheduleRetry(); }
        }
      });
    });
  }

  async function connect() {
    status('connecting', 'Mi collego agli altri visitatori…');
    try {
      await client();
      // Accesso anonimo: nessuna registrazione, nessun dato personale.
      if (!userId) {
        let { data } = await sb.auth.getSession();
        if (!data.session) {
          const r = await sb.auth.signInAnonymously();
          if (!r.error) data = { session: r.data.session };
        }
        userId = data.session?.user?.id || null;
        if (data.session) await sb.realtime.setAuth(data.session.access_token);
      }
      if (userId && await openChannel(true)) return;
      if (await openChannel(false)) return;
      status('solo', 'La modalità multiplayer non è disponibile in questo momento: stai visitando la stanza da solo.');
      if (ch) { try { await sb.removeChannel(ch); } catch (e) {} ch = null; }
      retryTimer = setTimeout(() => { retryTimer = null; connect(); }, 30000);
    } catch (e) {
      status('solo', 'La modalità multiplayer non è disponibile: stai visitando la stanza da solo.');
      retryTimer = setTimeout(() => { retryTimer = null; connect(); }, 30000);
    }
  }

  function sendPos(x, z, r, force = false) {
    last.x = x; last.z = z; last.r = r;
    if (!ch || !(mode === 'online' || mode === 'online-pubblico')) return;
    const now = performance.now();
    if (now - last.sent < 1000 / NET.sendHz) return;
    const moved = Math.abs(x - last.sx) + Math.abs(z - last.sz) + Math.abs(r - last.sr) > 0.015;
    if (!force && !moved && now - last.sent < NET.heartbeatMs) return;
    last.sent = now; last.sx = x; last.sz = z; last.sr = r;
    ch.send({ type: 'broadcast', event: 'pos', payload: { i: myId, x: +x.toFixed(2), z: +z.toFixed(2), r: +r.toFixed(2) } });
  }
  // il heartbeat continua anche se la scheda è in secondo piano (rAF fermo)
  setInterval(() => sendPos(last.x, last.z, last.r), NET.heartbeatMs);

  return {
    myId,
    get mode() { return mode; },
    get canWrite() { return !!userId; },
    get peers() { return peers; },
    start(m) {
      meta = { n: cleanNick(m.nick), a: AV_IDS.has(m.av) ? m.av : 'robot', c: isColor(m.col) ? m.col : '#fb923c', z: 'ufficio' };
      connect();
    },
    async updateMe(m) {
      meta = { ...meta, n: cleanNick(m.nick), a: AV_IDS.has(m.av) ? m.av : meta.a, c: isColor(m.col) ? m.col : meta.c };
      if (ch && mode.startsWith('online')) try { await ch.track(meta); } catch (e) {}
    },
    sendPos,
    sendEmote(id) {
      if (!EMO_IDS.has(id)) return false;
      const now = performance.now(); if (now - lastEmote < 1200) return false; lastEmote = now;
      if (ch && mode.startsWith('online')) ch.send({ type: 'broadcast', event: 'emo', payload: { i: myId, e: id } });
      return true;
    },
    async fetchSaluti() {
      try {
        await client();
        const { data, error } = await sb.from('saluti').select('id,nick,testo,created_at').order('created_at', { ascending: false }).limit(30);
        if (error) return { error: true, list: [] };
        return { list: (data || []).map(r => ({ id: r.id, nick: cleanNick(r.nick), testo: cleanText(r.testo, 80), at: r.created_at })) };
      } catch (e) { return { error: true, list: [] }; }
    },
    async postSaluto(nick, testo) {
      if (!userId) return { error: 'Per ora la bacheca è in sola lettura: la scrittura si attiva con l\'accesso anonimo.' };
      const n = cleanNick(nick), t = cleanText(testo, 80);
      if (t.length < 2) return { error: 'Scrivi almeno due caratteri.' };
      if (/(https?:\/\/|www\.|\.(com|it|net|org|io|ly)(\/|\s|$))/i.test(t)) return { error: 'Niente link, per favore: è una bacheca di saluti.' };
      const { error } = await sb.from('saluti').insert({ nick: n, testo: t });
      if (error) {
        const m = String(error.message || '');
        if (m.includes('troppo presto')) return { error: 'Un saluto al minuto: aspetta un attimo e riprova.' };
        if (m.includes('limite giornaliero')) return { error: 'Hai già lasciato 5 saluti oggi. Torna domani!' };
        if (m.includes('niente_link')) return { error: 'Niente link, per favore.' };
        return { error: 'Non sono riuscito a salvarlo. Riprova tra poco.' };
      }
      if (ch && mode.startsWith('online')) ch.send({ type: 'broadcast', event: 'sal', payload: { i: myId } });
      return { ok: true };
    },
    async close() { closing = true; if (ch) try { await ch.untrack(); await sb.removeChannel(ch); } catch (e) {} },
  };
}
