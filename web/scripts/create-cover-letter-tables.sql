-- =============================================
-- 자기소개서 기능 테이블 생성
-- =============================================

-- 1. 경험 소재 뱅크
CREATE TABLE IF NOT EXISTS experience_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  experience_type TEXT NOT NULL DEFAULT '기타',
  content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. 자소서 질문 DB
CREATE TABLE IF NOT EXISTS cover_letter_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  saved_job_id UUID REFERENCES saved_jobs(id) ON DELETE SET NULL,
  question_type TEXT NOT NULL DEFAULT '지원 동기',
  question TEXT NOT NULL,
  char_limit INTEGER,
  include_space BOOLEAN NOT NULL DEFAULT true,
  answer TEXT,
  jd_info TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_experience_materials_user_id ON experience_materials(user_id);
CREATE INDEX IF NOT EXISTS idx_cover_letter_questions_user_id ON cover_letter_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_cover_letter_questions_saved_job_id ON cover_letter_questions(saved_job_id);

-- RLS 활성화
ALTER TABLE experience_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE cover_letter_questions ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 본인 데이터만 접근
CREATE POLICY "Users can manage own experience_materials"
  ON experience_materials FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own cover_letter_questions"
  ON cover_letter_questions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
