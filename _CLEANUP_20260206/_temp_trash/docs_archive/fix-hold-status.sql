-- application_status 테이블의 CHECK constraint에 'hold' 추가

-- 기존 constraint 삭제
ALTER TABLE public.application_status
DROP CONSTRAINT IF EXISTS application_status_status_check;

-- 새로운 constraint 추가 (hold 포함)
ALTER TABLE public.application_status
ADD CONSTRAINT application_status_status_check
CHECK (status IN ('pending', 'hold', 'applied', 'document_pass', 'interviewing', 'final', 'rejected', 'accepted', 'declined'));
