-- ============================================
-- jobs 테이블에 company_id 컬럼 추가
-- Supabase 대시보드 > SQL Editor에서 실행
-- ============================================

-- company_id 컬럼 추가
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS company_id TEXT;

-- 인덱스 생성 (JOIN 성능 향상)
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON public.jobs(company_id);

-- 외래 키 제약조건 (선택사항 - companies 테이블과의 참조 무결성 보장)
-- ALTER TABLE public.jobs
-- ADD CONSTRAINT fk_jobs_company
-- FOREIGN KEY (company_id) REFERENCES public.companies(id);
