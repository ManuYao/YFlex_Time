-- Vérification : quels fichiers SQL sont VRAIMENT en place dans ce projet ?
-- À coller dans Supabase > SQL Editor > New query, puis cliquer sur Run.
-- Ne modifie RIEN : il ne fait que lire.
--
-- Le tableau « Results » affiche une ligne par fichier :
--   en_place = true   -> rien à refaire pour ce fichier ;
--   en_place = false  -> colle ce fichier (dans l'ordre de la colonne « ordre »).
-- Tous les fichiers sont sans danger si tu les relances.

select ordre, fichier, en_place
from (
  select 1 as ordre, 'supabase-historique.sql' as fichier,
         to_regclass('public.workout_sessions') is not null as en_place
  union all
  select 2, 'supabase-fil-public.sql',
         to_regclass('public.shared_mixes') is not null
         and to_regclass('public.mix_ratings') is not null
         and to_regclass('public.mix_reports') is not null
  union all
  select 3, 'supabase-mix-update.sql',
         exists (select 1 from pg_policies
                  where schemaname = 'public' and tablename = 'shared_mixes'
                    and policyname = 'shared_mixes_update_own')
  union all
  select 4, 'supabase-mix-uid.sql',
         to_regclass('public.shared_mixes_owner_mix_uid') is not null
  union all
  select 5, 'supabase-noms-uniques.sql',
         to_regclass('public.shared_mixes_name_unique') is not null
  union all
  select 6, 'supabase-durcissement.sql',
         to_regprocedure('public.delete_my_account()') is not null
         and to_regprocedure('public.recompute_mix_rating(uuid)') is not null
  union all
  select 7, 'supabase-pseudos.sql',
         to_regclass('public.pseudos') is not null
         and to_regprocedure('public.propagate_pseudo()') is not null
  union all
  select 8, 'supabase-commentaires.sql',
         to_regclass('public.mix_comments') is not null
         and to_regprocedure('public.enforce_comment_rules()') is not null
) t
order by ordre;
