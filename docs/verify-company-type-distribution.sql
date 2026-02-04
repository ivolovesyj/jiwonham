-- 기업 유형별 공고 분포 확인 (매칭 결과 포함)
WITH job_company_types AS (
  SELECT
    j.id,
    j.company,
    LOWER(
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
    ) AS normalized_name,
    c.company_type,
    CASE
      WHEN c.company_type IS NOT NULL THEN c.company_type
      ELSE '기타'
    END AS display_type
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
  WHERE j.is_active = true
)
SELECT
  display_type AS 기업유형,
  COUNT(*) AS 공고수,
  ROUND(COUNT(*)::NUMERIC / SUM(COUNT(*)) OVER () * 100, 1) AS 비율
FROM job_company_types
GROUP BY display_type
ORDER BY 공고수 DESC;
