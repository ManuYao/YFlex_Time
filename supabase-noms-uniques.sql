-- Noms de mix UNIQUES dans tout le fil public (sans tenir compte des majuscules
-- ni des espaces autour). À coller dans Supabase > SQL Editor, une seule fois.
--
-- Avant : « unique (owner_id, name) » = un nom par personne, donc deux sportifs
-- pouvaient publier chacun un « Full Body ». Maintenant le nom est pris pour de
-- bon, et l'app (qui le vérifie déjà avant d'envoyer) n'est plus la seule garde.
--
-- ⚠️ Si deux mix publiés portent DÉJÀ le même nom, la création de l'index échoue
-- (message ci-dessous) : l'éditeur choisit alors lequel renommer ou retirer
-- (table shared_mixes), puis relance ce script.

do $$
declare
  dup text;
begin
  select string_agg(n, ', ') into dup
  from (
    select lower(btrim(name)) as n
    from public.shared_mixes
    group by lower(btrim(name))
    having count(*) > 1
  ) d;

  if dup is not null then
    raise exception 'Noms déjà en double dans shared_mixes : %. Renomme ou retire-en un, puis relance.', dup;
  end if;
end $$;

create unique index if not exists shared_mixes_name_unique
  on public.shared_mixes (lower(btrim(name)));
