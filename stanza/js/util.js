// Utilità condivise. Tutto il testo che arriva da altri utenti passa da qui.

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Pulisce un testo inserito da un utente: niente caratteri di controllo,
// spazi compattati, lunghezza massima. Il risultato viene comunque mostrato
// sempre con textContent o disegnato su canvas, mai con innerHTML.
export function cleanText(s, max) {
  if (typeof s !== 'string') return '';
  return s.replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g, '')
    .replace(/\s+/g, ' ').trim().slice(0, max);
}

export function cleanNick(s) {
  const n = cleanText(s, 16);
  return n.length ? n : 'Ospite';
}

export const isColor = c => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);

// Piccolo costruttore di elementi DOM sicuro: le stringhe diventano testo.
export function h(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) {
    if (c == null || c === false) continue;
    e.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return e;
}

export const eur = v => Number(v || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

export function randomId(n = 10) {
  const a = new Uint8Array(n); crypto.getRandomValues(a);
  return Array.from(a, b => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
}

export function wrapText(g, text, x, y, maxW, lh, maxLines) {
  const words = String(text).split(' '); let line = '', n = 0;
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (g.measureText(t).width > maxW && line) {
      g.fillText(line, x, y); y += lh; line = w;
      if (++n >= maxLines - 1) { while (g.measureText(line + '…').width > maxW && line.length) line = line.slice(0, -1); line += '…'; break; }
    } else line = t;
  }
  g.fillText(line, x, y);
  return y;
}
