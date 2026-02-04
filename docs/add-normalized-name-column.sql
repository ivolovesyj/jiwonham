-- companies 테이블에 normalized_name 컬럼 추가
-- 정규화된 회사명으로 빠른 매칭을 위한 컬럼

ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS normalized_name TEXT;

-- 인덱스 추가 (JOIN 성능 향상)
CREATE INDEX IF NOT EXISTS idx_companies_normalized_name ON public.companies(normalized_name);

-- 기존 데이터에 normalized_name 생성
-- (주), ㈜, 주식회사 등 제거하고 공백/소문자 정규화
UPDATE public.companies
SET normalized_name = LOWER(
  TRIM(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(name, '\(주\)', '', 'g'),
          '\(유\)', '', 'g'),
        '㈜', '', 'g'),
      '주식회사', '', 'g'),
    '유한회사', '', 'g')
  )
)
WHERE normalized_name IS NULL;
