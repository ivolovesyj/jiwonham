# Supabase 마이그레이션 가이드

## 📋 실행 순서

### 1단계: 구 테이블 삭제 (선택적)
Supabase Dashboard → SQL Editor → New Query

```sql
-- 구 테이블 삭제 (데이터 백업 후 실행!)
DROP TABLE IF EXISTS public.job_feedback CASCADE;
DROP TABLE IF EXISTS public.survey_responses CASCADE;
```

### 2단계: 새 테이블 생성
`docs/supabase-schema-v2.sql` 파일의 전체 내용을 복사해서 실행

**중요:**
- 이미 존재하는 테이블 (`keyword_weights`, `company_preference`, `sent_jobs`)은 `CREATE TABLE IF NOT EXISTS`로 되어 있어 안전합니다
- RLS 정책이 자동으로 설정됩니다
- 인덱스가 자동으로 생성됩니다

### 3단계: 테이블 확인
Table Editor에서 다음 테이블들이 생성되었는지 확인:

**새로 생성:**
- [ ] user_profiles
- [ ] user_preferences
- [ ] user_job_actions
- [ ] saved_jobs
- [ ] application_status

**기존 유지:**
- [ ] keyword_weights
- [ ] company_preference
- [ ] sent_jobs

### 4단계: 정책 확인
Authentication → Policies에서 각 테이블의 RLS 정책이 생성되었는지 확인

## ⚠️ 주의사항

1. **기존 데이터 백업**
   - 구 테이블을 삭제하기 전에 데이터를 백업하세요
   - SQL Editor에서: `SELECT * FROM public.job_feedback;`
   - Export 버튼으로 CSV 다운로드

2. **RLS 활성화 확인**
   - 모든 테이블에 RLS가 활성화되어야 합니다
   - 사용자는 자기 데이터만 접근 가능해야 합니다

3. **테스트**
   - 웹앱에서 실제로 데이터 저장이 되는지 확인
   - 브라우저 콘솔에서 에러 확인

## 🔍 문제 해결

### 에러: relation already exists
→ 정상입니다. `IF NOT EXISTS`로 인해 기존 테이블은 건너뜁니다.

### 에러: permission denied
→ RLS 정책이 제대로 설정되지 않았을 수 있습니다. 정책을 다시 생성하세요.

### 에러: foreign key violation
→ auth.users 테이블이 없을 수 있습니다. Supabase Auth가 활성화되어 있는지 확인하세요.
