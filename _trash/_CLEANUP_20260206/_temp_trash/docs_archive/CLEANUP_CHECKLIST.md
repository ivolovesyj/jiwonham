# 🧹 정리 체크리스트

## Supabase 테이블 정리

### ✅ 실행할 SQL
Supabase Dashboard → SQL Editor에서 실행:

```sql
-- 1. 구 테이블 삭제
DROP TABLE IF EXISTS public.job_feedback CASCADE;
DROP TABLE IF EXISTS public.survey_responses CASCADE;

-- 2. 새 테이블 생성
-- docs/supabase-schema-v2.sql 파일 내용 전체 실행
```

### 📋 테이블 상태

**삭제할 테이블:**
- [x] `job_feedback` - user_job_actions로 대체됨
- [x] `survey_responses` - 개발 단계에서 불필요

**유지할 기존 테이블:**
- [x] `keyword_weights` - 학습에 사용
- [x] `company_preference` - 회사 선호도 학습
- [x] `sent_jobs` - 공고 중복 발송 방지

**새로 생성할 테이블:**
- [ ] `user_profiles` - 사용자 기본 정보
- [ ] `user_preferences` - 초기 필터 설정
- [ ] `user_job_actions` - 선택 이력
- [ ] `saved_jobs` - 지원 예정 공고
- [ ] `application_status` - 지원 현황

## 파일 정리

### ✅ 완료된 작업
- [x] 임시 테스트 파일 삭제
  - test-deadline.js
  - test-zighang-deadline.js
  - test-zighang-detail.js

- [x] 구 스키마 파일 삭제
  - feedback-schema.sql
  - supabase-setup.sql

- [x] 중복 데이터 파일 삭제
  - data/wanted_page*.json
  - data/wanted_p*.json
  - data/wanted_raw.json
  - data/wanted_marketing.json

### 📁 현재 파일 구조
```
✅ 유지할 파일:
- data/filtered_jobs.json (API에서 사용 중)
- data/wanted_jobs.json (최신 크롤링 데이터)
- data/zighang_jobs.json (최신 크롤링 데이터)

📄 새로 생성된 문서:
- docs/supabase-schema-v2.sql (최신 스키마)
- docs/cleanup-old-tables.sql (정리용 SQL)
- docs/PROJECT_STRUCTURE.md (프로젝트 구조 문서)
- docs/CLEANUP_CHECKLIST.md (이 파일)
```

## survey/ 폴더

**옵션 1: 유지**
- 초기 온보딩 페이지로 활용 가능
- user_preferences 데이터 수집용

**옵션 2: 삭제**
- 온보딩을 웹앱 내에서 구현할 경우

**결정 필요** - 사용자 선택 대기

## 다음 단계

1. [ ] Supabase에서 새 스키마 실행
2. [ ] 테이블 생성 확인
3. [ ] 구 테이블 삭제
4. [ ] 웹앱 코드에서 새 테이블 사용하도록 수정
