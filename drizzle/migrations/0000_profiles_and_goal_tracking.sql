create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

create table public.goal_settings (
  user_id uuid primary key,
  goal numeric not null default 600 check (goal > 0),
  daily_value numeric not null default 20 check (daily_value > 0),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.goal_settings to authenticated;
grant all on public.goal_settings to service_role;
alter table public.goal_settings enable row level security;
create policy "settings_select_own" on public.goal_settings for select using (auth.uid() = user_id);
create policy "settings_insert_own" on public.goal_settings for insert with check (auth.uid() = user_id);
create policy "settings_update_own" on public.goal_settings for update using (auth.uid() = user_id);
create policy "settings_delete_own" on public.goal_settings for delete using (auth.uid() = user_id);

create table public.monthly_progress (
  user_id uuid not null,
  month text not null,
  completed boolean[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, month)
);
grant select, insert, update, delete on public.monthly_progress to authenticated;
grant all on public.monthly_progress to service_role;
alter table public.monthly_progress enable row level security;
create policy "progress_select_own" on public.monthly_progress for select using (auth.uid() = user_id);
create policy "progress_insert_own" on public.monthly_progress for insert with check (auth.uid() = user_id);
create policy "progress_update_own" on public.monthly_progress for update using (auth.uid() = user_id);
create policy "progress_delete_own" on public.monthly_progress for delete using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();