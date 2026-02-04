-- jobs 테이블의 고유 회사 수 확인
SELECT
  COUNT(DISTINCT company) AS unique_companies,
  COUNT(*) AS total_jobs
FROM jobs
WHERE is_active = true;

-- companies 테이블 회사 수
SELECT COUNT(*) AS companies_in_db FROM companies;

-- 매칭된 고유 회사 vs 매칭 안 된 고유 회사
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
    ) AS normalized_name
  FROM jobs
  WHERE is_active = true
)
SELECT
  COUNT(CASE WHEN c.normalized_name IS NOT NULL THEN 1 END) AS matched_companies,
  COUNT(CASE WHEN c.normalized_name IS NULL THEN 1 END) AS unmatched_companies,
  COUNT(*) AS total_unique_companies
FROM job_normalized jn
LEFT JOIN companies c ON jn.normalized_name = c.normalized_name;
