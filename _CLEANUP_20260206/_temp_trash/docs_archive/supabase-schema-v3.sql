-- ============================================
-- 취업하개 Database Schema v3
-- 전체 공고 저장용 jobs 테이블 추가
-- ============================================

-- ============================================
-- 공고 저장 테이블 (크롤러가 직접 저장)
-- ============================================

CREATE TABLE IF NOT EXISTS public.jobs (
  id TEXT PRIMARY KEY,                    -- 직항 UUID (recruitment ID)
  source TEXT NOT NULL DEFAULT 'zighang',

  -- 회사 정보
  company TEXT NOT NULL,
  company_image TEXT,

  -- 공고 기본 정보
  title TEXT NOT NULL,
  regions JSONB,                          -- ['서울', '경기']
  location TEXT,                          -- 대표 지역 (첫 번째 region)
  career_min INTEGER,                     -- 최소 경력 (년)
  career_max INTEGER,                     -- 최대 경력 (년), null=무관
  employee_types JSONB,                   -- ['정규직', '계약직']
  deadline_type TEXT,                     -- '상시채용', '채용시마감', '기한마감'
  end_date DATE,                          -- 마감일 (있을 경우)

  -- 직군 분류
  depth_ones JSONB,                       -- 대분류 ['마케팅_광고_홍보', 'IT_개발']
  depth_twos JSONB,                       -- 소분류 ['브랜드마케팅', '퍼포먼스마케팅']
  keywords JSONB,                         -- ['콘텐츠제작', 'B2B마케팅', 'React']

  -- 조회수
  views INTEGER DEFAULT 0,

  -- 상세 정보 (상세 페이지에서 수집)
  detail JSONB,                           -- {intro, main_tasks, requirements, preferred_points, benefits, work_conditions}

  -- 타임스탬프
  original_created_at TIMESTAMPTZ,        -- 직항 원본 등록일
  last_modified_at TIMESTAMPTZ,           -- sitemap lastmod (증분 크롤링 기준)
  crawled_at TIMESTAMPTZ DEFAULT NOW(),   -- 우리가 수집한 시각

  -- 상태
  is_active BOOLEAN DEFAULT TRUE          -- false = 마감/삭제된 공고
);

-- ============================================
-- 인덱스 (검색/필터 성능)
-- ============================================

-- GIN 인덱스: JSONB 배열 검색용 (직군, 키워드 필터)
CREATE INDEX IF NOT EXISTS idx_jobs_depth_ones ON public.jobs USING GIN(depth_ones);
CREATE INDEX IF NOT EXISTS idx_jobs_depth_twos ON public.jobs USING GIN(depth_twos);
CREATE INDEX IF NOT EXISTS idx_jobs_keywords ON public.jobs USING GIN(keywords);

-- B-tree 인덱스: 일반 필터/정렬
CREATE INDEX IF NOT EXISTS idx_jobs_location ON public.jobs(location);
CREATE INDEX IF NOT EXISTS idx_jobs_career_min ON public.jobs(career_min);
CREATE INDEX IF NOT EXISTS idx_jobs_crawled_at ON public.jobs(crawled_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_is_active ON public.jobs(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_jobs_last_modified ON public.jobs(last_modified_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_company ON public.jobs(company);

-- ============================================
-- RLS 정책 (공고는 인증된 사용자 누구나 조회 가능)
-- ============================================

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자는 모두 조회 가능
CREATE POLICY "Authenticated users can read jobs"
  ON public.jobs FOR SELECT
  USING (auth.role() = 'authenticated');

-- service_role만 삽입/수정 가능 (크롤러가 service_role key 사용)
CREATE POLICY "Service role can insert jobs"
  ON public.jobs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update jobs"
  ON public.jobs FOR UPDATE
  USING (auth.role() = 'service_role');

-- ============================================
-- 크롤링 메타데이터 테이블 (증분 크롤링용)
-- ============================================

CREATE TABLE IF NOT EXISTS public.crawl_metadata (
  id TEXT PRIMARY KEY DEFAULT 'default',  -- 단일 레코드
  last_crawled_at TIMESTAMPTZ,            -- 마지막 크롤링 시각
  last_sitemap_check TIMESTAMPTZ,         -- 마지막 sitemap 체크 시각
  total_jobs INTEGER DEFAULT 0,           -- 전체 공고 수
  active_jobs INTEGER DEFAULT 0,          -- 활성 공고 수
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- crawl_metadata는 service_role만 접근
ALTER TABLE public.crawl_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage crawl metadata"
  ON public.crawl_metadata FOR ALL
  USING (auth.role() = 'service_role');

-- 초기 레코드 삽입
INSERT INTO public.crawl_metadata (id) VALUES ('default')
  ON CONFLICT (id) DO NOTHING;
