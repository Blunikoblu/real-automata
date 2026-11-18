// Configurazione pubblica del mondo. Qui ci sono SOLO valori pubblici:
// la chiave "publishable" di Supabase è fatta per stare nel browser.
// Mai inserire qui la service_role key o altre chiavi segrete.
export const SUPABASE_URL = 'https://djdqscjketqelanepjng.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_bHkm6fU_tXW8xhQeJEQjIA_d77H_g3T';

export const CHANNEL_PRIVATE = 'mondo-v1';         // richiede sessione anonima + RLS
export const CHANNEL_PUBLIC = 'mondo-pubblico-v1'; // ripiego se l'accesso anonimo non è attivo

export const NET = {
  sendHz: 10,            // massimo invii di movimento al secondo
  heartbeatMs: 3000,     // invio anche da fermi, per non "sparire"
  staleMs: 12000,        // avatar senza notizie da 12 s: rimosso
  maxOthers: 40,         // avatar remoti mostrati al massimo
  maxMsgPerSec: 20,      // oltre questo, i messaggi di un mittente vengono ignorati
};

export const CHAT = {
  maxLen: 100,           // caratteri per messaggio
  minGapMs: 2500,        // un messaggio ogni 2,5 s
  burst: 6, burstMs: 30000, // al massimo 6 messaggi ogni 30 s
  bubbleMs: 6500,        // quanto resta il fumetto sopra il personaggio
  logMax: 40,            // messaggi tenuti in memoria (solo nella scheda, mai salvati)
};

export const ROOM = { W: 10, D: 8, H: 3 };
// Limiti dell'intero mondo (per validare le posizioni che arrivano dalla rete).
export const WORLD = { x0: -9, x1: 9, z0: -4, z1: 20 };

export const AVATARS = [
  { id: 'robot', nome: 'Robot' },
  { id: 'gatto', nome: 'Gatto' },
  { id: 'pinguino', nome: 'Pinguino' },
  { id: 'volpe', nome: 'Volpe' },
  { id: 'rana', nome: 'Rana' },
  { id: 'orso', nome: 'Orso' },
  { id: 'fantasma', nome: 'Fantasmino' },
  { id: 'astronauta', nome: 'Astronauta' },
];

export const COLORS = ['#fb923c', '#5dcaa5', '#85b7eb', '#ed93b1', '#fac775', '#afa9ec'];

export const EMOTES = [
  { id: 'wave', label: 'Saluta', glyph: '👋', key: '1', anim: 'wave' },
  { id: 'laugh', label: 'Ridi', glyph: '😂', key: '2', anim: 'laugh' },
  { id: 'thumb', label: 'Pollice su', glyph: '👍', key: '3', anim: 'hop' },
  { id: 'heart', label: 'Cuore', glyph: '❤️', key: '4', anim: 'hop' },
  { id: 'wow', label: 'Wow', glyph: '😮', key: '5', anim: 'hop' },
  { id: 'dance', label: 'Festa', glyph: '🕺', key: '6', anim: 'party' },
  // solo durante il party
  { id: 'cheers', label: 'Brinda', glyph: '🥂', key: '7', party: true, anim: 'hop' },
];

// Party settimanale nella stanza (ora italiana). weekday: 0 = domenica … 5 = venerdì.
export const PARTY = {
  weekday: 5, hour: 21, minute: 0, durataMin: 60,
  nome: 'Party del venerdì',
  // domanda della serata: le risposte vanno nella bacheca dei saluti
  domanda: 'Che lavoro fai, e qual è la cosa che ti fa perdere più tempo?',
};

// Le zone del mondo. Per ora è costruito solo l'ufficio: le altre hanno una porta
// e una descrizione, e verranno aggiunte qui con la loro funzione build().
export const ZONES = {
  ufficio: { nome: 'Ufficio', aperta: true },
  laboratorio: { nome: 'Laboratorio', aperta: false,
    testo: "Qui mostrerò i prodotti e gli esperimenti che costruisco durante la sfida. Aprirà quando ci sarà il primo strumento da provare." },
  giardino: { nome: 'Giardino', aperta: true,
    testo: "Uno spazio all'aperto con panchine, alberi e un laghetto, dove fermarsi e incontrarsi." },
  archivio: { nome: 'Archivio', aperta: false,
    testo: "Il luogo della memoria: tappe, esperimenti riusciti e falliti, numeri della sfida giorno per giorno. Si riempie man mano che la storia va avanti." },
};
