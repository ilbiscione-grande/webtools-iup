-- IUP (Individual Development Plan) schema
-- Run this in Supabase SQL editor after schema.sql.

-- Helper: access check without RLS recursion.
create or replace function public.can_access_team(target_team_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from teams t
    where t.id = target_team_id
      and t.owner_id = auth.uid()
  )
  or exists (
    select 1
    from team_members tm
    where tm.team_id = target_team_id
      and tm.user_id = auth.uid()
  );
$$;

grant execute on function public.can_access_team(uuid) to authenticated;

create table if not exists iup_plans (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  player_id uuid not null references team_players(id) on delete cascade,
  title text not null default 'IUP Plan',
  status text not null default 'draft',
  period_start date,
  period_end date,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint iup_plans_status_check
    check (status in ('draft', 'active', 'completed', 'archived'))
);

create index if not exists iup_plans_team_id_idx on iup_plans(team_id);
create index if not exists iup_plans_player_id_idx on iup_plans(player_id);

create table if not exists iup_goals (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references iup_plans(id) on delete cascade,
  order_index integer not null default 0,
  title text not null,
  description text not null default '',
  metric text not null default '',
  baseline text not null default '',
  target text not null default '',
  target_date date,
  status text not null default 'todo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint iup_goals_status_check
    check (status in ('todo', 'in_progress', 'done'))
);

create index if not exists iup_goals_plan_id_idx on iup_goals(plan_id);

create table if not exists iup_checkins (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references iup_plans(id) on delete cascade,
  goal_id uuid references iup_goals(id) on delete set null,
  author_id uuid not null references auth.users(id) on delete restrict,
  author_role text not null default 'coach',
  rating integer,
  note text not null default '',
  created_at timestamptz not null default now(),
  constraint iup_checkins_author_role_check
    check (author_role in ('coach', 'player', 'other')),
  constraint iup_checkins_rating_check
    check (rating is null or (rating >= 1 and rating <= 5))
);

create index if not exists iup_checkins_plan_id_idx on iup_checkins(plan_id);

-- Optional bridge: connect a team player profile to an auth user.
create table if not exists team_player_accounts (
  id uuid primary key default gen_random_uuid(),
  team_player_id uuid not null unique references team_players(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  invited_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists team_player_accounts_user_id_idx on team_player_accounts(user_id);

alter table iup_plans enable row level security;
alter table iup_goals enable row level security;
alter table iup_checkins enable row level security;
alter table team_player_accounts enable row level security;

drop policy if exists "Users can view team IUP plans" on iup_plans;
drop policy if exists "Users can insert team IUP plans" on iup_plans;
drop policy if exists "Users can update team IUP plans" on iup_plans;
drop policy if exists "Users can delete team IUP plans" on iup_plans;

create policy "Users can view team IUP plans"
on iup_plans
for select
using (public.can_access_team(team_id));

create policy "Users can insert team IUP plans"
on iup_plans
for insert
with check (public.can_access_team(team_id) and created_by = auth.uid());

create policy "Users can update team IUP plans"
on iup_plans
for update
using (public.can_access_team(team_id))
with check (public.can_access_team(team_id));

create policy "Users can delete team IUP plans"
on iup_plans
for delete
using (public.can_access_team(team_id));

drop policy if exists "Users can view team IUP goals" on iup_goals;
drop policy if exists "Users can insert team IUP goals" on iup_goals;
drop policy if exists "Users can update team IUP goals" on iup_goals;
drop policy if exists "Users can delete team IUP goals" on iup_goals;

create policy "Users can view team IUP goals"
on iup_goals
for select
using (
  exists (
    select 1
    from iup_plans p
    where p.id = iup_goals.plan_id
      and public.can_access_team(p.team_id)
  )
);

create policy "Users can insert team IUP goals"
on iup_goals
for insert
with check (
  exists (
    select 1
    from iup_plans p
    where p.id = iup_goals.plan_id
      and public.can_access_team(p.team_id)
  )
);

create policy "Users can update team IUP goals"
on iup_goals
for update
using (
  exists (
    select 1
    from iup_plans p
    where p.id = iup_goals.plan_id
      and public.can_access_team(p.team_id)
  )
)
with check (
  exists (
    select 1
    from iup_plans p
    where p.id = iup_goals.plan_id
      and public.can_access_team(p.team_id)
  )
);

create policy "Users can delete team IUP goals"
on iup_goals
for delete
using (
  exists (
    select 1
    from iup_plans p
    where p.id = iup_goals.plan_id
      and public.can_access_team(p.team_id)
  )
);

drop policy if exists "Users can view team IUP checkins" on iup_checkins;
drop policy if exists "Users can insert team IUP checkins" on iup_checkins;
drop policy if exists "Users can delete own IUP checkins" on iup_checkins;

create policy "Users can view team IUP checkins"
on iup_checkins
for select
using (
  exists (
    select 1
    from iup_plans p
    where p.id = iup_checkins.plan_id
      and public.can_access_team(p.team_id)
  )
);

create policy "Users can insert team IUP checkins"
on iup_checkins
for insert
with check (
  author_id = auth.uid()
  and exists (
    select 1
    from iup_plans p
    where p.id = iup_checkins.plan_id
      and public.can_access_team(p.team_id)
  )
);

create policy "Users can delete own IUP checkins"
on iup_checkins
for delete
using (author_id = auth.uid());

drop policy if exists "Users can view player account links" on team_player_accounts;
drop policy if exists "Owners can manage player account links" on team_player_accounts;
drop policy if exists "Players can view own account links" on team_player_accounts;

create policy "Users can view player account links"
on team_player_accounts
for select
using (
  exists (
    select 1
    from team_players tp
    where tp.id = team_player_accounts.team_player_id
      and public.can_access_team(tp.team_id)
  )
  or user_id = auth.uid()
);

create policy "Owners can manage player account links"
on team_player_accounts
for all
using (
  exists (
    select 1
    from team_players tp
    join teams t on t.id = tp.team_id
    where tp.id = team_player_accounts.team_player_id
      and t.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from team_players tp
    join teams t on t.id = tp.team_id
    where tp.id = team_player_accounts.team_player_id
      and t.owner_id = auth.uid()
  )
);
