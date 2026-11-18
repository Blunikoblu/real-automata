// Rete del mondo: Supabase Realtime (Presence per chi c'è, Broadcast per i movimenti).
// - Presence: solo lo stato (nickname, avatar, colore, zona). Mai le coordinate.
// - Broadcast: posizione a frequenza limitata, emoji (anche "saluto a qualcuno"), avviso "bacheca aggiornata".
// - Chat: canale separato IN SOLA LETTURA per i visitatori; i messaggi li scrive il database (funzione invia_chat),
//   che aggiunge l'impronta vera del mittente (u). Un messaggio compare sopra un avatar solo se l'impronta
//   corrisponde a quella dichiarata da quell'avatar: così non si può parlare "a nome" di un altro.
// - Accesso anonimo invisibile (sessione per scheda, in sessionStorage).
// - Se qualcosa non va: canale pubblico di ripiego, poi modalità individuale.
import { SUPABASE_URL, SUPABASE_KEY, CHANNEL_PRIVATE, CHANNEL_PUBLIC, NET, AVATARS, EMOTES, WORLD, CHAT } from './config.js?v=202611182035';
import { cleanNick, cleanText, isColor, clamp, randomId } from './util.js?v=202611182035';

const AV_IDS = new Set(AVATARS.map(a => a.id));
const EMO_IDS = new Set(EMOTES.map(e => e.id));

