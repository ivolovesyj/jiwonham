-- ============================================
-- 기업 정보 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS public.companies (
  id TEXT PRIMARY KEY,                    -- 직항 company UUID
  name TEXT NOT NULL,                     -- 회사명
  image TEXT,                             -- 회사 로고 URL
  company_type TEXT,                      -- 기업 유형: 대기업, 중견기업, 중소기업, 스타트업, 유니콘, 외국계, 공공기관, 기타
  description TEXT,                       -- 회사 설명 (og:description에서 추출)
  crawled_at TIMESTAMPTZ DEFAULT NOW()    -- 크롤링 시각
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_companies_name ON public.companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_type ON public.companies(company_type);

-- RLS 정책 (인증된 사용자 누구나 조회 가능)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

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
