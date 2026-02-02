-- application_status 테이블에 required_documents 컬럼 추가

-- 1. required_documents 컬럼 추가 (JSONB 타입)
ALTER TABLE application_status
ADD COLUMN IF NOT EXISTS required_documents JSONB;

-- 2. 컬럼 코멘트 추가
COMMENT ON COLUMN application_status.required_documents IS '필요 서류 정보 (이력서, 자기소개서, 포트폴리오 상태)';

-- 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'application_status'
ORDER BY ordinal_position;
