-- Modifier un mix déjà publié (v16.3.0).
--
-- Avant : une fois publié, un mix ne pouvait plus être corrigé (nom, faute de
-- frappe, blocs). L'app contourne en retirant puis republiant — mais les
-- étoiles reçues repartent alors de zéro.
-- Après ce script : l'auteur modifie SON mix sur place, les étoiles et la date
-- de publication sont gardées.
--
-- À coller dans Supabase > SQL Editor > New query, puis cliquer sur Run.
-- Sans danger si tu le relances : rien n'est écrasé ni supprimé. Tant qu'il n'a
-- pas été lancé, l'app marche quand même (elle remplace le mix, étoiles à zéro).

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
