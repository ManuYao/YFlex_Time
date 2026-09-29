-- Table des séances synchronisées (historique dans le cloud).
-- À coller dans Supabase > SQL Editor > New query, puis cliquer sur Run.
-- Sans danger si tu le relances : rien n'est écrasé.

create table if not exists public.workout_sessions (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  id         text        not null,
  data       jsonb       not null default '{}'::jsonb,
  deleted    boolean     not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Chacun ne voit et ne modifie que SES séances.
alter table public.workout_sessions enable row level security;

drop policy if exists "sessions_own_rows" on public.workout_sessions;
create policy "sessions_own_rows"
  on public.workout_sessions
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
