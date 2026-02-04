-- 매칭 안 된 회사 중 공고가 많은 상위 500개
-- 이 회사들을 추가로 크롤링하면 매칭률이 크게 올라갈 것
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
  jn.original_name,
  jn.job_count,
  SUM(jn.job_count) OVER (ORDER BY jn.job_count DESC) AS cumulative_jobs
FROM job_normalized jn
LEFT JOIN companies c ON jn.normalized_name = c.normalized_name
WHERE c.normalized_name IS NULL
ORDER BY jn.job_count DESC
LIMIT 500;
