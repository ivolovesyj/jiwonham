-- ============================================================
-- get_filtered_jobs 성능 개선 (v2)
-- 변경사항:
--   1. 새 파라미터: p_career_levels, p_work_styles, p_company_types, p_education
--   2. 지역 필터: regions JSONB ILIKE → location TEXT strpos (87K×strpos)
--   3. 경력/고용형태/기업유형/학력 hard filter를 SQL WHERE로 이동
--   4. RETURNS에 education, redirect_url, affiliate 추가
--   5. end_date 인덱스 생성
-- Supabase SQL Editor에서 실행
-- ============================================================

-- 1단계: 기존 함수 삭제 (이전 시그니처)
DROP FUNCTION IF EXISTS get_filtered_jobs(text[], text[], integer);
-- 새 시그니처도 삭제 (재실행 시 안전)
DROP FUNCTION IF EXISTS get_filtered_jobs(text[], text[], integer, text[], text[], text[], text[]);

-- 2단계: hard filter 포함한 새 함수 생성
CREATE OR REPLACE FUNCTION get_filtered_jobs(
  p_job_types text[] DEFAULT NULL,
  p_locations text[] DEFAULT NULL,
  p_limit integer DEFAULT 2000,
  p_career_levels text[] DEFAULT NULL,
  p_work_styles text[] DEFAULT NULL,
  p_company_types text[] DEFAULT NULL,
  p_education text[] DEFAULT NULL
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
  is_active boolean,
  education text,
  redirect_url text,
  affiliate text
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
    j.is_active,
    j.education,
    j.redirect_url,
    j.affiliate
  FROM jobs j
  WHERE j.is_active = true
    -- end_date 필터 (인덱스 활용)
    AND (j.end_date IS NULL OR j.end_date >= CURRENT_DATE)

    -- 직무 필터 (기존 유지: depth_twos/depth_ones JSONB ?| 연산)
    AND (
      p_job_types IS NULL
      OR array_length(p_job_types, 1) IS NULL
      OR j.depth_twos ?| p_job_types
      OR j.depth_ones ?| p_job_types
    )

    -- 지역 필터: location TEXT 매칭 (JS 로직과 동일)
    -- 기존: regions JSONB ILIKE (87K × 5 regions × 3 locations = 1.3M ILIKE)
    -- 변경: location TEXT strpos (87K × strpos, 훨씬 빠름)
    AND (
      p_locations IS NULL
      OR array_length(p_locations, 1) IS NULL
      OR j.location IS NULL  -- location 없으면 통과 (JS와 동일: location 없으면 필터 안함)
      OR EXISTS (
        SELECT 1
        FROM unnest(p_locations) AS loc
        WHERE strpos(j.location, loc) > 0 OR strpos(loc, j.location) > 0
      )
    )

    -- 경력 필터 (JS scoreJob lines 261-305 로직 복제)
    AND (
      p_career_levels IS NULL
      OR array_length(p_career_levels, 1) IS NULL
      OR (
        ('신입' = ANY(p_career_levels) AND (j.career_min IS NULL OR j.career_min = 0))
        OR ('경력무관' = ANY(p_career_levels) AND (j.career_min IS NULL OR j.career_min = 0))
        OR ('1-3' = ANY(p_career_levels) AND (j.career_min IS NULL OR j.career_min <= 3))
        OR ('3-5' = ANY(p_career_levels) AND (j.career_min IS NOT NULL AND j.career_min >= 1 AND j.career_min <= 5))
        OR ('5-10' = ANY(p_career_levels) AND (j.career_min IS NOT NULL AND j.career_min >= 3 AND j.career_min <= 10))
        OR ('10+' = ANY(p_career_levels) AND (j.career_min IS NOT NULL AND j.career_min >= 10))
      )
    )

    -- 고용형태 필터 (JS scoreJob lines 308-339 로직 복제)
    -- employee_types NULL/빈 배열이면 제외
    -- CONTRACTOR→프리랜서, TEMPORARY→계약직 정규화 후 부분 문자열 매칭
    AND (
      p_work_styles IS NULL
      OR array_length(p_work_styles, 1) IS NULL
      OR (
        j.employee_types IS NOT NULL
        AND jsonb_array_length(j.employee_types) > 0
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(j.employee_types) AS raw_et
          CROSS JOIN LATERAL (
            SELECT CASE upper(raw_et)
              WHEN 'CONTRACTOR' THEN '프리랜서'
              WHEN 'TEMPORARY' THEN '계약직'
              ELSE raw_et
            END AS et
          ) normalized
          CROSS JOIN unnest(p_work_styles) AS ws
          WHERE strpos(normalized.et, ws) > 0 OR strpos(ws, normalized.et) > 0
        )
      )
    )

    -- 기업유형 필터 (JS scoreJob lines 343-361 로직 복제)
    -- company_type NULL이면 제외, '기타'이면 제외, 나머지 exact match
    AND (
      p_company_types IS NULL
      OR array_length(p_company_types, 1) IS NULL
      OR (
        j.company_type IS NOT NULL
        AND j.company_type <> '기타'
        AND j.company_type = ANY(p_company_types)
      )
    )

    -- 학력 필터 (JS scoreJob lines 366-381 로직 복제)
    -- education NULL이면 제외, exact match
    AND (
      p_education IS NULL
      OR array_length(p_education, 1) IS NULL
      OR (
        j.education IS NOT NULL
        AND j.education = ANY(p_education)
      )
    )

  ORDER BY j.crawled_at DESC
  LIMIT COALESCE(p_limit, 2000);
END;
$$;

-- 3단계: 권한 부여 (새 시그니처)
GRANT EXECUTE ON FUNCTION get_filtered_jobs(text[], text[], integer, text[], text[], text[], text[]) TO anon, authenticated;

-- 4단계: end_date 인덱스 (활성 공고만, 순차스캔 방지)
CREATE INDEX IF NOT EXISTS idx_jobs_end_date
  ON jobs(end_date DESC)
  WHERE is_active = TRUE;
