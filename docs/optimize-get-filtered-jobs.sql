-- ============================================================
-- get_filtered_jobs 함수 최적화 - 성능 개선
-- 인덱스 활용 및 불필요한 변환 제거
-- ============================================================

-- 기존 함수 삭제
DROP FUNCTION IF EXISTS get_filtered_jobs(text[], text[], integer);

-- 최적화된 함수 생성
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
    -- 직무 필터링 (인덱스 활용)
    AND (
      p_job_types IS NULL
      OR array_length(p_job_types, 1) IS NULL
      OR j.depth_twos ?| p_job_types  -- GIN 인덱스 사용
      OR j.depth_ones ?| p_job_types  -- GIN 인덱스 사용
    )
    -- 지역 필터링 (인덱스 활용)
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

-- 권한 부여
GRANT EXECUTE ON FUNCTION get_filtered_jobs(text[], text[], integer) TO anon, authenticated;

-- 테스트
SELECT COUNT(*) as result_count
FROM get_filtered_jobs(ARRAY['프론트엔드'], ARRAY['서울'], 50);
