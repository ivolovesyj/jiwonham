-- =============================================================
-- jobs 테이블 정규화 검색 컬럼 추가
-- 목적: DB 레벨 exact filter를 가능하게 하여 앱 레벨 스캔 제거
-- 실행 순서: 1) 컬럼 추가 → 2) 함수+트리거 → 3) 백필 → 4) 인덱스
-- =============================================================

-- =====================
-- 1. 컬럼 추가
-- =====================

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS location_tokens text[] DEFAULT '{}';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS work_styles_normalized text[] DEFAULT '{}';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS career_buckets text[] DEFAULT '{}';
-- job_types_normalized는 depth_twos를 그대로 사용하므로 별도 컬럼 불필요
-- (depth_twos가 이미 text[]이고 정규화 불필요)

-- =====================
-- 2. 정규화 함수
-- =====================

CREATE OR REPLACE FUNCTION normalize_job_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  _loc text;
  _regions text[] := ARRAY[
    '서울','경기','인천','부산','대구','광주','대전','울산','세종',
    '강원','충북','충남','전북','전남','경북','경남','제주','해외'
  ];
  _r text;
  _loc_tokens text[] := '{}';
  _ws text[] := '{}';
  _raw_type text;
  _normalized text;
  _cb text[] := '{}';
  _cmin int;
BEGIN

  -- -------------------------------------------------------
  -- A. location_tokens: location 문자열에서 시/도 토큰 추출
  -- -------------------------------------------------------
  _loc := COALESCE(NEW.location, '');
  FOREACH _r IN ARRAY _regions LOOP
    IF _loc LIKE '%' || _r || '%' THEN
      _loc_tokens := array_append(_loc_tokens, _r);
    END IF;
  END LOOP;
  -- regions 배열에서도 추출 (location이 비어있지만 regions가 있는 경우)
  IF NEW.regions IS NOT NULL THEN
    FOREACH _r IN ARRAY _regions LOOP
      IF NOT (_r = ANY(_loc_tokens)) THEN
        IF EXISTS (
          SELECT 1 FROM unnest(NEW.regions) AS rg WHERE rg LIKE '%' || _r || '%'
        ) THEN
          _loc_tokens := array_append(_loc_tokens, _r);
        END IF;
      END IF;
    END LOOP;
  END IF;
  NEW.location_tokens := _loc_tokens;

  -- -------------------------------------------------------
  -- B. work_styles_normalized: employee_types 정규화
  --    DB 실제 값: CONTRACTOR, TEMPORARY, 계약직, 계약직/일용직,
  --    병역특례, 인턴, 일용직, 전환형인턴, 정규직, 체험형인턴, 프리랜서
  -- -------------------------------------------------------
  IF NEW.employee_types IS NOT NULL THEN
    FOREACH _raw_type IN ARRAY NEW.employee_types LOOP
      -- 영문 변환
      _normalized := CASE upper(_raw_type)
        WHEN 'CONTRACTOR' THEN '프리랜서'
        WHEN 'TEMPORARY'  THEN '계약직'
        ELSE _raw_type
      END;
      -- 원본 추가
      IF NOT (_normalized = ANY(_ws)) THEN
        _ws := array_append(_ws, _normalized);
      END IF;
      -- 부분매칭 대응: '전환형인턴', '체험형인턴' 등이면 '인턴'도 추가
      IF _normalized LIKE '%인턴%' AND _normalized <> '인턴' THEN
        IF NOT ('인턴' = ANY(_ws)) THEN
          _ws := array_append(_ws, '인턴');
        END IF;
      END IF;
      -- '계약직/일용직' → '계약직', '일용직' 분리
      IF _normalized = '계약직/일용직' THEN
        IF NOT ('계약직' = ANY(_ws)) THEN
          _ws := array_append(_ws, '계약직');
        END IF;
        IF NOT ('일용직' = ANY(_ws)) THEN
          _ws := array_append(_ws, '일용직');
        END IF;
      END IF;
    END LOOP;
  END IF;
  NEW.work_styles_normalized := _ws;

  -- -------------------------------------------------------
  -- C. career_buckets: career_min 기반 경력 구간 태깅
  --    scoreJob의 겹치는 범위 로직을 정확히 반영
  -- -------------------------------------------------------
  _cmin := NEW.career_min;

  IF _cmin IS NULL OR _cmin = 0 THEN
    -- 신입/경력무관: career_min이 0이거나 null
    _cb := array_append(_cb, '신입');
    _cb := array_append(_cb, '경력무관');
  END IF;

  IF _cmin IS NULL OR _cmin <= 3 THEN
    -- 1-3년: career_min이 null 또는 3 이하
    _cb := array_append(_cb, '1-3');
  END IF;

  IF _cmin IS NOT NULL AND _cmin >= 1 AND _cmin <= 5 THEN
    -- 3-5년: career_min 1~5
    _cb := array_append(_cb, '3-5');
  END IF;

  IF _cmin IS NOT NULL AND _cmin >= 3 AND _cmin <= 10 THEN
    -- 5-10년: career_min 3~10
    _cb := array_append(_cb, '5-10');
  END IF;

  IF _cmin IS NOT NULL AND _cmin >= 10 THEN
    -- 10년+: career_min 10 이상
    _cb := array_append(_cb, '10+');
  END IF;

  NEW.career_buckets := _cb;

  RETURN NEW;
