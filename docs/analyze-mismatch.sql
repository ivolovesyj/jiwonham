-- 매칭 실패한 회사들 중 상위 50개 분석
WITH job_normalized AS (
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
    ) AS normalized_name,
    COUNT(*) AS job_count
  FROM jobs
  WHERE is_active = true
  GROUP BY company
)
SELECT
  jn.original_name AS job_company,
  jn.normalized_name,
  jn.job_count,
  c.name AS matched_company,
  c.company_type
FROM job_normalized jn
LEFT JOIN companies c ON jn.normalized_name = c.normalized_name
WHERE c.normalized_name IS NULL
ORDER BY jn.job_count DESC
LIMIT 50;
