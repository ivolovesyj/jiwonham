-- ============================================
-- 단계별 마이그레이션 스크립트
-- 각 단계를 순서대로 실행하세요
-- ============================================

-- ========================================
-- STEP 1: 기존 정책 삭제 (에러 무시 가능)
-- ========================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can view own actions" ON public.user_job_actions;
DROP POLICY IF EXISTS "Users can insert own actions" ON public.user_job_actions;
DROP POLICY IF EXISTS "Users can update own actions" ON public.user_job_actions;
DROP POLICY IF EXISTS "Users can view own keyword weights" ON public.keyword_weights;
DROP POLICY IF EXISTS "Users can insert own keyword weights" ON public.keyword_weights;
DROP POLICY IF EXISTS "Users can update own keyword weights" ON public.keyword_weights;
DROP POLICY IF EXISTS "Users can view own company preferences" ON public.company_preference;
DROP POLICY IF EXISTS "Users can insert own company preferences" ON public.company_preference;
DROP POLICY IF EXISTS "Users can update own company preferences" ON public.company_preference;
DROP POLICY IF EXISTS "Users can view own saved jobs" ON public.saved_jobs;
DROP POLICY IF EXISTS "Users can insert own saved jobs" ON public.saved_jobs;
DROP POLICY IF EXISTS "Users can update own saved jobs" ON public.saved_jobs;
DROP POLICY IF EXISTS "Users can delete own saved jobs" ON public.saved_jobs;
DROP POLICY IF EXISTS "Users can view own application status" ON public.application_status;
DROP POLICY IF EXISTS "Users can insert own application status" ON public.application_status;
DROP POLICY IF EXISTS "Users can update own application status" ON public.application_status;
DROP POLICY IF EXISTS "Users can delete own application status" ON public.application_status;
DROP POLICY IF EXISTS "Users can view own sent jobs" ON public.sent_jobs;
DROP POLICY IF EXISTS "Users can insert own sent jobs" ON public.sent_jobs;

-- ========================================
-- STEP 2: 구 테이블 삭제
-- ========================================

DROP TABLE IF EXISTS public.job_feedback CASCADE;
DROP TABLE IF EXISTS public.survey_responses CASCADE;

-- ========================================
-- STEP 3: 새 테이블 생성
-- ========================================

-- user_profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  name TEXT,
  kakao_id TEXT UNIQUE,
  avatar_url TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- user_preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  preferred_job_types JSONB,
  preferred_locations JSONB,
  career_level TEXT,
  preferred_company_sizes JSONB,
  preferred_industries JSONB,
  min_salary INTEGER,
  work_style JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- user_job_actions
CREATE TABLE IF NOT EXISTS public.user_job_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('pass', 'hold', 'apply')),
  company TEXT,
  job_title TEXT,
  location TEXT,
  keywords JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, job_id)
);

-- keyword_weights (기존 테이블이 있으면 건너뜀)
CREATE TABLE IF NOT EXISTS public.keyword_weights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  keyword TEXT NOT NULL,
  weight FLOAT DEFAULT 0,
  apply_count INTEGER DEFAULT 0,
  hold_count INTEGER DEFAULT 0,
  pass_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, keyword)
);

-- company_preference (기존 테이블이 있으면 건너뜀)
CREATE TABLE IF NOT EXISTS public.company_preference (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_name TEXT NOT NULL,
  preference_score FLOAT DEFAULT 0,
  apply_count INTEGER DEFAULT 0,
  hold_count INTEGER DEFAULT 0,
  pass_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, company_name)
);

-- saved_jobs
CREATE TABLE IF NOT EXISTS public.saved_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id TEXT NOT NULL,
  source TEXT NOT NULL,
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  location TEXT,
  link TEXT NOT NULL,
  deadline DATE,
  score INTEGER,
  reason TEXT,
  reasons JSONB,
  warnings JSONB,
  description TEXT,
  detail JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, job_id)
);

-- application_status
CREATE TABLE IF NOT EXISTS public.application_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  saved_job_id UUID REFERENCES public.saved_jobs(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'document_pass', 'interviewing', 'final', 'rejected', 'accepted', 'declined')),
  applied_date DATE,
  resume_version TEXT,
  cover_letter TEXT,
  notes TEXT,
  interview_dates JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, saved_job_id)
);

-- sent_jobs (기존 테이블이 있으면 건너뜀)
CREATE TABLE IF NOT EXISTS public.sent_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id TEXT NOT NULL,
  sent_date DATE DEFAULT CURRENT_DATE,
  was_shown BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, job_id)
);

-- ========================================
-- STEP 4: 인덱스 생성
-- ========================================

CREATE INDEX IF NOT EXISTS idx_user_job_actions_user_id ON public.user_job_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_job_actions_action ON public.user_job_actions(action);
CREATE INDEX IF NOT EXISTS idx_user_job_actions_created_at ON public.user_job_actions(created_at);

CREATE INDEX IF NOT EXISTS idx_keyword_weights_user_id ON public.keyword_weights(user_id);
CREATE INDEX IF NOT EXISTS idx_keyword_weights_weight ON public.keyword_weights(weight DESC);

CREATE INDEX IF NOT EXISTS idx_company_preference_user_id ON public.company_preference(user_id);
CREATE INDEX IF NOT EXISTS idx_company_preference_score ON public.company_preference(preference_score DESC);

CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON public.saved_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_deadline ON public.saved_jobs(deadline);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_created_at ON public.saved_jobs(created_at);

CREATE INDEX IF NOT EXISTS idx_application_status_user_id ON public.application_status(user_id);
CREATE INDEX IF NOT EXISTS idx_application_status_status ON public.application_status(status);

CREATE INDEX IF NOT EXISTS idx_sent_jobs_user_id ON public.sent_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_sent_jobs_sent_date ON public.sent_jobs(sent_date);

-- ========================================
-- STEP 5: RLS 활성화
-- ========================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_job_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keyword_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_preference ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sent_jobs ENABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 6: RLS 정책 생성
-- ========================================

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

-- ========================================
-- STEP 7: 트리거 생성
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_job_actions_updated_at ON public.user_job_actions;
CREATE TRIGGER update_user_job_actions_updated_at BEFORE UPDATE ON public.user_job_actions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_keyword_weights_updated_at ON public.keyword_weights;
CREATE TRIGGER update_keyword_weights_updated_at BEFORE UPDATE ON public.keyword_weights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_company_preference_updated_at ON public.company_preference;
CREATE TRIGGER update_company_preference_updated_at BEFORE UPDATE ON public.company_preference
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_saved_jobs_updated_at ON public.saved_jobs;
CREATE TRIGGER update_saved_jobs_updated_at BEFORE UPDATE ON public.saved_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_application_status_updated_at ON public.application_status;
CREATE TRIGGER update_application_status_updated_at BEFORE UPDATE ON public.application_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 완료!
-- ========================================
-- Table Editor에서 테이블 8개가 생성되었는지 확인하세요