END;
$$;

-- =====================
-- 3. 트리거 설정
-- =====================

DROP TRIGGER IF EXISTS trg_normalize_job_fields ON jobs;

CREATE TRIGGER trg_normalize_job_fields
  BEFORE INSERT OR UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION normalize_job_fields();

-- =====================
-- 4. 백필 (기존 데이터 전체 정규화)
-- =====================
-- 주의: 대량 UPDATE이므로 배치로 실행하는 것을 권장
-- 트리거가 걸려있으므로 아무 컬럼이나 UPDATE하면 정규화가 자동 실행됨

-- 전체 한번에 실행 (8만건 수준이면 괜찮음):
UPDATE jobs SET location_tokens = '{}' WHERE location_tokens IS NULL OR location_tokens = '{}';

-- 위 쿼리가 너무 느리면 배치로:
-- DO $$
-- DECLARE
--   _batch_size int := 5000;
--   _affected int := 1;
-- BEGIN
--   WHILE _affected > 0 LOOP
--     UPDATE jobs SET location_tokens = '{}'
--     WHERE id IN (
--       SELECT id FROM jobs
--       WHERE location_tokens IS NULL OR cardinality(location_tokens) = 0
--       LIMIT _batch_size
--     );
--     GET DIAGNOSTICS _affected = ROW_COUNT;
--     RAISE NOTICE 'Updated % rows', _affected;
--   END LOOP;
-- END $$;

-- =====================
-- 5. GIN 인덱스 생성
-- =====================

CREATE INDEX IF NOT EXISTS idx_jobs_location_tokens ON jobs USING GIN (location_tokens);
CREATE INDEX IF NOT EXISTS idx_jobs_work_styles_normalized ON jobs USING GIN (work_styles_normalized);
CREATE INDEX IF NOT EXISTS idx_jobs_career_buckets ON jobs USING GIN (career_buckets);
CREATE INDEX IF NOT EXISTS idx_jobs_depth_twos ON jobs USING GIN (depth_twos);

-- 복합 조건 최적화를 위한 btree 인덱스 (이미 있을 수 있음)
CREATE INDEX IF NOT EXISTS idx_jobs_active_crawled ON jobs (is_active, crawled_at DESC)
  WHERE is_active = true;

-- =====================
-- 6. 검증 쿼리
-- =====================

-- 백필 완료 확인
-- SELECT
--   count(*) AS total,
--   count(*) FILTER (WHERE cardinality(location_tokens) > 0) AS has_location,
--   count(*) FILTER (WHERE cardinality(work_styles_normalized) > 0) AS has_work_style,
--   count(*) FILTER (WHERE cardinality(career_buckets) > 0) AS has_career
-- FROM jobs
-- WHERE is_active = true;

-- 필터 조합 테스트 (예: 서울 + 프론트엔드 + 신입 + 정규직)
-- SELECT count(*)
-- FROM jobs
-- WHERE is_active = true
--   AND (end_date IS NULL OR end_date >= CURRENT_DATE)
--   AND location_tokens && ARRAY['서울']
--   AND depth_twos && ARRAY['프론트엔드']
--   AND career_buckets && ARRAY['신입']
--   AND work_styles_normalized && ARRAY['정규직'];
