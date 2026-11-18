-- Real Automata · mondo virtuale multiplayer
-- Progetto Supabase: real-automata (djdqscjketqelanepjng)
-- Applicato con la migrazione "mondo_v1".

-- 1) Bacheca condivisa dei saluti -------------------------------------------
create table if not exists public.saluti (
  id          bigint generated always as identity primary key,
  user_id     uuid        not null default auth.uid(),
  nick        text        not null check (char_length(nick) between 1 and 20),
  testo       text        not null check (char_length(testo) between 1 and 80),
  created_at  timestamptz not null default now(),
  nascosto    boolean     not null default false,
  constraint saluti_niente_link check (testo !~* '(https?://|www\.|\.(com|it|net|org|io|ly)(/|\s|$))')
);

create index if not exists saluti_created_idx on public.saluti (created_at desc);
create index if not exists saluti_user_idx    on public.saluti (user_id, created_at desc);

alter table public.saluti enable row level security;

revoke all on public.saluti from anon, authenticated;
grant select on public.saluti to anon, authenticated;
grant insert (nick, testo) on public.saluti to authenticated;

drop policy if exists "saluti visibili a tutti" on public.saluti;
create policy "saluti visibili a tutti"
  on public.saluti for select
  to anon, authenticated
  using (nascosto = false);

drop policy if exists "ognuno scrive a proprio nome" on public.saluti;
create policy "ognuno scrive a proprio nome"
  on public.saluti for insert
  to authenticated
  with check (user_id = (select auth.uid()) and nascosto = false);

-- Limiti anti-spam: 1 saluto al minuto, massimo 5 al giorno per utente.
create or replace function public.saluti_limiti()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id    := auth.uid();
  new.created_at := now();
  new.nascosto   := false;
  new.nick  := btrim(regexp_replace(new.nick,  '[[:cntrl:]]', '', 'g'));
  new.testo := btrim(regexp_replace(new.testo, '[[:cntrl:]]', '', 'g'));
  if new.user_id is null then
    raise exception 'serve una sessione';
  end if;
  if exists (select 1 from public.saluti
             where user_id = new.user_id and created_at > now() - interval '60 seconds') then
    raise exception 'troppo presto: aspetta un minuto';
  end if;
  if (select count(*) from public.saluti
      where user_id = new.user_id and created_at > now() - interval '1 day') >= 5 then
    raise exception 'limite giornaliero raggiunto';
  end if;
  return new;
end;
$$;

revoke all on function public.saluti_limiti() from public, anon, authenticated;

drop trigger if exists saluti_limiti on public.saluti;
create trigger saluti_limiti
  before insert on public.saluti
  for each row execute function public.saluti_limiti();

-- 2) Canale realtime privato del mondo ---------------------------------------
-- Solo gli utenti con sessione (anche anonima) possono leggere/scrivere
-- presence e broadcast sul canale "mondo-v1".
drop policy if exists "mondo: ricevere" on realtime.messages;
create policy "mondo: ricevere"
  on realtime.messages for select
  to authenticated
  using ((select realtime.topic()) = 'mondo-v1'
         and realtime.messages.extension in ('broadcast', 'presence'));

drop policy if exists "mondo: inviare" on realtime.messages;
create policy "mondo: inviare"
  on realtime.messages for insert
  to authenticated
  with check ((select realtime.topic()) = 'mondo-v1'
              and realtime.messages.extension in ('broadcast', 'presence'));

-- Moderazione (da eseguire a mano dal pannello SQL quando serve):
--   update public.saluti set nascosto = true where id = <id>;
