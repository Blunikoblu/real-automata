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

export const ROOM = { W: 10, D: 8, H: 3 };

export const AVATARS = [
  { id: 'robot', nome: 'Robot' },
  { id: 'gatto', nome: 'Gatto' },
  { id: 'pinguino', nome: 'Pinguino' },
];

export const COLORS = ['#fb923c', '#5dcaa5', '#85b7eb', '#ed93b1', '#fac775', '#afa9ec'];

export const EMOTES = [
  { id: 'wave', label: 'Saluta', glyph: '👋', key: '1' },
  { id: 'laugh', label: 'Ridi', glyph: '😂', key: '2' },
  { id: 'thumb', label: 'Pollice su', glyph: '👍', key: '3' },
  { id: 'heart', label: 'Cuore', glyph: '❤️', key: '4' },
  { id: 'wow', label: 'Wow', glyph: '😮', key: '5' },
];

// Le zone del mondo. Per ora è costruito solo l'ufficio: le altre hanno una porta
// e una descrizione, e verranno aggiunte qui con la loro funzione build().
export const ZONES = {
  ufficio: { nome: 'Ufficio', aperta: true },
  laboratorio: { nome: 'Laboratorio', aperta: false,
    testo: "Qui mostrerò i prodotti e gli esperimenti che costruisco durante la sfida. Aprirà quando ci sarà il primo strumento da provare." },
  giardino: { nome: 'Giardino', aperta: false,
    testo: "Uno spazio all'aperto con panchine e piante, dove i visitatori potranno fermarsi e incontrarsi. È la prossima zona che costruisco." },
  archivio: { nome: 'Archivio', aperta: false,
    testo: "Il luogo della memoria: tappe, esperimenti riusciti e falliti, numeri della sfida giorno per giorno. Si riempie man mano che la storia va avanti." },
};
