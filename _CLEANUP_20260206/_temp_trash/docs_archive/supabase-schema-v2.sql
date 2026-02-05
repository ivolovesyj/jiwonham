-- ============================================
-- 취업하개 (Job Helper Dog) Database Schema v2
-- 사용자 선호도 학습 및 개인화 추천 시스템
-- ============================================

-- ============================================
-- 1. 사용자 관련 테이블
-- ============================================

-- 사용자 프로필 (Supabase Auth 확장)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  name TEXT,
  kakao_id TEXT UNIQUE,
  avatar_url TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE, -- 초기 설정 완료 여부
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 사용자 초기 선호 설정 (온보딩 시 수집)
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- 기본 필터 설정
  preferred_job_types JSONB, -- ['마케팅', '브랜드마케팅', '콘텐츠마케팅']
  preferred_locations JSONB, -- ['서울', '경기', '원격']
  career_level TEXT, -- '신입', '경력무관', '1-3년'

  -- 회사 선호도
  preferred_company_sizes JSONB, -- ['스타트업', '중소기업', '대기업']
  preferred_industries JSONB, -- ['IT', '커머스', '엔터테인먼트']

  -- 기타 선호사항
  min_salary INTEGER, -- 최소 희망 연봉
  work_style JSONB, -- ['재택근무', '유연근무', '자율출퇴근']

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. 공고 선택 및 학습 관련 테이블
-- ============================================

-- 사용자의 공고 선택 이력
CREATE TABLE IF NOT EXISTS public.user_job_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id TEXT NOT NULL, -- 공고 ID (source_jobId 형식)
  action TEXT NOT NULL CHECK (action IN ('pass', 'hold', 'apply')),

  -- 선택 당시 공고 정보 스냅샷 (학습용)
  company TEXT,
  job_title TEXT,
  location TEXT,
  keywords JSONB, -- 공고에서 추출한 키워드들

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, job_id)
);

-- 키워드 가중치 (사용자별 학습)
CREATE TABLE IF NOT EXISTS public.keyword_weights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  keyword TEXT NOT NULL,
  weight FLOAT DEFAULT 0, -- 가중치 (-100 ~ 100)
  apply_count INTEGER DEFAULT 0, -- '지원 예정' 선택 횟수
  hold_count INTEGER DEFAULT 0, -- '보류' 선택 횟수
  pass_count INTEGER DEFAULT 0, -- '지원 안 함' 선택 횟수

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, keyword)
);

-- 회사별 선호도
CREATE TABLE IF NOT EXISTS public.company_preference (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_name TEXT NOT NULL,
  preference_score FLOAT DEFAULT 0, -- 선호도 점수
  apply_count INTEGER DEFAULT 0,
  hold_count INTEGER DEFAULT 0,
  pass_count INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, company_name)
);

-- ============================================
-- 3. 저장 및 지원 관리 테이블
-- ============================================

-- 저장된 공고 (지원 예정 공고의 상세 정보)
CREATE TABLE IF NOT EXISTS public.saved_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id TEXT NOT NULL,
  source TEXT NOT NULL, -- 'wanted' or 'zighang'

  -- 공고 기본 정보
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  location TEXT,
  link TEXT NOT NULL,
  deadline DATE,

  -- AI 분석 결과
  score INTEGER, -- 적합도 점수
  reason TEXT, -- 주 추천 이유
  reasons JSONB, -- 모든 추천 이유들
  warnings JSONB, -- 주의사항

  -- 공고 상세 내용
  description TEXT,
  detail JSONB, -- {intro, main_tasks, requirements, preferred_points, benefits}

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, job_id)
);

-- 지원 현황 관리
CREATE TABLE IF NOT EXISTS public.application_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  saved_job_id UUID REFERENCES public.saved_jobs(id) ON DELETE CASCADE NOT NULL,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'document_pass', 'interviewing', 'final', 'rejected', 'accepted', 'declined')),

  -- 지원 관련 정보
  applied_date DATE,
  resume_version TEXT, -- 사용한 이력서 버전
  cover_letter TEXT, -- 자기소개서 메모

  -- 진행 상황 메모
  notes TEXT,
  interview_dates JSONB, -- [{date: '2026-02-15', type: '1차 면접', note: '...'}]

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, saved_job_id)
);

