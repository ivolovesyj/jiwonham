-- ============================================
-- 취업하개 (Job Helper Dog) Database Schema
-- ============================================

-- 1. 사용자 테이블 (users)
-- Supabase Auth를 사용하므로 auth.users 테이블 활용
-- 추가 프로필 정보만 별도 테이블로 관리

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  name TEXT,
  kakao_id TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 사용자의 공고 선택 이력 테이블 (user_job_actions)
-- 사용자가 각 공고에 대해 어떤 선택을 했는지 기록
CREATE TABLE IF NOT EXISTS public.user_job_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id TEXT NOT NULL, -- 공고 ID (wanted_12345, zighang_67890 형식)
  action TEXT NOT NULL CHECK (action IN ('pass', 'hold', 'apply')), -- 지원 안 함, 보류, 지원 예정
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 한 사용자가 같은 공고에 여러 번 선택하지 않도록 (마지막 선택만 유지)
  UNIQUE(user_id, job_id)
);

-- 3. 저장된 공고 상세 정보 테이블 (saved_jobs)
-- "지원 예정"으로 선택한 공고의 전체 정보를 저장
-- 원본 사이트에서 공고가 삭제되어도 사용자는 계속 볼 수 있도록
CREATE TABLE IF NOT EXISTS public.saved_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id TEXT NOT NULL, -- 공고 ID
  source TEXT NOT NULL, -- 'wanted' or 'zighang'
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  location TEXT,
  link TEXT NOT NULL,
  deadline DATE, -- 마감일
  score INTEGER, -- 적합도 점수
  reason TEXT, -- 추천 이유
  description TEXT,

  -- 상세 정보 (JSON으로 저장)
  detail JSONB, -- {intro, main_tasks, requirements, preferred_points, benefits}

  -- 메타 정보
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 한 사용자가 같은 공고를 중복 저장하지 않도록
  UNIQUE(user_id, job_id)
);

-- 4. 사용자 지원 현황 관리 테이블 (application_status)
-- 저장된 공고에 대한 실제 지원 여부 및 진행 상황 추적
CREATE TABLE IF NOT EXISTS public.application_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  saved_job_id UUID REFERENCES public.saved_jobs(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'interviewing', 'rejected', 'accepted')),
  applied_date DATE, -- 실제 지원한 날짜
  notes TEXT, -- 메모
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, saved_job_id)
);

-- ============================================
-- 인덱스 생성 (성능 최적화)
-- ============================================

-- user_job_actions 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_user_job_actions_user_id ON public.user_job_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_job_actions_job_id ON public.user_job_actions(job_id);
CREATE INDEX IF NOT EXISTS idx_user_job_actions_action ON public.user_job_actions(action);
CREATE INDEX IF NOT EXISTS idx_user_job_actions_created_at ON public.user_job_actions(created_at);

-- saved_jobs 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON public.saved_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_deadline ON public.saved_jobs(deadline);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_created_at ON public.saved_jobs(created_at);

-- application_status 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_application_status_user_id ON public.application_status(user_id);
CREATE INDEX IF NOT EXISTS idx_application_status_status ON public.application_status(status);

-- ============================================
-- Row Level Security (RLS) 정책
-- ============================================

-- RLS 활성화
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_job_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_status ENABLE ROW LEVEL SECURITY;

-- user_profiles 정책: 자신의 프로필만 읽기/수정 가능
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- user_job_actions 정책: 자신의 액션만 관리 가능
CREATE POLICY "Users can view own actions" ON public.user_job_actions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own actions" ON public.user_job_actions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own actions" ON public.user_job_actions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own actions" ON public.user_job_actions
  FOR DELETE USING (auth.uid() = user_id);

-- saved_jobs 정책: 자신의 저장된 공고만 관리 가능
CREATE POLICY "Users can view own saved jobs" ON public.saved_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved jobs" ON public.saved_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved jobs" ON public.saved_jobs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved jobs" ON public.saved_jobs
  FOR DELETE USING (auth.uid() = user_id);

-- application_status 정책: 자신의 지원 현황만 관리 가능
CREATE POLICY "Users can view own application status" ON public.application_status
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own application status" ON public.application_status
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own application status" ON public.application_status
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own application status" ON public.application_status
  FOR DELETE USING (auth.uid() = user_id);

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

CREATE TRIGGER update_user_job_actions_updated_at BEFORE UPDATE ON public.user_job_actions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_jobs_updated_at BEFORE UPDATE ON public.saved_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_application_status_updated_at BEFORE UPDATE ON public.application_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
