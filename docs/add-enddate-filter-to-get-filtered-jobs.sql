-- ============================================================
-- get_filtered_jobs 함수에 end_date 필터 추가 (최종 버전)
-- optimize-get-filtered-jobs.sql 기반 (올바른 타입 유지)
-- end_date는 DATE 타입 → CURRENT_DATE와 date >= date 비교 (정상)
-- regions/depth_twos/keywords 등은 jsonb 타입 유지
-- Supabase SQL Editor에서 실행
-- ============================================================

-- 1단계: 기존 함수 삭제
DROP FUNCTION IF EXISTS get_filtered_jobs(text[], text[], integer);

-- 2단계: 올바른 타입 + end_date 필터 포함한 함수 생성
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
  crawled_at timestamp with time zone,
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
    j.depth_ones,
    j.depth_twos,
    j.keywords,
    j.views,
    j.detail,
    j.original_created_at::text,
    j.last_modified_at::text,
    j.crawled_at,
    j.is_active
  FROM jobs j
  WHERE j.is_active = true
    AND (j.end_date IS NULL OR j.end_date >= CURRENT_DATE)  -- date >= date 비교 (정상)
    AND (
      p_job_types IS NULL
      OR array_length(p_job_types, 1) IS NULL
      OR j.depth_twos ?| p_job_types
      OR j.depth_ones ?| p_job_types
    )
    AND (
      p_locations IS NULL
      OR array_length(p_locations, 1) IS NULL
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(j.regions) AS r
        WHERE EXISTS (
          SELECT 1
          FROM unnest(p_locations) AS loc
          WHERE r ILIKE '%' || loc || '%'
        )
      )
    )
  ORDER BY j.crawled_at DESC
  LIMIT COALESCE(p_limit, 2000);
END;
$$;

GRANT EXECUTE ON FUNCTION get_filtered_jobs(text[], text[], integer) TO anon, authenticated;
