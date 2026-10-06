-- Modération côté utilisateurs (v16.12.0) : deux outils.
--
-- 1. RETIRER un commentaire gênant sur SON propre mix.
--    Le texte disparaît et l'écran affiche « Retiré par l'auteur du mix » : tout
--    le monde voit qu'il y a eu un retrait, rien n'est effacé en silence.
--    Les réponses des autres restent lisibles. Le commentaire retiré compte
--    toujours dans les 3 fils de son auteur (il ne peut pas recommencer aussitôt).
--    Seul l'auteur du mix peut le faire, et seulement sur SON mix.
--
-- 2. BLOQUER un auteur : plus aucun de ses mix ni de ses commentaires chez
--    la personne qui bloque. C'est un masquage « pour moi » : l'autre ne le sait
--    pas, et rien n'est supprimé pour les autres.
--
-- À FAIRE APRÈS supabase-commentaires.sql.
-- À coller dans Supabase > SQL Editor > New query, puis cliquer sur Run.
-- Sans danger si tu le relances : rien n'est écrasé ni supprimé.
-- Tant qu'il n'a pas été lancé, l'app affiche « pas encore ouvert » et ne casse rien.

-- ---------------------------------------------------------------------------
-- 1. Retirer un commentaire sur son mix
-- ---------------------------------------------------------------------------
-- Colonne posée uniquement par la fonction plus bas (jamais écrivable à la
-- main : les droits d'écriture de mix_comments sont donnés colonne par colonne).
alter table public.mix_comments
  add column if not exists removed boolean not null default false;

create or replace function public.owner_remove_comment(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  if auth.uid() is null then
    raise exception 'Connecte-toi';
  end if;

  select m.owner_id into v_owner
    from public.mix_comments c
    join public.shared_mixes m on m.id = c.mix_id
   where c.id = target;

  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'Non autorisé';
  end if;

  -- Un commentaire déjà supprimé n'est pas touché.
  update public.mix_comments
     set deleted = true,
         removed = true,
         body    = ''
   where id = target
     and not deleted;
end;
$$;

revoke all on function public.owner_remove_comment(uuid) from public, anon;
grant execute on function public.owner_remove_comment(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Bloquer un auteur
-- ---------------------------------------------------------------------------
create table if not exists public.user_blocks (
  blocker_id   uuid        not null references auth.users (id) on delete cascade,
  blocked_id   uuid        not null references auth.users (id) on delete cascade,
  -- Pseudo au moment du blocage, seulement pour afficher la liste « Personnes
  -- bloquées » sans avoir à le rechercher.
  blocked_name text        not null default '' check (char_length(blocked_name) <= 20),
  created_at   timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.user_blocks enable row level security;

-- Chacun ne voit, n'ajoute et ne retire que SES blocages.
drop policy if exists "user_blocks_read_own" on public.user_blocks;
create policy "user_blocks_read_own"
  on public.user_blocks
  for select
  to authenticated
  using (auth.uid() = blocker_id);

drop policy if exists "user_blocks_insert_own" on public.user_blocks;
create policy "user_blocks_insert_own"
  on public.user_blocks
  for insert
  to authenticated
  with check (auth.uid() = blocker_id);

drop policy if exists "user_blocks_delete_own" on public.user_blocks;
create policy "user_blocks_delete_own"
  on public.user_blocks
  for delete
  to authenticated
  using (auth.uid() = blocker_id);

revoke all on public.user_blocks from anon, authenticated;
grant select, delete on public.user_blocks to authenticated;
grant insert (blocker_id, blocked_id, blocked_name) on public.user_blocks to authenticated;

-- ---------------------------------------------------------------------------
-- Fin : recharge l'API et PROUVE que tout a marché
-- ---------------------------------------------------------------------------
notify pgrst, 'reload schema';

-- Le tableau « Results » doit afficher :
--   table_blocages    = user_blocks              (si tu lis « null » : pas créée)
--   fonction_retirer  = owner_remove_comment(uuid)
--   colonne_removed   = true
select
  to_regclass('public.user_blocks')                as table_blocages,
  to_regprocedure('public.owner_remove_comment(uuid)') as fonction_retirer,
  exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'mix_comments' and column_name = 'removed'
  ) as colonne_removed;
