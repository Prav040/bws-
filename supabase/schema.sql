-- ============================================================
-- BWS+ Fitness – Supabase Schema
-- Im Supabase-Dashboard ausführen: SQL Editor → New query → Run
-- ============================================================

-- 1) profiles-Tabelle (1:1 mit auth.users)
create table if not exists public.profiles (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  username        text not null,
  target_goal     text not null default 'Muscle Gain'
                    check (target_goal in ('Muscle Gain', 'Fat Loss', 'Recomposition')),
  starting_weight double precision not null default 0,
  current_weight  double precision not null default 0,
  height          double precision not null default 0,
  created_at      timestamptz not null default now()
);

-- 2) Row Level Security aktivieren
alter table public.profiles enable row level security;

-- 3) Policies: Nutzer darf nur das eigene Profil sehen/ändern/anlegen
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = user_id);

-- 4) Trigger: legt beim Registrieren automatisch ein Profil an
--    (liest den Username aus den user_metadata, die der authService setzt)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'Nutzer')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
