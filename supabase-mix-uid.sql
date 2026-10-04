-- Clé unique d'un mix publié (v16.8.0) : un même mix ne peut plus être publié
-- deux fois par la même personne, même après l'avoir renommé.
--
-- Chaque mix porte une clé aléatoire unique (uuid), posée à sa création et qui
-- ne change jamais. À la publication, l'app la range dans la charge utile
-- (payload -> 'u'). Ce script rend cette clé unique PAR AUTEUR : la base refuse
-- une deuxième publication du même mix, au lieu de laisser deux lignes dans le fil.
--
-- Rien à changer côté colonnes : l'index porte sur la clé DANS la charge utile,
-- donc l'app marche avant comme après ce script (avant : seul le nom empêche un
-- doublon, comme jusqu'ici).
--
-- À coller dans Supabase > SQL Editor > New query, puis cliquer sur Run.
-- Sans danger si tu le relances : rien n'est écrasé ni supprimé. Les mix déjà
-- publiés (sans clé) ne sont pas concernés.

create unique index if not exists shared_mixes_owner_mix_uid
  on public.shared_mixes (owner_id, (payload ->> 'u'))
  where payload ? 'u';
