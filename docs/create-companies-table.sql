-- ============================================
-- 기업 정보 테이블 생성
-- Supabase 대시보드 > SQL Editor에서 실행
-- ============================================

CREATE TABLE IF NOT EXISTS public.companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  image TEXT,
  company_type TEXT,
  description TEXT,
  crawled_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_companies_name ON public.companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_type ON public.companies(company_type);

-- RLS 정책
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자 누구나 조회 가능
CREATE POLICY "Authenticated users can read companies"
  ON public.companies FOR SELECT
  USING (auth.role() = 'authenticated');

-- service_role만 삽입/수정 가능
CREATE POLICY "Service role can insert companies"
  ON public.companies FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update companies"
  ON public.companies FOR UPDATE
  USING (auth.role() = 'service_role');

-- 비인증 사용자도 조회 가능하도록 추가 정책 (필터 옵션용)
CREATE POLICY "Anonymous users can read companies"
  ON public.companies FOR SELECT
  USING (true);
