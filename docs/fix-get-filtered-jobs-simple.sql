-- ============================================================
-- get_filtered_jobs 함수 간단한 버전 - jsonb만 처리
-- Supabase SQL Editor에서 실행
-- ============================================================

-- 기존 함수 삭제
DROP FUNCTION IF EXISTS get_filtered_jobs(text[], text[], integer);

-- 새 함수 생성 (jsonb 컬럼을 그대로 반환, 변환은 애플리케이션에서)
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
    CASE
      WHEN jsonb_typeof(j.regions) = 'array' THEN
        ARRAY(SELECT jsonb_array_elements_text(j.regions))
      ELSE ARRAY[]::text[]
    END as regions,
    j.location,
    j.career_min,
    j.career_max,
    CASE
      WHEN jsonb_typeof(j.employee_types) = 'array' THEN
        ARRAY(SELECT jsonb_array_elements_text(j.employee_types))
      ELSE ARRAY[]::text[]
    END as employee_types,
    j.deadline_type,
    j.end_date,
    CASE
      WHEN jsonb_typeof(j.depth_ones) = 'array' THEN
        ARRAY(SELECT jsonb_array_elements_text(j.depth_ones))
      ELSE ARRAY[]::text[]
    END as depth_ones,
    CASE
      WHEN jsonb_typeof(j.depth_twos) = 'array' THEN
        ARRAY(SELECT jsonb_array_elements_text(j.depth_twos))
      ELSE ARRAY[]::text[]
    END as depth_twos,
    CASE
      WHEN jsonb_typeof(j.keywords) = 'array' THEN
        ARRAY(SELECT jsonb_array_elements_text(j.keywords))
      ELSE ARRAY[]::text[]
    END as keywords,
    j.views,
    j.detail,
    j.original_created_at,
    j.last_modified_at,
    j.crawled_at::text,
    j.is_active
  FROM jobs j
  WHERE j.is_active = true
    AND (
      p_job_types IS NULL
      OR array_length(p_job_types, 1) IS NULL
      OR (
        jsonb_typeof(j.depth_twos) = 'array'
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(j.depth_twos) AS dt
          WHERE dt = ANY(p_job_types)
        )
      )
      OR (
        jsonb_typeof(j.depth_ones) = 'array'
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(j.depth_ones) AS d1
          WHERE d1 = ANY(p_job_types)
        )
      )
    )
    AND (
      p_locations IS NULL
      OR array_length(p_locations, 1) IS NULL
      OR (
        jsonb_typeof(j.regions) = 'array'
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(j.regions) AS r
          WHERE EXISTS (
            SELECT 1 FROM unnest(p_locations) AS loc
            WHERE r ILIKE '%' || loc || '%'
          )
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
SELECT
  COUNT(*) as total_jobs,
  '함수가 성공적으로 생성되었습니다.' as message
FROM get_filtered_jobs(NULL, NULL, 10);
