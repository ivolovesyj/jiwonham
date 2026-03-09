-- ============================================================
-- Long-term fix v3: force custom planning per call
--
-- Why this exists:
-- - EXPLAIN ANALYZE with literals shows ~2.4s.
-- - The same function through Supabase RPC times out around ~8s.
-- - This strongly suggests a generic prepared plan issue on the RPC path.
--
-- Strategy:
-- - Keep the same 7-argument signature.
-- - Switch to PL/pgSQL + EXECUTE so PostgreSQL replans per call.
-- - Only append filters that are actually present.
-- - Preserve user-facing semantics.
-- ============================================================

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
language plpgsql
stable
security invoker
as $$
declare
  sql text;
begin
  sql := '
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
  ';

  if p_job_types is not null and array_length(p_job_types, 1) is not null then
    sql := sql || '
      and (
        j.depth_twos ?| $1
        or j.depth_ones ?| $1
      )
    ';
  end if;

  if p_company_types is not null and array_length(p_company_types, 1) is not null then
    sql := sql || '
      and (
        j.company_type is not null
        and j.company_type <> ''기타''
        and j.company_type = any($6)
      )
    ';
  end if;

  if p_education is not null and array_length(p_education, 1) is not null then
    sql := sql || '
      and (
        j.education is not null
        and j.education = any($7)
      )
    ';
  end if;

  if p_career_levels is not null and array_length(p_career_levels, 1) is not null then
    sql := sql || '
      and (
        (''신입'' = any($4) and (j.career_min is null or j.career_min = 0))
        or (''경력무관'' = any($4) and (j.career_min is null or j.career_min = 0))
        or (''1-3'' = any($4) and (j.career_min is null or j.career_min <= 3))
        or (''3-5'' = any($4) and (j.career_min is not null and j.career_min between 1 and 5))
        or (''5-10'' = any($4) and (j.career_min is not null and j.career_min between 3 and 10))
        or (''10+'' = any($4) and j.career_min is not null and j.career_min >= 10)
      )
    ';
  end if;

  if p_locations is not null and array_length(p_locations, 1) is not null then
    sql := sql || '
      and (
        j.location is null
        or exists (
          select 1
          from unnest($2) loc
          where j.location ilike ''%'' || loc || ''%''
             or loc ilike ''%'' || j.location || ''%''
        )
      )
    ';
  end if;

  if p_work_styles is not null and array_length(p_work_styles, 1) is not null then
    sql := sql || '
      and (
        j.employee_types is not null
        and jsonb_array_length(j.employee_types) > 0
        and exists (
          select 1
          from jsonb_array_elements_text(j.employee_types) raw_et
          cross join lateral (
            select case upper(raw_et)
              when ''CONTRACTOR'' then ''프리랜서''
              when ''TEMPORARY'' then ''계약직''
              else raw_et
            end as normalized_et
          ) mapped
          cross join unnest($5) ws
          where mapped.normalized_et ilike ''%'' || ws || ''%''
             or ws ilike ''%'' || mapped.normalized_et || ''%''
        )
      )
    ';
  end if;

  sql := sql || '
    order by j.crawled_at desc
    limit coalesce($3, 200)
  ';

  return query execute sql
    using p_job_types, p_locations, p_limit, p_career_levels, p_work_styles, p_company_types, p_education;
end;
$$;

grant execute on function get_filtered_jobs(text[], text[], integer, text[], text[], text[], text[])
to anon, authenticated;

-- Validation query
-- explain analyze
-- select count(*)
-- from get_filtered_jobs(
--   array['서버_백엔드','프론트엔드','웹풀스택','안드로이드','iOS','크로스플랫폼','DBA','DevOps_SRE','시스템_네트워크','시스템소프트웨어','소프트웨어엔지니어','정보보호_보안','임베디드소프트웨어','로봇SW','QA_테스트','사물인터넷_IoT','응용프로그램','블록체인','개발PM','웹퍼블리싱','VR_AR_3D','ERP_SAP','그래픽스','하드웨어엔지니어','기타IT_개발'],
--   array['서울'],
--   200,
--   array['신입'],
--   array['인턴','정규직'],
--   null,
--   null
-- );

