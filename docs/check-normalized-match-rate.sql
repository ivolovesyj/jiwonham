-- 정규화된 회사명 매칭률 간단 확인
-- 1. 전체 활성 공고 수
-- 2. 매칭된 공고 수
-- 3. 매칭률

SELECT
  COUNT(*) AS total_jobs,
  COUNT(c.normalized_name) AS matched_jobs,
  ROUND(COUNT(c.normalized_name)::NUMERIC / COUNT(*)::NUMERIC * 100, 1) AS match_rate_percent
FROM jobs j
LEFT JOIN companies c ON LOWER(
  TRIM(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              REGEXP_REPLACE(j.company, '\(주\)', '', 'g'),
            '\(유\)', '', 'g'),
          '㈜', '', 'g'),
        '주식회사', '', 'g'),
      '유한회사', '', 'g'),
    '유한책임회사', '', 'g')
  )
) = c.normalized_name
WHERE j.is_active = true;
