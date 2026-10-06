-- Aimer un commentaire (v16.13.0).
--
--   * il faut un compte pour aimer, et on n'aime pas son propre commentaire ;
--   * un like se retire (on touche le cœur une seconde fois) ;
--   * le nombre de likes est visible par tout le monde ;
--   * 3 likes ou plus = « approuvé par la communauté » : l'AUTEUR DU MIX ne peut
--     plus retirer ce commentaire (règle appliquée par la base, dans
--     owner_remove_comment de supabase-moderation.sql). L'auteur du commentaire,
--     lui, peut toujours supprimer le sien, et les signalements restent possibles.
--
-- À FAIRE APRÈS supabase-commentaires.sql et supabase-moderation.sql.
-- À coller dans Supabase > SQL Editor > New query, puis cliquer sur Run.
-- Sans danger si tu le relances : rien n'est écrasé ni supprimé.

-- ---------------------------------------------------------------------------
-- Le compteur (jamais écrivable à la main : seul le trigger plus bas le change)
-- ---------------------------------------------------------------------------
alter table public.mix_comments
  add column if not exists like_count integer not null default 0;

-- ---------------------------------------------------------------------------
-- Les likes
-- ---------------------------------------------------------------------------
create table if not exists public.comment_likes (
  comment_id uuid        not null references public.mix_comments (id) on delete cascade,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

alter table public.comment_likes enable row level security;

-- Chacun ne voit que SES likes (pour afficher le cœur plein). Le total, lui,
-- est lisible par tous dans mix_comments.like_count.
drop policy if exists "comment_likes_read_own" on public.comment_likes;
create policy "comment_likes_read_own"
  on public.comment_likes
  for select
  to authenticated
  using (auth.uid() = user_id);

-- On aime avec son compte, jamais son propre commentaire, jamais un commentaire
-- supprimé.
drop policy if exists "comment_likes_insert_own" on public.comment_likes;
create policy "comment_likes_insert_own"
  on public.comment_likes
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and not exists (
      select 1 from public.mix_comments c
      where c.id = comment_id and (c.author_id = auth.uid() or c.deleted)
    )
  );

drop policy if exists "comment_likes_delete_own" on public.comment_likes;
create policy "comment_likes_delete_own"
  on public.comment_likes
  for delete
  to authenticated
  using (auth.uid() = user_id);

revoke all on public.comment_likes from anon, authenticated;
grant select, delete on public.comment_likes to authenticated;
grant insert (comment_id, user_id) on public.comment_likes to authenticated;

-- ---------------------------------------------------------------------------
-- Tenir le total à jour (« security definer » : les utilisateurs ne peuvent pas
-- écrire like_count). Un commentaire supprimé garde son dernier total : son
-- trigger de modification refuse de toute façon de le toucher.
-- ---------------------------------------------------------------------------
create or replace function public.refresh_comment_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := coalesce(new.comment_id, old.comment_id);
begin
  update public.mix_comments
     set like_count = (select count(*) from public.comment_likes where comment_id = v_id)
   where id = v_id
     and not deleted;
  return null;
end;
$$;

revoke all on function public.refresh_comment_like_count() from public;

drop trigger if exists comment_likes_count on public.comment_likes;
create trigger comment_likes_count
  after insert or delete on public.comment_likes
  for each row execute function public.refresh_comment_like_count();

-- ---------------------------------------------------------------------------
-- Fin : recharge l'API et PROUVE que tout a marché
-- ---------------------------------------------------------------------------
notify pgrst, 'reload schema';

-- Le tableau « Results » doit afficher :
--   table_likes     = comment_likes   (si tu lis « null » : la table n'a pas été créée)
--   colonne_likes   = true
select
  to_regclass('public.comment_likes') as table_likes,
  exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'mix_comments' and column_name = 'like_count'
  ) as colonne_likes;
