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

create or replace function public.can_admin_team(target_team_id uuid)
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
      and tm.is_team_admin = true
      and tm.is_active = true
  )
  or exists (
    select 1
    from teams t
    join club_members cm on cm.club_id = t.club_id
    where t.id = target_team_id
      and cm.user_id = auth.uid()
      and cm.is_club_admin = true
      and coalesce(cm.status, '') in ('active', 'approved')
  );
$$;

grant execute on function public.can_admin_team(uuid) to authenticated;

create or replace function public.save_iup_plan_editor(
  p_plan_id uuid,
  p_title text,
  p_period_start date,
  p_period_end date,
  p_now_state text,
  p_other_notes text,
  p_review_count integer,
  p_cycle_type text,
  p_cycle_label text,
  p_status text,
  p_review_points jsonb,
  p_self_assessment jsonb,
  p_short_goals jsonb,
  p_long_goals jsonb
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_short_goal jsonb;
  v_long_goal jsonb;
  v_short_index integer := 0;
  v_long_index integer := 0;
begin
  if jsonb_typeof(coalesce(p_short_goals, '[]'::jsonb)) <> 'array' then
    raise exception 'p_short_goals must be a JSON array';
  end if;

  if jsonb_typeof(coalesce(p_long_goals, '[]'::jsonb)) <> 'array' then
    raise exception 'p_long_goals must be a JSON array';
  end if;

  update iup_plans
  set
    title = coalesce(nullif(trim(p_title), ''), 'IUP Plan'),
    period_start = p_period_start,
    period_end = p_period_end,
    now_state = coalesce(p_now_state, ''),
    other_notes = coalesce(p_other_notes, ''),
    review_count = greatest(1, coalesce(p_review_count, 3)),
    cycle_type = p_cycle_type,
    cycle_label = coalesce(p_cycle_label, ''),
    status = case
      when p_status in ('active', 'completed', 'archived') then p_status
      else status
    end,
    review_points = coalesce(p_review_points, '[]'::jsonb),
    self_assessment = coalesce(p_self_assessment, '[]'::jsonb),
    updated_at = now()
  where id = p_plan_id
    and created_by = auth.uid();

  if not found then
    raise exception 'IUP not found or forbidden';
  end if;

  delete from iup_goals where plan_id = p_plan_id;

  for v_short_goal in
    select value from jsonb_array_elements(coalesce(p_short_goals, '[]'::jsonb))
  loop
    insert into iup_goals (plan_id, horizon, order_index, title, description, status)
    values (
      p_plan_id,
      'short',
      v_short_index,
      coalesce(nullif(trim(v_short_goal->>'title'), ''), format('Kortsiktigt mål %s', v_short_index + 1)),
      coalesce(v_short_goal->>'description', ''),
      'todo'
    );
    v_short_index := v_short_index + 1;
  end loop;

  for v_long_goal in
    select value from jsonb_array_elements(coalesce(p_long_goals, '[]'::jsonb))
  loop
    insert into iup_goals (plan_id, horizon, order_index, title, description, status)
    values (
      p_plan_id,
      'long',
      v_long_index,
      coalesce(nullif(trim(v_long_goal->>'title'), ''), format('Långsiktigt mål %s', v_long_index + 1)),
      coalesce(v_long_goal->>'description', ''),
      'todo'
    );
    v_long_index := v_long_index + 1;
  end loop;
end;
$$;

grant execute on function public.save_iup_plan_editor(
  uuid,
  text,
  date,
  date,
  text,
  text,
  integer,
  text,
  text,
  text,
  jsonb,
  jsonb,
  jsonb,
  jsonb
) to authenticated;

create table if not exists iup_plans (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  player_id uuid not null references team_members(id) on delete cascade,
  title text not null default 'IUP Plan',
  status text not null default 'active',
  period_start date,
  period_end date,
  now_state text not null default '',
  other_notes text not null default '',
  review_count integer not null default 3,
  cycle_type text not null default 'season',
  cycle_label text not null default '',
  review_points jsonb not null default '[]'::jsonb,
  self_assessment jsonb not null default '[]'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint iup_plans_status_check
    check (status in ('active', 'completed', 'archived')),
  constraint iup_plans_review_count_check
    check (review_count >= 1 and review_count <= 52),
  constraint iup_plans_cycle_type_check
    check (cycle_type in ('year', 'season'))
);

create index if not exists iup_plans_team_id_idx on iup_plans(team_id);
create index if not exists iup_plans_player_id_idx on iup_plans(player_id);

create table if not exists iup_goals (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references iup_plans(id) on delete cascade,
  horizon text not null default 'short',
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
  constraint iup_goals_horizon_check
    check (horizon in ('short', 'long')),
  constraint iup_goals_status_check
    check (status in ('todo', 'in_progress', 'done'))
);

alter table if exists iup_plans add column if not exists now_state text not null default '';
alter table if exists iup_plans add column if not exists other_notes text not null default '';
alter table if exists iup_plans add column if not exists review_count integer not null default 3;
alter table if exists iup_plans add column if not exists cycle_type text not null default 'season';
alter table if exists iup_plans add column if not exists cycle_label text not null default '';
alter table if exists iup_plans add column if not exists review_points jsonb not null default '[]'::jsonb;
alter table if exists iup_plans add column if not exists self_assessment jsonb not null default '[]'::jsonb;
update iup_plans set status = 'active' where status = 'draft';
alter table if exists iup_plans drop constraint if exists iup_plans_status_check;
alter table if exists iup_plans drop constraint if exists iup_plans_review_count_check;
alter table if exists iup_plans
  add constraint iup_plans_status_check
  check (status in ('active', 'completed', 'archived'));
alter table if exists iup_plans
  add constraint iup_plans_review_count_check
  check (review_count >= 1 and review_count <= 52);
do $$
declare
  v_player_fk text;
begin
  select c.conname
  into v_player_fk
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'iup_plans'
    and c.contype = 'f'
    and pg_get_constraintdef(c.oid) like '%(player_id)%';

  if v_player_fk is not null then
    execute format('alter table public.iup_plans drop constraint %I', v_player_fk);
  end if;
end $$;
alter table if exists iup_plans
  add constraint iup_plans_player_id_fkey
  foreign key (player_id) references team_members(id) on delete cascade;
alter table if exists iup_goals add column if not exists horizon text not null default 'short';

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

create table if not exists iup_goal_suggestions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  horizon text not null,
  title text not null,
  description text not null default '',
  groups jsonb not null default '["all"]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint iup_goal_suggestions_horizon_check
    check (horizon in ('short', 'long'))
);

