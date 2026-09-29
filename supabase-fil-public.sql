-- Fil public de MIX : les mixes publiés par des utilisateurs connectés.
--   * tout le monde (connecté ou non) peut LIRE le fil ;
--   * seul un utilisateur connecté peut PUBLIER (et retirer SES mixes) ;
--   * seul un utilisateur connecté peut NOTER (1 à 5 étoiles), jamais son propre mix.
-- À coller dans Supabase > SQL Editor > New query, puis cliquer sur Run.
-- Sans danger si tu le relances : rien n'est écrasé ni supprimé.

-- ---------------------------------------------------------------------------
-- Les mixes publiés
-- ---------------------------------------------------------------------------
create table if not exists public.shared_mixes (
  id               uuid         primary key default gen_random_uuid(),
  owner_id         uuid         not null references auth.users (id) on delete cascade,
  author_name      text         not null check (char_length(author_name) between 2 and 20),
  name             text         not null check (char_length(name) between 1 and 28),
  -- Mêmes identifiants que lib/disciplines.js : à garder synchronisés.
  category         text         not null check (category in
                     ('street', 'gym', 'running', 'swim', 'athletics', 'crossfit', 'other')),
  -- { v, name, blocks: [...] } : le même format que le partage par lien.
  payload          jsonb        not null check (pg_column_size(payload) < 40000),
  block_count      int          not null check (block_count between 1 and 60),
  duration_seconds int          not null check (duration_seconds between 0 and 86400),
  -- Calculés par le trigger plus bas : personne ne peut les écrire à la main.
  rating_avg       numeric(3,2) not null default 0,
  rating_count     int          not null default 0,
  created_at       timestamptz  not null default now(),
  unique (owner_id, name)
);

-- Masqué automatiquement quand trois personnes différentes le signalent
-- (voir mix_reports plus bas). Personne ne peut l'écrire à la main.
alter table public.shared_mixes
  add column if not exists hidden boolean not null default false;

create index if not exists shared_mixes_category_recent
  on public.shared_mixes (category, created_at desc);
create index if not exists shared_mixes_top
  on public.shared_mixes (rating_avg desc, rating_count desc);

alter table public.shared_mixes enable row level security;

drop policy if exists "shared_mixes_read_all" on public.shared_mixes;
create policy "shared_mixes_read_all"
  on public.shared_mixes
  for select
  to anon, authenticated
  using (not hidden or auth.uid() = owner_id);

drop policy if exists "shared_mixes_insert_own" on public.shared_mixes;
create policy "shared_mixes_insert_own"
  on public.shared_mixes
  for insert
  to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "shared_mixes_delete_own" on public.shared_mixes;
create policy "shared_mixes_delete_own"
  on public.shared_mixes
  for delete
  to authenticated
  using (auth.uid() = owner_id);

-- Droits au niveau des colonnes : on ne peut écrire que le contenu du mix,
-- jamais la note moyenne ni la date. Pas de modification : republier =
-- retirer puis publier à nouveau (la note repart de zéro).
revoke all on public.shared_mixes from anon, authenticated;
grant select on public.shared_mixes to anon, authenticated;
grant insert (owner_id, author_name, name, category, payload, block_count, duration_seconds)
  on public.shared_mixes to authenticated;
grant delete on public.shared_mixes to authenticated;

-- Anti-abus simple : 30 mixes publiés au maximum par personne.
create or replace function public.limit_shared_mixes()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.shared_mixes where owner_id = new.owner_id) >= 30 then
    raise exception 'Limite de 30 mixes publiés atteinte';
  end if;
  return new;
end;
$$;

drop trigger if exists shared_mixes_limit on public.shared_mixes;
create trigger shared_mixes_limit
  before insert on public.shared_mixes
  for each row execute function public.limit_shared_mixes();

-- ---------------------------------------------------------------------------
-- Les notes (étoiles)
-- ---------------------------------------------------------------------------
create table if not exists public.mix_ratings (
  mix_id     uuid        not null references public.shared_mixes (id) on delete cascade,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  stars      smallint    not null check (stars between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (mix_id, user_id)
);

alter table public.mix_ratings enable row level security;

-- Chacun ne voit que SES notes (la moyenne publique passe par shared_mixes).
drop policy if exists "mix_ratings_read_own" on public.mix_ratings;
create policy "mix_ratings_read_own"
  on public.mix_ratings
  for select
  to authenticated
  using (auth.uid() = user_id);

-- On note avec son compte, et jamais son propre mix.
drop policy if exists "mix_ratings_insert_own" on public.mix_ratings;
create policy "mix_ratings_insert_own"
  on public.mix_ratings
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and not exists (
      select 1 from public.shared_mixes m
      where m.id = mix_id and m.owner_id = auth.uid()
    )
  );

