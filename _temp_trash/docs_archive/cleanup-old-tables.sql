-- ============================================
-- 구 테이블 정리 SQL
-- 실행 전 데이터 백업 권장!
-- ============================================

-- 삭제할 구 테이블들
DROP TABLE IF EXISTS public.job_feedback CASCADE;
DROP TABLE IF EXISTS public.survey_responses CASCADE;

-- 참고: keyword_weights, company_preference, sent_jobs는 유지
-- 새 스키마에서 활용됨