export function createNet(h) {
  const myId = randomId(10);          // ID di sessione univoco (per scheda)
  let sb = null, ch = null, mode = 'off', userId = null;
  let meta = null, joinedOnce = false, retry = 0, retryTimer = null, closing = false;
  let peers = new Map();              // id -> meta validata
  const rate = new Map();             // id -> { t, n } per limitare i messaggi in arrivo
  let last = { x: 0, z: 0, r: 0, a: 0, sent: 0, sx: 99, sz: 99, sr: 99, sa: 0 };
  let chatCh = null, myTag = null, chatSent = [], lastChatIds = [];
  async function tagOf(uid) {
    try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(uid)); return Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, '0')).join('').slice(0, 12); }
    catch (e) { return null; }
  }
  let sbPromise = null;
  function client() {
    sbPromise ||= import('../supabase.min.js?v=202611182035').then(({ createClient }) => (sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
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
      zona: m.z === 'giardino' ? 'giardino' : 'ufficio',
      u: typeof m.u === 'string' && /^[0-9a-f]{12}$/.test(m.u) ? m.u : null,
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
      else if (old.nick !== m.nick || old.av !== m.av || old.col !== m.col || old.zona !== m.zona) h.onPeerUpdate?.(id, m);
    }
    for (const [id, m] of peers) if (!next.has(id)) h.onPeerLeave?.(id, m);
    peers = next; joinedOnce = true;
    h.onCount?.(peers.size + 1);
  }

  function onPos({ payload: p }) {
    if (!p || typeof p.i !== 'string' || !peers.has(p.i) || !allow(p.i)) return;
    const x = +p.x, z = +p.z, r = +p.r;
    if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(r)) return;
    h.onPos?.(p.i, clamp(x, WORLD.x0, WORLD.x1), clamp(z, WORLD.z0, WORLD.z1), Math.atan2(Math.sin(r), Math.cos(r)), p.a === 1 ? 1 : 0);
  }
  function onEmote({ payload: p }) {
    if (!p || typeof p.i !== 'string' || !peers.has(p.i) || !EMO_IDS.has(p.e) || !allow(p.i)) return;
    h.onEmote?.(p.i, p.e, typeof p.t === 'string' && p.t.length <= 16 ? p.t : null);
  }
  function onSal({ payload: p }) {
    if (!p || !peers.has(p.i) || !allow(p.i)) return;
    const now = performance.now(); if (now - lastSalRefresh < 3000) return; lastSalRefresh = now;
    h.onSalutiChanged?.();
  }

  // Messaggi di chat (dal database). Nessun HTML: il testo va solo in textContent o su canvas.
  const chatRate = new Map();
  function onChat({ payload: p }) {
    if (!p || typeof p.t !== 'string' || typeof p.i !== 'string' || typeof p.u !== 'string' || !/^[0-9a-f]{12}$/.test(p.u)) return;
    const now = performance.now(); let r = chatRate.get(p.u);
    if (!r || now - r.t > 10000) { r = { t: now, n: 0 }; chatRate.set(p.u, r); }
    if (++r.n > 8) return;
    const testo = cleanText(p.t, CHAT.maxLen); if (!testo) return;
    const mine = p.i === myId && p.u === myTag;
    const peer = peers.get(p.i);
    const verified = mine || (!!peer && peer.u === p.u);
    h.onChat?.({ id: p.i, nick: verified && peer ? peer.nick : cleanNick(p.n), testo, mine, verified, col: peer?.col });
  }
  async function openChat() {
    if (chatCh) { try { await sb.removeChannel(chatCh); } catch (e) {} chatCh = null; }
    chatCh = sb.channel('mondo-v1-chat', { config: { private: true } });
    chatCh.on('broadcast', { event: 'chat' }, onChat).subscribe(s => { h.onChatStatus?.(s === 'SUBSCRIBED'); });
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
          if (priv) openChat(); else h.onChatStatus?.(false);
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
        if (userId) { myTag = await tagOf(userId); if (meta) meta.u = myTag; }
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

  function sendPos(x, z, r, force = false, a = last.a) {
    last.x = x; last.z = z; last.r = r; last.a = a;
    if (!ch || !(mode === 'online' || mode === 'online-pubblico')) return;
    const now = performance.now();
    if (now - last.sent < 1000 / NET.sendHz) return;
    const moved = Math.abs(x - last.sx) + Math.abs(z - last.sz) + Math.abs(r - last.sr) > 0.015 || a !== last.sa;
    if (!force && !moved && now - last.sent < NET.heartbeatMs) return;
    last.sent = now; last.sx = x; last.sz = z; last.sr = r; last.sa = a;
    ch.send({ type: 'broadcast', event: 'pos', payload: { i: myId, x: +x.toFixed(2), z: +z.toFixed(2), r: +r.toFixed(2), a } });
  }
  // il heartbeat continua anche se la scheda è in secondo piano (rAF fermo)
  setInterval(() => sendPos(last.x, last.z, last.r), NET.heartbeatMs);

  return {
    myId,
    get mode() { return mode; },
    get canWrite() { return !!userId; },
    get peers() { return peers; },
    start(m) {
      meta = { n: cleanNick(m.nick), a: AV_IDS.has(m.av) ? m.av : 'robot', c: isColor(m.col) ? m.col : '#fb923c', z: 'ufficio', u: myTag };
      connect();
    },
    async updateMe(m) {
      meta = { ...meta, n: cleanNick(m.nick ?? meta.n), a: AV_IDS.has(m.av) ? m.av : meta.a, c: isColor(m.col) ? m.col : meta.c, z: m.zona === 'giardino' ? 'giardino' : m.zona === 'ufficio' ? 'ufficio' : meta.z, u: myTag };
      if (ch && mode.startsWith('online')) try { await ch.track(meta); } catch (e) {}
    },
    sendPos,
    sendEmote(id, target) {
      if (!EMO_IDS.has(id)) return false;
      const now = performance.now(); if (now - lastEmote < 1200) return false; lastEmote = now;
      if (ch && mode.startsWith('online')) ch.send({ type: 'broadcast', event: 'emo', payload: target ? { i: myId, e: id, t: target } : { i: myId, e: id } });
      return true;
    },
    get chatReady() { return !!(chatCh && userId && mode === 'online'); },
    async sendChat(nick, testo) {
      const t = cleanText(testo, CHAT.maxLen);
      if (!t) return { error: 'Scrivi qualcosa.' };
      if (!(userId && mode === 'online')) return { error: 'La chat funziona solo quando la connessione multiplayer è attiva.' };
      if (/(https?:\/\/|www\.)/i.test(t)) return { error: 'Niente link in chat, per favore.' };
      const now = Date.now(); chatSent = chatSent.filter(x => now - x < CHAT.burstMs);
      if (chatSent.length && now - chatSent[chatSent.length - 1] < CHAT.minGapMs) return { error: 'Un attimo: un messaggio ogni 2 secondi e mezzo.' };
      if (chatSent.length >= CHAT.burst) return { error: 'Troppi messaggi in poco tempo: aspetta qualche secondo.' };
      chatSent.push(now);
      const { error } = await sb.rpc('invia_chat', { p_testo: t, p_nick: cleanNick(nick), p_sid: myId });
      if (error) {
        const m = String(error.message || '');
        if (m.includes('troppo veloce') || m.includes('troppi')) return { error: 'Stai scrivendo troppo in fretta: aspetta qualche secondo.' };
        if (m.includes('link')) return { error: 'Niente link in chat, per favore.' };
        return { error: 'Messaggio non inviato. Riprova tra poco.' };
      }
      return { ok: true };
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
