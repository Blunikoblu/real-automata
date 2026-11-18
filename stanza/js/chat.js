// Chat testuale: pannello apribile dall'icona 💬, fumetti temporanei sopra i personaggi.
// - Messaggi corti (100 caratteri), limiti di invio lato client E lato database.
// - Testo mostrato solo con textContent (qui) o disegnato su canvas (fumetti): nessun HTML/JS eseguibile.
// - Nessun salvataggio: il registro vive solo in questa scheda (ultimi messaggi) e sparisce alla chiusura.
// - Si può disattivare (Menu → Chat) e si possono silenziare singoli visitatori (elenco online).
//   Interruttore generale: "chat": false in data.json.
import { CHAT } from './config.js?v=202611182112';
import { h } from './util.js?v=202611182112';

const $ = id => document.getElementById(id);

export function createChat({ net, ui, audio, globalEnabled, getNick, onBubble }) {
  const box = $('chat'), log = $('chatLog'), form = $('chatForm'), input = $('chatInput'), err = $('chatErr'), badge = $('chatBadge'), btn = $('chatBtn');
  let on = true; try { on = localStorage.getItem('ra_chat') !== 'off'; } catch (e) {}
  if (!globalEnabled) on = false;
  const muted = new Set();
  let unread = 0, ready = false;

  function line(nodes, cls = '') { log.append(h('div', { class: 'm ' + cls }, ...nodes)); while (log.children.length > CHAT.logMax) log.firstChild.remove(); log.scrollTop = log.scrollHeight; }
  function setBadge(n) { unread = n; badge.hidden = !n; badge.textContent = n > 9 ? '9+' : String(n); }
  function refreshAvail() {
    btn.hidden = !globalEnabled;
    input.disabled = !(on && ready);
    input.placeholder = !on ? 'Chat disattivata (Menu → Chat)' : ready ? 'Scrivi un messaggio…' : 'Chat non disponibile: connessione multiplayer non attiva';
    form.querySelector('button').disabled = input.disabled;
  }
  function open(v) {
    box.hidden = !v; if (v) { setBadge(0); refreshAvail(); if (!input.disabled && !matchMedia('(pointer: coarse)').matches) input.focus(); log.scrollTop = log.scrollHeight; }
  }
  btn.onclick = () => open(box.hidden);
  $('chatClose').onclick = () => open(false);
  box.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') { open(false); input.blur(); } });
  form.addEventListener('submit', async e => {
    e.preventDefault(); err.textContent = '';
    const t = input.value; if (!t.trim()) return;
    const r = await net.sendChat(getNick(), t);
    if (r.error) { err.textContent = r.error; return; }
    input.value = '';
  });
  line(['I messaggi sono temporanei: nessuno li salva e spariscono quando chiudi la pagina. Niente link, e un messaggio ogni pochi secondi.'], 'sys');
  refreshAvail();

  return {
    get on() { return on; },
    get open() { return !box.hidden; },
    openPanel: () => open(true),
    setReady(v) { ready = v; refreshAvail(); },
    setOn(v) { on = v && globalEnabled; try { localStorage.setItem('ra_chat', on ? 'on' : 'off'); } catch (e) {} refreshAvail(); if (!on) open(false); return on; },
    isMuted: id => muted.has(id),
    toggleMute(id) { if (muted.has(id)) muted.delete(id); else muted.add(id); return muted.has(id); },
    receive(m) {
      if (!on || muted.has(m.id)) return;
      line([h('b', { style: `color:${m.col || '#fac775'}` }, m.mine ? `${m.nick} (tu)` : m.nick), m.testo, m.verified ? null : h('span', { class: 'nv', title: 'Non riesco a collegare questo messaggio a un personaggio presente' }, '(?)')]);
      if (m.verified) onBubble(m.mine ? 'me' : m.id, m.testo);
      if (!m.mine && box.hidden) { setBadge(unread + 1); audio.chat(); }
    },
    system(text) { line([text], 'sys'); },
  };
}
