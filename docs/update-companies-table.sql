-- ============================================
-- companies 테이블 구조 수정
-- 회사명을 PRIMARY KEY로 변경
-- ============================================

-- 1. 기존 테이블 삭제 (데이터 날아감 - 백업 필요시 먼저 백업)
DROP TABLE IF EXISTS public.companies CASCADE;

-- 2. 새로운 구조로 재생성
CREATE TABLE public.companies (
  name TEXT PRIMARY KEY,              -- 회사명을 PRIMARY KEY로
  zighang_id TEXT,                    -- 직항 URL ID (참고용, 중복 가능)
  company_type TEXT,                  -- 기업 유형
  image TEXT,
  description TEXT,
  crawled_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_companies_type ON public.companies(company_type);
CREATE INDEX IF NOT EXISTS idx_companies_zighang_id ON public.companies(zighang_id);

-- RLS 정책
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read companies"
  ON public.companies FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Anonymous users can read companies"
  ON public.companies FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert companies"
  ON public.companies FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update companies"
  ON public.companies FOR UPDATE
  USING (auth.role() = 'service_role');
