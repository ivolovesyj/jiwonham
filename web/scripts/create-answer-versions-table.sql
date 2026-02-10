-- 자소서 답변 버전 관리 테이블
CREATE TABLE IF NOT EXISTS public.cover_letter_answer_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.cover_letter_questions(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(question_id, version_number)
);

-- RLS 활성화
ALTER TABLE public.cover_letter_answer_versions ENABLE ROW LEVEL SECURITY;

-- RLS 정책
CREATE POLICY "Users can view their own answer versions"
  ON public.cover_letter_answer_versions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own answer versions"
  ON public.cover_letter_answer_versions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own answer versions"
  ON public.cover_letter_answer_versions FOR DELETE
  USING (auth.uid() = user_id);

-- 인덱스
CREATE INDEX idx_answer_versions_question_id ON public.cover_letter_answer_versions(question_id);
CREATE INDEX idx_answer_versions_user_id ON public.cover_letter_answer_versions(user_id);
