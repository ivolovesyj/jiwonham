-- ============================================
-- RLS 활성화 및 정책 추가 (테이블 생성 후 실행)
-- ============================================

-- 기존 정책 삭제
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

-- RLS 활성화
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_job_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keyword_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_preference ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sent_jobs ENABLE ROW LEVEL SECURITY;

-- user_profiles 정책
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- user_preferences 정책
CREATE POLICY "Users can view own preferences" ON public.user_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences" ON public.user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON public.user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- user_job_actions 정책
CREATE POLICY "Users can view own actions" ON public.user_job_actions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own actions" ON public.user_job_actions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own actions" ON public.user_job_actions
  FOR UPDATE USING (auth.uid() = user_id);

-- keyword_weights 정책
CREATE POLICY "Users can view own keyword weights" ON public.keyword_weights
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own keyword weights" ON public.keyword_weights
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own keyword weights" ON public.keyword_weights
  FOR UPDATE USING (auth.uid() = user_id);

-- company_preference 정책
CREATE POLICY "Users can view own company preferences" ON public.company_preference
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own company preferences" ON public.company_preference
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own company preferences" ON public.company_preference
  FOR UPDATE USING (auth.uid() = user_id);

-- saved_jobs 정책
CREATE POLICY "Users can view own saved jobs" ON public.saved_jobs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own saved jobs" ON public.saved_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own saved jobs" ON public.saved_jobs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own saved jobs" ON public.saved_jobs
  FOR DELETE USING (auth.uid() = user_id);

-- application_status 정책
CREATE POLICY "Users can view own application status" ON public.application_status
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own application status" ON public.application_status
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own application status" ON public.application_status
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own application status" ON public.application_status
  FOR DELETE USING (auth.uid() = user_id);

-- sent_jobs 정책
CREATE POLICY "Users can view own sent jobs" ON public.sent_jobs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sent jobs" ON public.sent_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
