-- 정규화된 회사명으로 매칭률 테스트
-- jobs 테이블과 companies 테이블을 normalized_name으로 JOIN

WITH job_companies AS (
  SELECT DISTINCT
    company AS original_name,
    LOWER(
      TRIM(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              REGEXP_REPLACE(
                REGEXP_REPLACE(
                  REGEXP_REPLACE(company, '\(주\)', '', 'g'),
                '\(유\)', '', 'g'),
              '㈜', '', 'g'),
            '주식회사', '', 'g'),
          '유한회사', '', 'g'),
        '유한책임회사', '', 'g')
      )
    ) AS normalized_name
  FROM jobs
  WHERE is_active = true
),
matched AS (
  SELECT
    jc.original_name,
    jc.normalized_name,
    c.name AS company_db_name,
    c.company_type,
    CASE WHEN c.normalized_name IS NOT NULL THEN 'MATCHED' ELSE 'NOT MATCHED' END AS match_status
  FROM job_companies jc
  LEFT JOIN companies c ON jc.normalized_name = c.normalized_name
)
SELECT
  match_status,
  COUNT(*) AS company_count
FROM matched
GROUP BY match_status
ORDER BY match_status;

-- 매칭 성공 예시 (상위 10개)
SELECT
  jc.original_name AS job_company,
  c.name AS db_company,
  c.company_type
FROM job_companies jc
JOIN companies c ON jc.normalized_name = c.normalized_name
LIMIT 10;

-- 매칭 실패 예시 (상위 10개)
SELECT
  jc.original_name AS job_company,
  jc.normalized_name
FROM job_companies jc
LEFT JOIN companies c ON jc.normalized_name = c.normalized_name
WHERE c.normalized_name IS NULL
LIMIT 10;
