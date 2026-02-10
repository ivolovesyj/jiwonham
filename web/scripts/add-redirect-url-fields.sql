-- =====================================================
-- 원문 링크(redirect_url) + 출처(affiliate) 컬럼 추가
-- jobs 테이블 + saved_jobs 테이블
-- =====================================================

-- 1. jobs 테이블에 redirect_url, affiliate 추가
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS redirect_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS affiliate TEXT DEFAULT NULL;

COMMENT ON COLUMN public.jobs.redirect_url IS '원문 링크 (타 플랫폼 채용 페이지 URL)';
COMMENT ON COLUMN public.jobs.affiliate IS '출처 플랫폼명 (잡알리오, 유엔리쿠르터 등)';

-- 2. saved_jobs 테이블에 redirect_url, affiliate 추가
ALTER TABLE public.saved_jobs
  ADD COLUMN IF NOT EXISTS redirect_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS affiliate TEXT DEFAULT NULL;

COMMENT ON COLUMN public.saved_jobs.redirect_url IS '원문 링크 (타 플랫폼 채용 페이지 URL)';
COMMENT ON COLUMN public.saved_jobs.affiliate IS '출처 플랫폼명 (잡알리오, 유엔리쿠르터 등)';

-- 3. 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name IN ('jobs', 'saved_jobs')
  AND column_name IN ('redirect_url', 'affiliate')
ORDER BY table_name, column_name;
