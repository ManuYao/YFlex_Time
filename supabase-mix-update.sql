-- Modifier un mix déjà publié (v16.3.0).
--
-- Avant : une fois publié, un mix ne pouvait plus être corrigé (nom, faute de
-- frappe, blocs).
-- Après ce script : l'auteur modifie SON mix sur place, les étoiles, les
-- commentaires et la date de publication sont gardés.
--
-- À coller dans Supabase > SQL Editor > New query, puis cliquer sur Run.
-- Sans danger si tu le relances : rien n'est écrasé ni supprimé.
-- Tant qu'il n'a pas été lancé, l'app REFUSE de mettre à jour un mix publié
-- (« Mise à jour impossible pour l'instant ») et ne touche à rien : elle ne
-- retire plus jamais un mix pour le republier (les étoiles et les commentaires
-- auraient disparu avec lui).
--
-- ⚠️ Si tu relances supabase-fil-public.sql APRÈS celui-ci, le droit de
-- modifier est redonné par ce fichier-là aussi (depuis le 06/10/2026).

-- Seul le propriétaire peut modifier une ligne.
drop policy if exists "shared_mixes_update_own" on public.shared_mixes;
create policy "shared_mixes_update_own"
  on public.shared_mixes
  for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Droits au niveau des colonnes : le CONTENU du mix seulement. Jamais la note
-- moyenne, le nombre d'avis, la date, le propriétaire ni `hidden` (le masquage
-- après signalements) : personne ne peut s'écrire une meilleure note ni lever
-- une modération en modifiant sa ligne.
grant update (author_name, name, category, payload, block_count, duration_seconds)
  on public.shared_mixes to authenticated;

notify pgrst, 'reload schema';

-- Preuve : le tableau « Results » doit afficher
--   droit_modifier = true   (si tu lis « false » : le droit n'est pas en place)
--   regle_proprietaire = true
select
  has_column_privilege('authenticated', 'public.shared_mixes', 'payload', 'update') as droit_modifier,
  exists (select 1 from pg_policies
           where schemaname = 'public' and tablename = 'shared_mixes'
             and policyname = 'shared_mixes_update_own') as regle_proprietaire;
