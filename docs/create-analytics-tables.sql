-- Analytics event tables for Product + API telemetry
-- Run in Supabase SQL Editor

create extension if not exists pgcrypto;

create table if not exists public.product_events (
  id bigserial primary key,
  event_id uuid not null default gen_random_uuid(),
  event_name text not null,
  event_time_utc timestamptz not null default now(),
  anonymous_id text not null,
  user_id uuid null references auth.users(id) on delete set null,
  session_id text not null,
  is_authenticated boolean not null default false,
  page_path text null,
  referrer text null,
  utm_source text null,
  utm_medium text null,
  utm_campaign text null,
  utm_content text null,
  utm_term text null,
  feature_name text null,
  action text null,
  properties jsonb not null default '{}'::jsonb,
  app_version text null,
  country text null,
  ip_address text null,
  user_agent text null,
  env text not null default 'production',
  created_at timestamptz not null default now()
);

create unique index if not exists idx_product_events_event_id on public.product_events(event_id);
create index if not exists idx_product_events_time on public.product_events(event_time_utc);
create index if not exists idx_product_events_event_name on public.product_events(event_name);
create index if not exists idx_product_events_user_time on public.product_events(user_id, event_time_utc);
create index if not exists idx_product_events_anon_time on public.product_events(anonymous_id, event_time_utc);
create index if not exists idx_product_events_session_time on public.product_events(session_id, event_time_utc);

alter table public.product_events enable row level security;

drop policy if exists "Allow insert product_events for anon/auth" on public.product_events;
create policy "Allow insert product_events for anon/auth"
on public.product_events for insert
to anon, authenticated
with check (true);

drop policy if exists "Allow select product_events for authenticated" on public.product_events;
create policy "Allow select product_events for authenticated"
on public.product_events for select
to authenticated
using (true);

create table if not exists public.api_events (
  id bigserial primary key,
  event_time_utc timestamptz not null default now(),
  route text not null,
  method text not null,
  status_code integer not null,
  latency_ms integer not null,
  success boolean not null,
  user_id uuid null references auth.users(id) on delete set null,
  error_message text null,
  meta jsonb not null default '{}'::jsonb,
  env text not null default 'production',
  created_at timestamptz not null default now()
);

create index if not exists idx_api_events_time on public.api_events(event_time_utc);
create index if not exists idx_api_events_route_time on public.api_events(route, event_time_utc);
create index if not exists idx_api_events_status_time on public.api_events(status_code, event_time_utc);
create index if not exists idx_api_events_user_time on public.api_events(user_id, event_time_utc);

alter table public.api_events enable row level security;

drop policy if exists "Allow insert api_events for anon/auth" on public.api_events;
create policy "Allow insert api_events for anon/auth"
on public.api_events for insert
to anon, authenticated
with check (true);

drop policy if exists "Allow select api_events for authenticated" on public.api_events;
create policy "Allow select api_events for authenticated"
on public.api_events for select
to authenticated
using (true);

-- Daily core KPI view for Tableau
create or replace view public.v_daily_product_kpis as
with daily as (
  select
    date_trunc('day', event_time_utc)::date as event_date,
    anonymous_id,
    user_id,
    event_name,
    session_id
  from public.product_events
)
select
  event_date,
  count(distinct anonymous_id) filter (where user_id is null) as anonymous_visitors,
  count(distinct user_id) filter (where user_id is not null) as authenticated_users,
  count(distinct user_id) filter (where event_name = 'signup_completed') as signup_completed_users,
  count(distinct user_id) filter (where event_name = 'onboarding_completed') as onboarding_completed_users,
  count(*) filter (where event_name = 'page_view') as page_views,
  count(*) filter (where event_name = 'job_action') as job_actions,
  count(*) filter (where event_name = 'application_status_changed') as application_status_changes,
  count(*) filter (where event_name like 'ai\_%\_failed' escape '\') as ai_fail_events,
  count(distinct session_id) as sessions
from daily
group by event_date
order by event_date desc;

-- WAU/MAU helper view
create or replace view public.v_active_users as
with daily_users as (
  select
    date_trunc('day', event_time_utc)::date as event_date,
    user_id
  from public.product_events
  where user_id is not null
  group by 1, 2
)
select
  d.event_date,
  (select count(*) from daily_users x where x.event_date = d.event_date) as dau,
  (select count(distinct x.user_id) from daily_users x where x.event_date between d.event_date - interval '6 day' and d.event_date) as wau,
  (select count(distinct x.user_id) from daily_users x where x.event_date between d.event_date - interval '29 day' and d.event_date) as mau
from (select distinct event_date from daily_users) d
order by d.event_date desc;

