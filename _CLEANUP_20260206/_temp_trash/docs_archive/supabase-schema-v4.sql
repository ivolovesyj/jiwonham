-- ============================================================
-- 지원관리 고도화 마이그레이션 (Phase 2~4)
-- Supabase SQL Editor에서 실행
-- ============================================================

-- Phase 2: 핀 고정
ALTER TABLE saved_jobs ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE saved_jobs ADD COLUMN IF NOT EXISTS pin_order INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_saved_jobs_pinned ON saved_jobs(user_id, is_pinned DESC, pin_order ASC);

-- Phase 3: 외부 공고
ALTER TABLE saved_jobs ADD COLUMN IF NOT EXISTS is_external BOOLEAN DEFAULT FALSE;
ALTER TABLE saved_jobs ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Phase 4: 지원안함 상태 추가
-- application_status의 status CHECK 제약조건 업데이트
-- (기존 CHECK가 있으면 삭제 후 재생성)
DO $$
BEGIN
  -- 기존 CHECK 제약조건 삭제 시도
  BEGIN
    ALTER TABLE application_status DROP CONSTRAINT IF EXISTS application_status_status_check;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- 새 CHECK 추가 (passed 포함)
  ALTER TABLE application_status ADD CONSTRAINT application_status_status_check
    CHECK (status IN ('passed','pending','hold','not_applying','applied','document_pass','interviewing','final','rejected','accepted','declined'));
END $$;
