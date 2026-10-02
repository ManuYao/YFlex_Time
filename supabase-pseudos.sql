-- Pseudos UNIQUES entre tous les comptes (anti-usurpation). À coller dans
-- Supabase > SQL Editor, une seule fois.
--
-- Deux comptes ne peuvent pas porter le même pseudo, même avec des majuscules,
-- des espaces, des points, des tirets ou des accents en plus ou en moins :
-- « Karim W », « karim.w », « KARIM-W » et « Kárim W » sont le MÊME pseudo.
-- Sans ça, quelqu'un pourrait se faire passer pour un autre sportif (mix,
-- commentaires).
--
-- La table ne garde que le pseudo choisi : la clé de comparaison est calculée
-- par la base, impossible à contourner depuis l'app. Chacun ne peut écrire que
-- SA ligne (RLS), tout le monde peut lire (les pseudos sont déjà publics).

create table if not exists public.pseudos (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  pseudo     text not null check (char_length(btrim(pseudo)) between 2 and 20),
  pseudo_key text generated always as (
    translate(
      lower(regexp_replace(pseudo, '[\s._-]+', '', 'g')),
      'àâäáãåçéèêëíìîïñóòôöõúùûüýÿ',
      'aaaaaaceeeeiiiinooooouuuuyy'
    )
  ) stored,
  updated_at timestamptz not null default now()
);

-- Doublons déjà présents (même clé) : on s'arrête avec la liste plutôt que de
-- supprimer quoi que ce soit. Sans doublon, l'index se crée.
create unique index if not exists pseudos_key_unique on public.pseudos (pseudo_key);

alter table public.pseudos enable row level security;

drop policy if exists pseudos_read on public.pseudos;
create policy pseudos_read on public.pseudos for select using (true);

drop policy if exists pseudos_insert_own on public.pseudos;
create policy pseudos_insert_own on public.pseudos
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists pseudos_update_own on public.pseudos;
create policy pseudos_update_own on public.pseudos
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

revoke all on public.pseudos from anon, authenticated;
grant select on public.pseudos to anon, authenticated;
grant insert (user_id, pseudo) on public.pseudos to authenticated;
grant update (pseudo, updated_at) on public.pseudos to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Le pseudo SUIT partout : quand quelqu'un change de nom, ses mix publiés et ses
-- commentaires prennent le nouveau nom (avant, l'ancien restait écrit sur chaque
-- publication). Tout est relié au compte, pas à un texte recopié.
-- Les commentaires supprimés ne sont pas touchés (la base les verrouille).
-- Aussi lancé à la toute première réservation d'un pseudo : les publications
-- déjà faites sous ce compte sont alignées d'un coup.

create or replace function public.propagate_pseudo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.shared_mixes
     set author_name = btrim(new.pseudo)
   where owner_id = new.user_id
     and author_name is distinct from btrim(new.pseudo);

  update public.mix_comments
     set author_name = btrim(new.pseudo)
   where author_id = new.user_id
     and not deleted
     and author_name is distinct from btrim(new.pseudo);

  -- « ↪ à Karim » : les réponses adressées à l'ancien nom suivent aussi.
  if tg_op = 'UPDATE' and old.pseudo is distinct from new.pseudo then
    update public.mix_comments
       set reply_to_name = btrim(new.pseudo)
     where reply_to_name = btrim(old.pseudo)
       and not deleted;
  end if;

  return new;
end;
$$;

drop trigger if exists pseudos_propagate on public.pseudos;
create trigger pseudos_propagate
  after insert or update of pseudo on public.pseudos
  for each row execute function public.propagate_pseudo();
