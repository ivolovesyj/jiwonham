-- 테이블 구조 확인
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('keyword_weights', 'company_preference', 'sent_jobs')
ORDER BY table_name, ordinal_position;
