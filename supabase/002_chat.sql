-- Real Automata · mondo v2: chat temporanea con mittente verificato dal server.
-- Applicato con la migrazione "mondo_v2_chat".
--
-- Perché così: i permessi di Supabase Realtime si controllano una volta per canale (alla connessione),
-- non per singolo messaggio. Se i visitatori potessero scrivere direttamente sul canale della chat,
-- chiunque con un client modificato potrebbe mandare messaggi "a nome" di un altro avatar.
-- Quindi: il canale della chat è IN SOLA LETTURA per i visitatori; ci scrive solo il database,
-- attraverso questa funzione, che timbra un'impronta dell'utente vero (hash della sessione anonima)
-- e applica i limiti anti-spam. Il testo non viene salvato in nessuna tabella: passa da
-- realtime.messages, che Supabase svuota automaticamente dopo 3 giorni.

-- 1) Contatori anti-spam (nessun contenuto, solo orari). Nessuna policy: non leggibile da fuori.
create table if not exists public.chat_limiti (
  user_id   uuid primary key,
  ultimo    timestamptz not null,
  finestra  timestamptz not null,
  conteggio int not null default 0
);
alter table public.chat_limiti enable row level security;
revoke all on public.chat_limiti from anon, authenticated;

-- 2) Invio di un messaggio
create or replace function public.invia_chat(p_testo text, p_nick text, p_sid text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  uid uuid := auth.uid();
  t text; n text; r public.chat_limiti;
begin
  if uid is null then raise exception 'serve una sessione'; end if;
  t := btrim(regexp_replace(coalesce(p_testo, ''), '[[:cntrl:]]', ' ', 'g'));
  t := regexp_replace(t, '\s+', ' ', 'g');
  n := btrim(regexp_replace(coalesce(p_nick, ''), '[[:cntrl:]]', '', 'g'));
  if char_length(t) < 1 or char_length(t) > 100 then raise exception 'lunghezza non valida'; end if;
  if char_length(n) < 1 or char_length(n) > 16 then n := 'Ospite'; end if;
  if coalesce(p_sid, '') !~ '^[a-z0-9]{6,16}$' then raise exception 'sessione non valida'; end if;
  if t ~* '(https?://|www\.)' then raise exception 'niente link'; end if;

  select * into r from public.chat_limiti where user_id = uid for update;
  if not found then
    insert into public.chat_limiti values (uid, now(), now(), 1);
  else
    if r.ultimo > now() - interval '2 seconds' then raise exception 'troppo veloce'; end if;
    if r.finestra > now() - interval '30 seconds' then
      if r.conteggio >= 6 then raise exception 'troppi messaggi'; end if;
      update public.chat_limiti set ultimo = now(), conteggio = conteggio + 1 where user_id = uid;
    else
      update public.chat_limiti set ultimo = now(), finestra = now(), conteggio = 1 where user_id = uid;
    end if;
  end if;

  perform realtime.send(
    jsonb_build_object(
      't', t, 'n', n, 'i', p_sid,
      'u', left(encode(extensions.digest(uid::text, 'sha256'), 'hex'), 12)
    ),
    'chat', 'mondo-v1-chat', true);
end;
$$;

revoke all on function public.invia_chat(text, text, text) from public, anon;
grant execute on function public.invia_chat(text, text, text) to authenticated;

-- 3) Canale della chat: i visitatori con sessione possono SOLO riceverlo (nessuna policy di insert).
drop policy if exists "chat: ricevere" on realtime.messages;
create policy "chat: ricevere"
  on realtime.messages for select
  to authenticated
  using ((select realtime.topic()) = 'mondo-v1-chat'
         and realtime.messages.extension = 'broadcast');