drop policy if exists "mix_ratings_update_own" on public.mix_ratings;
create policy "mix_ratings_update_own"
  on public.mix_ratings
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and not exists (
      select 1 from public.shared_mixes m
      where m.id = mix_id and m.owner_id = auth.uid()
    )
  );

drop policy if exists "mix_ratings_delete_own" on public.mix_ratings;
create policy "mix_ratings_delete_own"
  on public.mix_ratings
  for delete
  to authenticated
  using (auth.uid() = user_id);

revoke all on public.mix_ratings from anon, authenticated;
grant select, delete on public.mix_ratings to authenticated;
grant insert (mix_id, user_id, stars) on public.mix_ratings to authenticated;
grant update (mix_id, user_id, stars) on public.mix_ratings to authenticated;

-- Recalcule la moyenne et le nombre d'avis d'un mix à chaque note ajoutée,
-- changée ou retirée. « security definer » : c'est le seul moyen d'écrire ces
-- deux colonnes, que les utilisateurs ne peuvent pas modifier eux-mêmes.
create or replace function public.refresh_mix_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.mix_id, old.mix_id);
begin
  update public.shared_mixes m
     set rating_count = s.c,
         rating_avg   = s.a
    from (
      select count(*)::int as c,
             coalesce(round(avg(stars)::numeric, 2), 0) as a
        from public.mix_ratings
       where mix_id = target
    ) s
   where m.id = target;
  return null;
end;
$$;

revoke all on function public.refresh_mix_rating() from public;

drop trigger if exists mix_ratings_refresh on public.mix_ratings;
create trigger mix_ratings_refresh
  after insert or update or delete on public.mix_ratings
  for each row execute function public.refresh_mix_rating();

-- ---------------------------------------------------------------------------
-- Les signalements
-- ---------------------------------------------------------------------------
-- Pour les lire : Supabase > Table Editor > mix_reports. Pour remettre un mix
-- masqué dans le fil : ouvre shared_mixes et passe sa case « hidden » à false.
create table if not exists public.mix_reports (
  mix_id      uuid        not null references public.shared_mixes (id) on delete cascade,
  reporter_id uuid        not null references auth.users (id) on delete cascade,
  reason      text        not null check (reason in ('inappropriate', 'spam', 'dangerous', 'other')),
  created_at  timestamptz not null default now(),
  primary key (mix_id, reporter_id)
);

alter table public.mix_reports enable row level security;

-- Chacun ne voit que SES signalements (pour afficher « Signalé »).
drop policy if exists "mix_reports_read_own" on public.mix_reports;
create policy "mix_reports_read_own"
  on public.mix_reports
  for select
  to authenticated
  using (auth.uid() = reporter_id);

-- On signale avec son compte, et jamais son propre mix. Pas de modification
-- ni de suppression : un signalement fait est définitif.
drop policy if exists "mix_reports_insert_own" on public.mix_reports;
create policy "mix_reports_insert_own"
  on public.mix_reports
  for insert
  to authenticated
  with check (
    auth.uid() = reporter_id
    and not exists (
      select 1 from public.shared_mixes m
      where m.id = mix_id and m.owner_id = auth.uid()
    )
  );

revoke all on public.mix_reports from anon, authenticated;
grant select on public.mix_reports to authenticated;
grant insert (mix_id, reporter_id, reason) on public.mix_reports to authenticated;

-- Trois personnes différentes ont signalé le mix : il disparaît du fil
-- (« security definer » : les utilisateurs ne peuvent pas écrire hidden).
create or replace function public.auto_hide_reported_mix()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.mix_reports where mix_id = new.mix_id) >= 3 then
    update public.shared_mixes set hidden = true where id = new.mix_id;
  end if;
  return null;
end;
$$;

revoke all on function public.auto_hide_reported_mix() from public;

drop trigger if exists mix_reports_auto_hide on public.mix_reports;
create trigger mix_reports_auto_hide
  after insert on public.mix_reports
  for each row execute function public.auto_hide_reported_mix();
