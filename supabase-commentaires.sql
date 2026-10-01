-- Commentaires sur les mix publiés (v16.4.0).
--
-- Règles :
--   * tout le monde (connecté ou non) peut LIRE les commentaires d'un mix visible ;
--   * il faut un compte pour écrire ;
--   * FILS = commentaires « racine ». Quelqu'un qui n'est pas l'auteur du mix en
--     ouvre 3 au maximum sur un même mix. L'auteur du mix n'a aucune limite ;
--   * RÉPONSES = illimitées, dans n'importe quel fil, aux autres comme à soi-même.
--     Une réponse s'attache toujours à la racine du fil (un seul niveau) ;
--   * chacun modifie et supprime SES commentaires. Supprimer une racine qui a
--     des réponses ne retire que son texte (« Commentaire supprimé ») : les
--     réponses des autres restent lisibles. Elle compte toujours dans les 3 fils.
--
-- À coller dans Supabase > SQL Editor > New query, puis cliquer sur Run.
-- Sans danger si tu le relances : rien n'est écrasé ni supprimé.
-- Tant qu'il n'a pas été lancé, l'app affiche « bientôt disponible » à la place
-- des commentaires.
--
-- À SURVEILLER (pas de bouton « Signaler » sur les commentaires pour l'instant) :
-- Supabase > Table Editor > mix_comments pour lire et supprimer à la main un
-- commentaire abusif.

-- ---------------------------------------------------------------------------
-- Les commentaires
-- ---------------------------------------------------------------------------
create table if not exists public.mix_comments (
  id            uuid        primary key default gen_random_uuid(),
  mix_id        uuid        not null references public.shared_mixes (id) on delete cascade,
  author_id     uuid        not null references auth.users (id) on delete cascade,
  author_name   text        not null check (char_length(author_name) between 2 and 20),
  -- null = commentaire racine (ouvre un fil) ; sinon l'id de la RACINE du fil.
  parent_id     uuid        references public.mix_comments (id) on delete cascade,
  -- Nom de la personne à qui l'on répond dans le fil (affichage seulement).
  reply_to_name text        check (reply_to_name is null or char_length(reply_to_name) between 2 and 20),
  body          text        not null default '',
  deleted       boolean     not null default false,
  created_at    timestamptz not null default now(),
  edited_at     timestamptz,
  -- Un commentaire supprimé peut avoir un texte vide ; un commentaire vivant,
  -- entre 1 et 500 caractères.
  check (deleted or char_length(btrim(body)) between 1 and 500)
);

create index if not exists mix_comments_by_mix
  on public.mix_comments (mix_id, created_at);
create index if not exists mix_comments_by_parent
  on public.mix_comments (parent_id);
create index if not exists mix_comments_roots_by_author
  on public.mix_comments (mix_id, author_id) where parent_id is null;

alter table public.mix_comments enable row level security;

-- Lecture : les commentaires d'un mix qu'on a le droit de voir (un mix masqué
-- après signalements ne montre plus ses commentaires, sauf à son auteur).
drop policy if exists "mix_comments_read" on public.mix_comments;
create policy "mix_comments_read"
  on public.mix_comments
  for select
  to anon, authenticated
  using (exists (select 1 from public.shared_mixes m where m.id = mix_id));

-- Écriture : avec son compte, en son nom. Les limites sont dans le trigger.
drop policy if exists "mix_comments_insert_own" on public.mix_comments;
create policy "mix_comments_insert_own"
  on public.mix_comments
  for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and not deleted
    and exists (select 1 from public.shared_mixes m where m.id = mix_id)
  );

drop policy if exists "mix_comments_update_own" on public.mix_comments;
create policy "mix_comments_update_own"
  on public.mix_comments
  for update
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

drop policy if exists "mix_comments_delete_own" on public.mix_comments;
create policy "mix_comments_delete_own"
  on public.mix_comments
  for delete
  to authenticated
  using (auth.uid() = author_id);

-- Droits au niveau des colonnes : on écrit son texte, jamais la date, le mix ni
-- l'auteur d'une ligne existante. `edited_at` est posé par le trigger plus bas.
revoke all on public.mix_comments from anon, authenticated;
grant select on public.mix_comments to anon, authenticated;
grant insert (mix_id, author_id, author_name, parent_id, reply_to_name, body)
  on public.mix_comments to authenticated;
grant update (body, deleted) on public.mix_comments to authenticated;
grant delete on public.mix_comments to authenticated;

-- ---------------------------------------------------------------------------
-- Les règles, appliquées par la base (le client ne peut pas les contourner)
-- ---------------------------------------------------------------------------
create or replace function public.enforce_comment_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner  uuid;
  v_parent record;
  v_roots  int;
begin
  select owner_id into v_owner from public.shared_mixes where id = new.mix_id;
  if v_owner is null then
    raise exception 'Mix introuvable';
  end if;

  if new.parent_id is null then
    -- Nouveau FIL : 3 au maximum par personne et par mix, sauf pour l'auteur du mix.
    new.reply_to_name := null;
    if new.author_id <> v_owner then
      select count(*) into v_roots
        from public.mix_comments
       where mix_id = new.mix_id
         and author_id = new.author_id
         and parent_id is null;
      if v_roots >= 3 then
        raise exception 'Limite de 3 fils de discussion atteinte sur ce mix';
      end if;
    end if;
  else
    -- RÉPONSE : illimitée, mais attachée à la racine d'un fil de CE mix.
    select mix_id, parent_id into v_parent from public.mix_comments where id = new.parent_id;
    if not found or v_parent.mix_id <> new.mix_id then
      raise exception 'Fil introuvable';
    end if;
    if v_parent.parent_id is not null then
      raise exception 'Réponds directement au fil, pas à une réponse';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_comment_rules() from public;

drop trigger if exists mix_comments_rules on public.mix_comments;
create trigger mix_comments_rules
  before insert on public.mix_comments
  for each row execute function public.enforce_comment_rules();

-- Modification : un commentaire supprimé ne ressuscite pas, et un texte changé
-- porte la date de modification.
create or replace function public.guard_comment_update()
returns trigger
language plpgsql
as $$
begin
  if old.deleted then
    raise exception 'Commentaire supprimé';
  end if;
  if new.deleted then
    new.body := '';
  elsif new.body is distinct from old.body then
    new.edited_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists mix_comments_update_guard on public.mix_comments;
create trigger mix_comments_update_guard
  before update on public.mix_comments
  for each row execute function public.guard_comment_update();
