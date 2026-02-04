-- ============================================================
-- get_filtered_jobs 함수 수정: company_type 컬럼 추가
-- Supabase SQL Editor에서 실행
-- ============================================================

-- 기존 함수 삭제
DROP FUNCTION IF EXISTS get_filtered_jobs(text[], text[], integer);

-- 새 함수 생성 (company_type 포함)
CREATE OR REPLACE FUNCTION get_filtered_jobs(
  p_job_types text[],
  p_locations text[],
  p_limit integer
)
RETURNS TABLE(
  id text,
  source text,
  company text,
  company_image text,
  company_type text,  -- 추가
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
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.id,
    j.source,
    j.company,
    j.company_image,
    j.company_type,  -- 추가
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
    j.original_created_at,
    j.last_modified_at,
    j.crawled_at::text,
    j.is_active
  FROM jobs j
  WHERE j.is_active = true
    AND (
      p_job_types IS NULL OR 
      j.depth_twos && p_job_types OR
      j.depth_ones && p_job_types
    )
    AND (
      p_locations IS NULL OR
      EXISTS (
        SELECT 1 FROM unnest(j.regions) AS r
        WHERE r LIKE ANY(
          SELECT '%' || loc || '%' FROM unnest(p_locations) AS loc
        )
      )
    )
  ORDER BY j.crawled_at DESC
  LIMIT p_limit;
END;
$$;

-- 확인
SELECT '함수가 성공적으로 수정되었습니다.' as message;
