-- =====================================================
-- saved_jobs 테이블에 company_image 컬럼 추가
-- =====================================================

ALTER TABLE public.saved_jobs
  ADD COLUMN IF NOT EXISTS company_image TEXT DEFAULT NULL;

COMMENT ON COLUMN public.saved_jobs.company_image IS '회사 로고/이미지 URL';

-- 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'saved_jobs'
  AND column_name = 'company_image';
