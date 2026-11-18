// Interfaccia: intro, HUD, pannelli, notifiche, impostazioni, modalità elenco.
// Tutto il testo variabile passa da textContent (tramite h()).
import { AVATARS, COLORS, EMOTES } from './config.js';
import { h, cleanNick } from './util.js';

const $ = id => document.getElementById(id);

export function createUI() {
  const panel = $('panel'), card = $('card'), toasts = $('toasts');
  let lastFocus = null, onClose = null;

  function openPanel(nodes, opts = {}) {
    lastFocus = document.activeElement;
    const close = h('button', { class: 'close', type: 'button', 'aria-label': 'Chiudi', onclick: closePanel }, 'Chiudi ✕');
    card.replaceChildren(close, ...[].concat(nodes).filter(Boolean));
    card.setAttribute('aria-label', opts.label || 'Pannello');
    panel.hidden = false; onClose = opts.onClose || null;
    requestAnimationFrame(() => (card.querySelector('[autofocus]') || close).focus());
  }
  function closePanel() {
    if (panel.hidden) return;
    panel.hidden = true; card.replaceChildren();
    onClose?.(); onClose = null;
    lastFocus?.focus?.();
  }
  panel.addEventListener('pointerdown', e => { if (e.target === panel) closePanel(); });
  panel.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.stopPropagation(); closePanel(); }
    if (e.key === 'Tab') { // focus intrappolato nel pannello
      const f = [...card.querySelectorAll('button,a[href],input,textarea,select')].filter(x => !x.disabled);
      if (!f.length) return; const first = f[0], lastEl = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
    }
  });

  function toast(text, kind = '') {
    const t = h('div', { class: 'toast ' + kind, role: 'status' }, text);
    toasts.append(t);
    while (toasts.children.length > 4) toasts.firstChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 4200);
  }

  function setStatus(mode, msg) {
    const el = $('netStatus'), dot = $('netDot');
    dot.className = 'dot ' + (mode === 'online' || mode === 'online-pubblico' ? 'on' : mode === 'solo' ? 'off' : 'wait');
    el.textContent = msg || '';
    el.hidden = !msg;
  }

  function setCount(n) {
    $('countN').textContent = String(n);
    $('countBtn').setAttribute('aria-label', n === 1 ? 'Sei solo nella stanza. Mostra chi è online' : `${n} persone nella stanza. Mostra chi è online`);
  }

  // Schermata iniziale: intro → nickname, avatar e colore → entrata.
  function intro(prefs, previewFactory) {
    return new Promise(resolve => {
      const s1 = $('intro1'), s2 = $('intro2');
      let choice = { nick: prefs.nick || '', av: prefs.av || 'robot', col: prefs.col || COLORS[0] }, preview = null;
      $('go1').onclick = () => {
        s1.hidden = true; s2.hidden = false;
        try { preview = previewFactory($('avPreview')); preview.set(choice.av, choice.col); } catch (e) {}
        $('nick').focus();
      };
      const nick = $('nick'); nick.value = choice.nick;
      const avBox = $('avChoices'), colBox = $('colChoices');
      const avBtns = AVATARS.map(a => h('button', { type: 'button', class: 'chip', 'aria-pressed': String(a.id === choice.av), onclick: () => {
        choice.av = a.id; avBtns.forEach(b => b.setAttribute('aria-pressed', String(b === btn(a.id)))); preview?.set(choice.av, choice.col);
      }, 'data-id': a.id }, a.nome));
      const btn = id => avBtns.find(b => b.dataset.id === id);
      avBox.replaceChildren(...avBtns);
      const colBtns = COLORS.map(c => h('button', { type: 'button', class: 'swatch', style: `background:${c}`, 'aria-label': 'Colore ' + c, 'aria-pressed': String(c === choice.col), onclick: e => {
        choice.col = c; colBtns.forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget))); preview?.set(choice.av, choice.col);
      } }));
      colBox.replaceChildren(...colBtns);
      $('intro2').onsubmit = e => {
        e.preventDefault();
        choice.nick = cleanNick(nick.value);
        preview?.stop();
        $('intro').hidden = true;
        resolve(choice);
      };
    });
  }

  function emoteBar(onEmote) {
    const bar = $('emotes');
    bar.replaceChildren(...EMOTES.map(e => h('button', { type: 'button', title: `${e.label} (${e.key})`, 'aria-label': e.label, onclick: () => onEmote(e.id) }, e.glyph)));
  }

  return { openPanel, closePanel, get panelOpen() { return !panel.hidden; }, toast, setStatus, setCount, intro, emoteBar };
}
