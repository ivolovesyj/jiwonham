-- ============================================================
-- 학력 정보 필드 추가 마이그레이션
-- ============================================================

-- jobs 테이블에 education 컬럼 추가
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS education TEXT;

-- education 컬럼 인덱스 추가 (필터링 성능 향상)
CREATE INDEX IF NOT EXISTS idx_jobs_education ON jobs(education);

-- 학력 필터 enum 제약조건 (선택사항)
-- ALTER TABLE jobs ADD CONSTRAINT jobs_education_check 
--   CHECK (education IS NULL OR education IN ('무관', '고졸', '전문대졸', '학사', '석사', '박사'));

-- 주의사항:
-- 1. 기존 데이터는 education = NULL로 유지됨
-- 2. 크롤러 업데이트 후 새로운 데이터부터 education 값이 채워짐
-- 3. 필요시 기존 데이터는 detail.requirements에서 추출하여 역산 가능
