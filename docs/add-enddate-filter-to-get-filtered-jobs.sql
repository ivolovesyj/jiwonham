-- ============================================================
-- get_filtered_jobs 함수에 end_date 필터 추가
-- 마감일이 지난 공고는 is_active와 무관하게 제외
-- Supabase SQL Editor에서 실행
-- ============================================================

CREATE OR REPLACE FUNCTION get_filtered_jobs(
  p_job_types text[] DEFAULT NULL,
  p_locations text[] DEFAULT NULL,
  p_limit integer DEFAULT 2000
)
RETURNS TABLE(
  id text,
  source text,
  company text,
  company_image text,
  company_type text,
  title text,
  regions text[],
  location text,
  career_min integer,
  career_max integer,
  employee_types text[],
  deadline_type text,
  end_date text,
  depth_ones text[],
  depth_twos text[],
  keywords text[],
  views integer,
  detail jsonb,
  original_created_at text,
  last_modified_at text,
  crawled_at text,
  is_active boolean
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
  SELECT
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
    CASE
      WHEN j.depth_ones IS NULL THEN ARRAY[]::text[]
      WHEN pg_typeof(j.depth_ones)::text = 'jsonb' THEN ARRAY(SELECT jsonb_array_elements_text(j.depth_ones))
      ELSE j.depth_ones::text[]
    END as depth_ones,
    CASE
      WHEN j.depth_twos IS NULL THEN ARRAY[]::text[]
      WHEN pg_typeof(j.depth_twos)::text = 'jsonb' THEN ARRAY(SELECT jsonb_array_elements_text(j.depth_twos))
      ELSE j.depth_twos::text[]
    END as depth_twos,
    CASE
      WHEN j.keywords IS NULL THEN ARRAY[]::text[]
      WHEN pg_typeof(j.keywords)::text = 'jsonb' THEN ARRAY(SELECT jsonb_array_elements_text(j.keywords))
      ELSE j.keywords::text[]
    END as keywords,
    j.views,
    j.detail,
    j.original_created_at,
    j.last_modified_at,
    j.crawled_at::text,
    j.is_active
  FROM jobs j
  WHERE j.is_active = true
    AND (j.end_date IS NULL OR j.end_date >= CURRENT_DATE)  -- 마감일 필터 추가
    AND (
      p_job_types IS NULL
      OR array_length(p_job_types, 1) IS NULL
      OR (
        CASE
          WHEN pg_typeof(j.depth_twos)::text = 'jsonb' THEN
            EXISTS (
              SELECT 1 FROM jsonb_array_elements_text(j.depth_twos) AS dt
              WHERE dt = ANY(p_job_types)
            )
          ELSE j.depth_twos::text[] && p_job_types
        END
      )
      OR (
        CASE
          WHEN pg_typeof(j.depth_ones)::text = 'jsonb' THEN
            EXISTS (
              SELECT 1 FROM jsonb_array_elements_text(j.depth_ones) AS d1
              WHERE d1 = ANY(p_job_types)
            )
          ELSE j.depth_ones::text[] && p_job_types
        END
      )
    )
    AND (
      p_locations IS NULL
      OR array_length(p_locations, 1) IS NULL
      OR EXISTS (
        SELECT 1 FROM unnest(
          CASE
            WHEN pg_typeof(j.regions)::text = 'jsonb' THEN
              ARRAY(SELECT jsonb_array_elements_text(j.regions))
            ELSE j.regions::text[]
          END
        ) AS r
        WHERE EXISTS (
          SELECT 1 FROM unnest(p_locations) AS loc
          WHERE r ILIKE '%' || loc || '%'
        )
      )
    )
  ORDER BY j.crawled_at DESC
  LIMIT COALESCE(p_limit, 2000);
END;
$$;

GRANT EXECUTE ON FUNCTION get_filtered_jobs(text[], text[], integer) TO anon, authenticated;
