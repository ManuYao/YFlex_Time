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