-- ============================================
-- 4. 공고 발송 이력 (중복 방지)
-- ============================================

-- 사용자에게 발송된 공고 이력
CREATE TABLE IF NOT EXISTS public.sent_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id TEXT NOT NULL,
  sent_date DATE DEFAULT CURRENT_DATE,
  was_shown BOOLEAN DEFAULT TRUE, -- 실제로 사용자가 봤는지

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, job_id)
);

-- ============================================
-- 인덱스 생성 (성능 최적화)
-- ============================================

-- user_job_actions
CREATE INDEX IF NOT EXISTS idx_user_job_actions_user_id ON public.user_job_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_job_actions_action ON public.user_job_actions(action);
CREATE INDEX IF NOT EXISTS idx_user_job_actions_created_at ON public.user_job_actions(created_at);

-- keyword_weights
CREATE INDEX IF NOT EXISTS idx_keyword_weights_user_id ON public.keyword_weights(user_id);
CREATE INDEX IF NOT EXISTS idx_keyword_weights_weight ON public.keyword_weights(weight DESC);

-- company_preference
CREATE INDEX IF NOT EXISTS idx_company_preference_user_id ON public.company_preference(user_id);
CREATE INDEX IF NOT EXISTS idx_company_preference_score ON public.company_preference(preference_score DESC);

-- saved_jobs
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON public.saved_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_deadline ON public.saved_jobs(deadline);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_created_at ON public.saved_jobs(created_at);

-- application_status
CREATE INDEX IF NOT EXISTS idx_application_status_user_id ON public.application_status(user_id);
CREATE INDEX IF NOT EXISTS idx_application_status_status ON public.application_status(status);

-- sent_jobs
CREATE INDEX IF NOT EXISTS idx_sent_jobs_user_id ON public.sent_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_sent_jobs_sent_date ON public.sent_jobs(sent_date);

-- ============================================
-- Row Level Security (RLS) 정책
-- ============================================

-- RLS 활성화
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_job_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keyword_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_preference ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sent_jobs ENABLE ROW LEVEL SECURITY;

-- user_profiles
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- user_preferences
CREATE POLICY "Users can view own preferences" ON public.user_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences" ON public.user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON public.user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- user_job_actions
CREATE POLICY "Users can view own actions" ON public.user_job_actions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own actions" ON public.user_job_actions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own actions" ON public.user_job_actions
  FOR UPDATE USING (auth.uid() = user_id);

-- keyword_weights
CREATE POLICY "Users can view own keyword weights" ON public.keyword_weights
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own keyword weights" ON public.keyword_weights
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own keyword weights" ON public.keyword_weights
  FOR UPDATE USING (auth.uid() = user_id);

-- company_preference
CREATE POLICY "Users can view own company preferences" ON public.company_preference
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own company preferences" ON public.company_preference
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own company preferences" ON public.company_preference
  FOR UPDATE USING (auth.uid() = user_id);

-- saved_jobs
CREATE POLICY "Users can view own saved jobs" ON public.saved_jobs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own saved jobs" ON public.saved_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own saved jobs" ON public.saved_jobs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own saved jobs" ON public.saved_jobs
  FOR DELETE USING (auth.uid() = user_id);

-- application_status
CREATE POLICY "Users can view own application status" ON public.application_status
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own application status" ON public.application_status
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own application status" ON public.application_status
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own application status" ON public.application_status
  FOR DELETE USING (auth.uid() = user_id);

-- sent_jobs
CREATE POLICY "Users can view own sent jobs" ON public.sent_jobs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sent jobs" ON public.sent_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 트리거: updated_at 자동 업데이트
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_job_actions_updated_at BEFORE UPDATE ON public.user_job_actions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_keyword_weights_updated_at BEFORE UPDATE ON public.keyword_weights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_preference_updated_at BEFORE UPDATE ON public.company_preference
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_jobs_updated_at BEFORE UPDATE ON public.saved_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_application_status_updated_at BEFORE UPDATE ON public.application_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
