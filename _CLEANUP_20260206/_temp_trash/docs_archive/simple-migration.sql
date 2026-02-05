-- ============================================
-- 간단 마이그레이션 - 테이블 생성만
-- ============================================

-- 구 테이블 삭제
DROP TABLE IF EXISTS public.job_feedback CASCADE;
DROP TABLE IF EXISTS public.survey_responses CASCADE;

-- 새 테이블 생성
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

CREATE TABLE IF NOT EXISTS public.sent_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id TEXT NOT NULL,
  sent_date DATE DEFAULT CURRENT_DATE,
  was_shown BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, job_id)
);
