-- Suppression de compte depuis l'app + petit correctif sur les notes (v15.7.0).
-- À coller dans Supabase > SQL Editor > New query, puis cliquer sur Run.
-- À faire APRÈS supabase-historique.sql et supabase-fil-public.sql.
-- Sans danger si tu le relances : rien n'est supprimé, ce sont deux fonctions
-- qui sont (re)créées.

-- ---------------------------------------------------------------------------
-- 1. Supprimer son compte (Paramètres > Compte > Supprimer mon compte)
-- ---------------------------------------------------------------------------
-- Supprime l'utilisateur connecté. Tout ce qui lui est rattaché part avec lui,
-- grâce aux « on delete cascade » déjà en place : historique synchronisé,
-- mixes publiés (et les notes reçues dessus), notes et signalements donnés.
-- « security definer » : les utilisateurs n'ont pas le droit d'écrire dans
-- auth.users, cette fonction le fait pour eux, et seulement pour EUX-MÊMES
-- (auth.uid() vient du jeton de connexion, on ne peut pas le falsifier).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Non connecté';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

-- Réservée aux personnes connectées (jamais aux visiteurs anonymes).
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Notes : recalculer AUSSI l'ancien mix si une note change de mix
-- ---------------------------------------------------------------------------
-- Avant, seul le nouveau mix était recalculé : l'ancien gardait une moyenne
-- périmée jusqu'à la prochaine note. L'app ne déplace jamais une note, mais
-- rien n'empêchait quelqu'un de le faire à la main.
create or replace function public.recompute_mix_rating(target uuid)
returns void
language sql
security definer
set search_path = public
as $$
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
$$;

-- Fonction interne : personne ne doit pouvoir l'appeler directement.
revoke all on function public.recompute_mix_rating(uuid) from public, anon, authenticated;

create or replace function public.refresh_mix_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    perform public.recompute_mix_rating(old.mix_id);
  else
    perform public.recompute_mix_rating(new.mix_id);
    if TG_OP = 'UPDATE' and old.mix_id is distinct from new.mix_id then
      perform public.recompute_mix_rating(old.mix_id);
    end if;
  end if;
  return null;
end;
$$;

revoke all on function public.refresh_mix_rating() from public;
