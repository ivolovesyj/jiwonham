-- ============================================================
-- 회사 유형 필드 추가 마이그레이션
-- (크롤링 시 실시간 수집 방식으로 변경)
-- ============================================================

-- jobs 테이블에 company_type 컬럼 추가
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company_type TEXT DEFAULT '중소기업';

-- company_type 컬럼 인덱스 추가 (필터링 성능 향상)
CREATE INDEX IF NOT EXISTS idx_jobs_company_type ON jobs(company_type);

-- 회사 유형 enum 제약조건 (선택사항)
-- ALTER TABLE jobs ADD CONSTRAINT jobs_company_type_check 
--   CHECK (company_type IN ('대기업', '중견기업', '중소기업', '스타트업', '유니콘', '외국계', '공기업', '기타'));

-- 주의사항:
-- 1. 기존 데이터는 company_type = '중소기업'으로 설정됨
-- 2. 크롤러 업데이트 후 새로운 데이터부터 실제 값이 채워짐
-- 3. hasDetailInfo = true인 공고만 회사 상세 페이지 크롤링 수행
-- 4. hasDetailInfo = false 또는 없는 경우 기본값 사용

-- 기존 company_type 필드가 있다면 제거하지 않고 유지
-- (기존에 companies 테이블에서 가져온 데이터가 있을 수 있음)
