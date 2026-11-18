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

## Chat (mondo v2, migrazione `mondo_v2_chat`, file `002_chat.sql`)
- I visitatori **non** scrivono direttamente sul canale della chat (`mondo-v1-chat`): hanno solo il permesso di lettura.
- Si scrive chiamando la funzione `public.invia_chat(testo, nick, sid)` (solo utenti con sessione, anche anonima). La funzione:
  - pulisce il testo (niente caratteri di controllo, massimo 100 caratteri, niente link);
  - applica i limiti: un messaggio ogni 2 secondi e al massimo 6 ogni 30 secondi per utente (tabella `chat_limiti`, che contiene solo orari);
  - pubblica il messaggio con `realtime.send` aggiungendo `u`, un'impronta dell'utente vero (12 caratteri di SHA-256 dell'id anonimo).
- Il browser mette il fumetto sopra un personaggio **solo se** l'impronta del messaggio coincide con quella dichiarata da quel personaggio
  in Presence. Chi modifica il proprio client non può quindi far "parlare" l'avatar di un altro.
- Conservazione: nessuna tabella con i testi. I messaggi passano da `realtime.messages`, che Supabase cancella da solo dopo 3 giorni.
- Spegnere la chat per tutti: `"chat": false` in `data.json`. Ogni visitatore può spegnerla per sé (Menu → Chat) o silenziare qualcuno (Chi è online).

## Moderazione della bacheca
Dal pannello SQL:
```sql
select id, nick, testo, created_at from public.saluti order by created_at desc limit 50;
update public.saluti set nascosto = true where id = <id>;
```

## Limiti noti
- **Posizioni, reazioni e saluti** viaggiano via broadcast dal browser (servono 10 messaggi al secondo, non possono passare dal database):
  il server non firma il mittente, quindi un client modificato potrebbe muovere l'avatar di un altro visitatore presente o mandare una
  reazione "a suo nome". L'effetto è solo visivo e momentaneo: niente viene salvato. La **chat** invece è protetta (vedi sopra).
- I **nickname** non sono unici: due visitatori possono chiamarsi uguale. Nella chat, i messaggi che non si riescono ad abbinare a un
  personaggio presente sono segnati con "(?)" e non compaiono nei fumetti.
- Il **robottino** non è sincronizzato: ogni visitatore vede il suo (stesse battute, tempi diversi).
- Avvisi del controllo di sicurezza di Supabase: "Anonymous Access Policies" (voluto: è l'accesso senza registrazione) e
  "Leaked Password Protection" (non riguarda il progetto: non ci sono password).
- Piano gratuito di Supabase: fino a 200 connessioni realtime contemporanee, ben oltre l'obiettivo di 20–30.
  Il progetto va in pausa dopo 7 giorni senza attività: le sessioni di lavoro lo controllano e lo riattivano.

## Pubblicazione
Il sito è servito da GitHub Pages dal branch `main`: basta fare push. Non serve nessun passaggio di build,
perché `three.module.min.js` e `supabase.min.js` sono già nel repository.
