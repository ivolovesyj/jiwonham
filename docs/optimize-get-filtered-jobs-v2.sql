-- ============================================================
-- Long-term fix for get_filtered_jobs timeout
--
-- Root cause summary
-- 1) The app calls the 7-argument get_filtered_jobs(...) RPC.
-- 2) The current function is a PL/pgSQL wrapper around one SELECT, which can
--    lead PostgreSQL to reuse a poor generic plan for highly variable filters.
-- 3) Expensive predicates (location substring, work style JSON expansion)
--    are evaluated against too many candidate rows.
-- 4) The route requests a large candidate pool, so a bad plan hits statement
--    timeout before returning any row.
--
-- This migration fixes the root cause by:
-- 1) Replacing the function with a LANGUAGE sql version.
-- 2) Keeping "active + not expired" as an early hard filter.
-- 3) Using index-friendly predicates first, then applying expensive filters.
-- 4) Adding a trigram index for location substring matching.
-- ============================================================

create extension if not exists pg_trgm;

create index if not exists idx_jobs_depth_twos_gin
  on public.jobs using gin(depth_twos jsonb_ops)
  where is_active = true;

create index if not exists idx_jobs_depth_ones_gin
  on public.jobs using gin(depth_ones jsonb_ops)
  where is_active = true;

create index if not exists idx_jobs_employee_types_gin
  on public.jobs using gin(employee_types jsonb_ops)
  where is_active = true;

create index if not exists idx_jobs_company_type_active
  on public.jobs(company_type)
  where is_active = true;

create index if not exists idx_jobs_career_min_active
  on public.jobs(career_min)
  where is_active = true;

create index if not exists idx_jobs_education_active
  on public.jobs(education)
  where is_active = true;

create index if not exists idx_jobs_end_date_active
  on public.jobs(end_date desc)
  where is_active = true;

create index if not exists idx_jobs_crawled_at_active
  on public.jobs(crawled_at desc)
  where is_active = true;

create index if not exists idx_jobs_location_trgm_active
  on public.jobs using gin(location gin_trgm_ops)
  where is_active = true and location is not null;

drop function if exists get_filtered_jobs(text[], text[], integer, text[], text[], text[], text[]);

create or replace function get_filtered_jobs(
  p_job_types text[] default null,
  p_locations text[] default null,
  p_limit integer default 200,
  p_career_levels text[] default null,
  p_work_styles text[] default null,
  p_company_types text[] default null,
  p_education text[] default null
)
returns table(
  id text,
  source text,
  company text,
  company_image text,
  company_type text,
  title text,
  regions jsonb,
  location text,
  career_min integer,
  career_max integer,
  employee_types jsonb,
  deadline_type text,
  end_date date,
  depth_ones jsonb,
  depth_twos jsonb,
  keywords jsonb,
  views integer,
  detail jsonb,
  original_created_at text,
  last_modified_at text,
  crawled_at timestamptz,
  is_active boolean,
  education text,
  redirect_url text,
  affiliate text
)
language sql
stable
security invoker
as $$
  with base as (
    select
      j.id,
      j.source,
      j.company,
      j.company_image,
      j.company_type,
      j.title,
      j.regions,
      j.location,
      j.career_min,
      j.career_max,
      j.employee_types,
      j.deadline_type,
      j.end_date,
      j.depth_ones,
      j.depth_twos,
      j.keywords,
      j.views,
      j.detail,
      j.original_created_at::text as original_created_at,
      j.last_modified_at::text as last_modified_at,
      j.crawled_at,
      j.is_active,
      j.education,
      j.redirect_url,
      j.affiliate
    from public.jobs j
    where j.is_active = true
      and (j.end_date is null or j.end_date >= current_date)
      and (
        p_job_types is null
        or array_length(p_job_types, 1) is null
        or j.depth_twos ?| p_job_types
        or j.depth_ones ?| p_job_types
      )
      and (
        p_company_types is null
        or array_length(p_company_types, 1) is null
        or (
          j.company_type is not null
          and j.company_type <> '기타'
          and j.company_type = any(p_company_types)
        )
      )
      and (
        p_education is null
        or array_length(p_education, 1) is null
        or (
          j.education is not null
          and j.education = any(p_education)
        )
      )
      and (
        p_career_levels is null
        or array_length(p_career_levels, 1) is null
        or (
          ('신입' = any(p_career_levels) and (j.career_min is null or j.career_min = 0))
          or ('경력무관' = any(p_career_levels) and (j.career_min is null or j.career_min = 0))
          or ('1-3' = any(p_career_levels) and (j.career_min is null or j.career_min <= 3))
          or ('3-5' = any(p_career_levels) and (j.career_min is not null and j.career_min between 1 and 5))
          or ('5-10' = any(p_career_levels) and (j.career_min is not null and j.career_min between 3 and 10))
          or ('10+' = any(p_career_levels) and j.career_min is not null and j.career_min >= 10)
        )
      )
  )
  select
    b.id,
    b.source,
    b.company,
    b.company_image,
    b.company_type,
    b.title,
    b.regions,
    b.location,
    b.career_min,
    b.career_max,
    b.employee_types,
    b.deadline_type,
    b.end_date,
    b.depth_ones,
    b.depth_twos,
    b.keywords,
    b.views,
    b.detail,
    b.original_created_at,
    b.last_modified_at,
    b.crawled_at,
    b.is_active,
    b.education,
    b.redirect_url,
    b.affiliate
  from base b
  where (
      p_locations is null
      or array_length(p_locations, 1) is null
      or b.location is null
      or exists (
        select 1
        from unnest(p_locations) loc
        where b.location ilike '%' || loc || '%'
           or loc ilike '%' || b.location || '%'
      )
    )
    and (
      p_work_styles is null
      or array_length(p_work_styles, 1) is null
      or (
        b.employee_types is not null
        and jsonb_array_length(b.employee_types) > 0
        and exists (
          select 1
          from jsonb_array_elements_text(b.employee_types) raw_et
          cross join lateral (
            select case upper(raw_et)
              when 'CONTRACTOR' then '프리랜서'
              when 'TEMPORARY' then '계약직'
              else raw_et
            end as normalized_et
          ) mapped
          cross join unnest(p_work_styles) ws
          where mapped.normalized_et ilike '%' || ws || '%'
             or ws ilike '%' || mapped.normalized_et || '%'
        )
      )
    )
  order by b.crawled_at desc
  limit coalesce(p_limit, 200);
$$;

grant execute on function get_filtered_jobs(text[], text[], integer, text[], text[], text[], text[])
to anon, authenticated;

-- Optional validation
-- explain analyze
-- select count(*)
-- from get_filtered_jobs(
--   array['인사기획','평가_보상','HRD_조직문화','리크루터_헤드헌터','노무관리','총무_비서','기타HR_총무'],
--   array['서울'],
--   200,
--   array['신입'],
--   array['인턴','정규직'],
--   null,
--   null
-- );

