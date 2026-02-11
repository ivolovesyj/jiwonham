-- ============================================
-- 기존 테이블 삭제 후 재생성
-- ============================================

-- 기존 구조가 다른 테이블들 삭제
DROP TABLE IF EXISTS public.keyword_weights CASCADE;
DROP TABLE IF EXISTS public.company_preference CASCADE;
DROP TABLE IF EXISTS public.sent_jobs CASCADE;

-- 새 구조로 테이블 재생성
CREATE TABLE public.keyword_weights (
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

CREATE TABLE public.company_preference (
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

CREATE TABLE public.sent_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id TEXT NOT NULL,
  sent_date DATE DEFAULT CURRENT_DATE,
  was_shown BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, job_id)
);

-- 인덱스 생성
CREATE INDEX idx_keyword_weights_user_id ON public.keyword_weights(user_id);
CREATE INDEX idx_keyword_weights_weight ON public.keyword_weights(weight DESC);
CREATE INDEX idx_company_preference_user_id ON public.company_preference(user_id);
CREATE INDEX idx_company_preference_score ON public.company_preference(preference_score DESC);
CREATE INDEX idx_sent_jobs_user_id ON public.sent_jobs(user_id);
CREATE INDEX idx_sent_jobs_sent_date ON public.sent_jobs(sent_date);