create index if not exists iup_goal_suggestions_owner_id_idx on iup_goal_suggestions(owner_id);
create unique index if not exists iup_goal_suggestions_owner_unique_idx
  on iup_goal_suggestions(owner_id, horizon, lower(title));

alter table iup_plans enable row level security;
alter table iup_goals enable row level security;
alter table iup_checkins enable row level security;
alter table iup_goal_suggestions enable row level security;

drop policy if exists "Users can view team IUP plans" on iup_plans;
drop policy if exists "Users can insert team IUP plans" on iup_plans;
drop policy if exists "Users can update team IUP plans" on iup_plans;
drop policy if exists "Users can delete team IUP plans" on iup_plans;

create policy "Users can view team IUP plans"
on iup_plans
for select
using (public.can_admin_team(team_id));

create policy "Users can insert team IUP plans"
on iup_plans
for insert
with check (public.can_admin_team(team_id) and created_by = auth.uid());

create policy "Users can update team IUP plans"
on iup_plans
for update
using (created_by = auth.uid())
with check (created_by = auth.uid() and public.can_admin_team(team_id));

create policy "Users can delete team IUP plans"
on iup_plans
for delete
using (created_by = auth.uid());

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
      and public.can_admin_team(p.team_id)
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
      and p.created_by = auth.uid()
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
      and p.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from iup_plans p
    where p.id = iup_goals.plan_id
      and p.created_by = auth.uid()
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
      and p.created_by = auth.uid()
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
      and public.can_admin_team(p.team_id)
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
      and public.can_admin_team(p.team_id)
  )
);

create policy "Users can delete own IUP checkins"
on iup_checkins
for delete
using (author_id = auth.uid());

drop policy if exists "Users can view own goal suggestions" on iup_goal_suggestions;
drop policy if exists "Users can insert own goal suggestions" on iup_goal_suggestions;
drop policy if exists "Users can update own goal suggestions" on iup_goal_suggestions;
drop policy if exists "Users can delete own goal suggestions" on iup_goal_suggestions;

create policy "Users can view own goal suggestions"
on iup_goal_suggestions
for select
using (owner_id = auth.uid());

create policy "Users can insert own goal suggestions"
on iup_goal_suggestions
for insert
with check (owner_id = auth.uid());

create policy "Users can update own goal suggestions"
on iup_goal_suggestions
for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "Users can delete own goal suggestions"
on iup_goal_suggestions
for delete
using (owner_id = auth.uid());

