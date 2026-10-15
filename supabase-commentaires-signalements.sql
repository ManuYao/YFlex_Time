-- Signaler un commentaire (v16.12.0). Même principe que le signalement d'un mix.
--
--   * il faut un compte pour signaler, et on ne signale pas son propre commentaire ;
--   * un signalement fait est définitif (pas de modification, pas de suppression) ;
--   * 3 personnes DIFFÉRENTES ont signalé le même commentaire : il disparaît pour
--     tout le monde sauf son auteur (colonne « hidden », que personne ne peut
--     écrire à la main). Un commentaire racine masqué emporte son fil avec lui.
--
-- À FAIRE APRÈS supabase-commentaires.sql.
-- À coller dans Supabase > SQL Editor > New query, puis cliquer sur Run.
-- Sans danger si tu le relances : rien n'est écrasé ni supprimé.
--
-- Pour LIRE les signalements : Supabase > Table Editor > comment_reports.
-- Pour REMETTRE un commentaire masqué à tort : Table Editor > mix_comments,
-- ouvrir la ligne et passer « hidden » à false.

-- ---------------------------------------------------------------------------
-- Colonne « hidden » + lecture qui en tient compte
-- ---------------------------------------------------------------------------
alter table public.mix_comments
  add column if not exists hidden boolean not null default false;

-- Les droits d'écriture sont donnés colonne par colonne (supabase-commentaires.sql) :
-- « hidden » n'y figure pas, donc seul le trigger plus bas peut la changer.

drop policy if exists "mix_comments_read" on public.mix_comments;
create policy "mix_comments_read"
  on public.mix_comments
  for select
  to anon, authenticated
  using (
    exists (select 1 from public.shared_mixes m where m.id = mix_id)
    and (not hidden or author_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Les signalements
-- ---------------------------------------------------------------------------
create table if not exists public.comment_reports (
  comment_id  uuid        not null references public.mix_comments (id) on delete cascade,
  reporter_id uuid        not null references auth.users (id) on delete cascade,
  reason      text        not null check (reason in ('inappropriate', 'spam', 'dangerous', 'other')),
  created_at  timestamptz not null default now(),
  primary key (comment_id, reporter_id)
);

alter table public.comment_reports enable row level security;

-- Chacun ne voit que SES signalements (pour afficher « Signalé »).
drop policy if exists "comment_reports_read_own" on public.comment_reports;
create policy "comment_reports_read_own"
  on public.comment_reports
  for select
  to authenticated
  using (auth.uid() = reporter_id);

-- On signale avec son compte, jamais son propre commentaire.
drop policy if exists "comment_reports_insert_own" on public.comment_reports;
create policy "comment_reports_insert_own"
  on public.comment_reports
  for insert
  to authenticated
  with check (
    auth.uid() = reporter_id
    and not exists (
      select 1 from public.mix_comments c
      where c.id = comment_id and c.author_id = auth.uid()
    )
  );

revoke all on public.comment_reports from anon, authenticated;
grant select on public.comment_reports to authenticated;
grant insert (comment_id, reporter_id, reason) on public.comment_reports to authenticated;

-- Trois personnes différentes ont signalé le commentaire : il est masqué
-- (« security definer » : les utilisateurs ne peuvent pas écrire hidden).
-- Un commentaire déjà supprimé n'est pas touché (rien à masquer, et son trigger
-- de modification refuse de toute façon de le modifier).
create or replace function public.auto_hide_reported_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.comment_reports where comment_id = new.comment_id) >= 3 then
    update public.mix_comments
       set hidden = true
     where id = new.comment_id
       and not deleted;
  end if;
  return null;
end;
$$;

revoke all on function public.auto_hide_reported_comment() from public;

drop trigger if exists comment_reports_auto_hide on public.comment_reports;
create trigger comment_reports_auto_hide
  after insert on public.comment_reports
  for each row execute function public.auto_hide_reported_comment();

-- ---------------------------------------------------------------------------
-- Fin : recharge l'API et PROUVE que tout a marché
-- ---------------------------------------------------------------------------
notify pgrst, 'reload schema';

-- Le tableau « Results » doit afficher :
--   table_signalements = comment_reports   (si tu lis « null » : la table n'a pas été créée)
--   colonne_hidden     = true
select
  to_regclass('public.comment_reports') as table_signalements,
  exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'mix_comments' and column_name = 'hidden'
  ) as colonne_hidden;
