# Mondo multiplayer: configurazione Supabase

Il mondo virtuale (`/stanza/`) è un sito statico su GitHub Pages. Il multiplayer passa da
Supabase Realtime, progetto `real-automata` (`djdqscjketqelanepjng`, eu-central-1, piano gratuito).

## Cosa c'è nel database
`001_mondo.sql` (già applicato come migrazione `mondo_v1`):
- tabella `public.saluti` (bacheca condivisa) con RLS:
  - tutti leggono solo i saluti non nascosti;
  - solo chi ha una sessione (anche anonima) può scrivere, e solo `nick` e `testo`;
  - un trigger impone l'autore, 1 saluto al minuto, al massimo 5 al giorno, niente caratteri di controllo;
  - un vincolo rifiuta i link;
- policy su `realtime.messages`: il canale privato `mondo-v1` (presence e broadcast) è riservato agli utenti autenticati.

Nessuna tabella contiene posizioni o dati personali. Le posizioni viaggiano solo via broadcast e non vengono salvate.

## Chiavi
Nel frontend (`stanza/js/config.js`) c'è solo la chiave **publishable**, che è pubblica per natura.
La `service_role` e le altre chiavi segrete non vanno **mai** nel repository.

## Impostazioni da attivare nel pannello Supabase (una volta)
1. **Authentication → Sign In / Providers → "Allow anonymous sign-ins": ON.**
   Senza questa opzione il mondo usa il canale pubblico di ripiego `mondo-pubblico-v1`, e la bacheca è in sola lettura.
2. *(Facoltativo, consigliato dopo il punto 1)* **Realtime → Settings → "Allow public access": OFF.**
   Così si possono usare solo i canali privati protetti da RLS. Con questa opzione spenta, il ripiego pubblico non funziona più:
   se l'accesso anonimo non è disponibile, la stanza va in modalità individuale.

## Come funziona il client
- Accesso anonimo invisibile, con la sessione salvata in `sessionStorage`: una sessione per scheda, nessuna email.
- Canale `mondo-v1` privato. Se fallisce, il client prova `mondo-pubblico-v1`. Se fallisce anche quello, passa alla modalità individuale con un avviso e riprova ogni 30 s.
- Presence: solo `{n: nickname, a: avatar, c: colore, z: zona}`, validati in ricezione.
- Broadcast `pos` fino a 10 al secondo più un heartbeat ogni 3 s. In ricezione: limite di frequenza per mittente, posizioni limitate alla stanza, interpolazione. Mostrati al massimo 40 avatar.
- Broadcast `emo` (emoji, un elenco fisso, al massimo una ogni 1,2 s) e `sal` (avviso "bacheca aggiornata").
- Riconnessione automatica con attesa crescente (2, 4, 8… fino a 30 s).

## Moderazione della bacheca
Dal pannello SQL:
```sql
select id, nick, testo, created_at from public.saluti order by created_at desc limit 50;
update public.saluti set nascosto = true where id = <id>;
```

## Limiti noti (v1)
- Il broadcast non firma il mittente: un client modificato potrebbe inviare posizioni a nome di un altro visitatore presente.
  L'effetto è solo visivo (un avatar che si sposta), perché nulla viene salvato.
- Piano gratuito di Supabase: fino a 200 connessioni realtime contemporanee, ben oltre l'obiettivo di 20–30.
  Il progetto va in pausa dopo 7 giorni senza attività: le sessioni di lavoro lo controllano e lo riattivano.

## Pubblicazione
Il sito è servito da GitHub Pages dal branch `main`: basta fare push. Non serve nessun passaggio di build,
perché `three.module.min.js` e `supabase.min.js` sono già nel repository.
