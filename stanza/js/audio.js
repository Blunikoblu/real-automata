// Suoni discreti generati al volo (nessun file da scaricare). Disattivabili.
let ctx = null, master = null, hum = null;
let enabled = true;
try { enabled = localStorage.getItem('ra_audio') !== 'off'; } catch (e) {}

function ensure() {
  if (ctx) return true;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = enabled ? 0.5 : 0; master.connect(ctx.destination);
    // Rumore di fondo della stanza: brusio bassissimo filtrato.
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0; for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3; }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
    hum = ctx.createGain(); hum.gain.value = 0.05;
    src.connect(lp).connect(hum).connect(master); src.start();
    return true;
  } catch (e) { return false; }
}

function tone(freq, dur, type = 'sine', vol = 0.15, slide = 0) {
  if (!enabled || !ensure()) return;
  const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02);
}

export const audio = {
  context() { return ensure() ? ctx : null; },
  output() { return master; },
  unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
  get enabled() { return enabled; },
  toggle() {
    enabled = !enabled;
    try { localStorage.setItem('ra_audio', enabled ? 'on' : 'off'); } catch (e) {}
    if (ensure()) master.gain.setTargetAtTime(enabled ? 0.5 : 0, ctx.currentTime, 0.05);
    return enabled;
  },
  step() { tone(90 + Math.random() * 20, 0.06, 'triangle', 0.05); },
  open() { tone(520, 0.12, 'sine', 0.08, 1.5); },
  close() { tone(600, 0.1, 'sine', 0.06, 0.6); },
  join() { tone(660, 0.15, 'sine', 0.07); setTimeout(() => tone(880, 0.2, 'sine', 0.07), 120); },
  leave() { tone(660, 0.15, 'sine', 0.05); setTimeout(() => tone(440, 0.2, 'sine', 0.05), 120); },
  pop() { tone(700, 0.08, 'square', 0.04, 1.8); },
  coin() { tone(988, 0.08, 'square', 0.05); setTimeout(() => tone(1319, 0.25, 'square', 0.05), 80); },
  clunk() { tone(110, 0.25, 'sawtooth', 0.06, 0.5); },
};
