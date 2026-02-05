# 학력 정보 (Education) 필드 구현 완료

## ✅ 구현 완료 사항

### A. 데이터베이스 스키마
**파일**: `docs/add-education-field.sql`

- `jobs` 테이블에 `education TEXT` 컬럼 추가
- 인덱스 생성: `idx_jobs_education`
- 허용 값: `무관`, `고졸`, `전문대졸`, `학사`, `석사`, `박사`

**마이그레이션 실행**:
```sql
-- Supabase SQL Editor에서 실행
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS education TEXT;
CREATE INDEX IF NOT EXISTS idx_jobs_education ON jobs(education);
```

---

### B. 크롤러 업데이트
**파일**: `src/crawlers/zighang-full.js`

#### 추가된 함수:

1. **`extractEducation(recruitment, requirementsText)`**
   - RSC 객체에서 `education` 필드 직접 추출 (1순위)
   - 자격요건 텍스트에서 학력 키워드 검색 (2순위)
   - 키워드: `학력무관`, `박사`, `석사`, `학사/대졸`, `전문대졸`, `고졸`

2. **`normalizeEducation(education)`**
   - 다양한 학력 표현을 표준 형식으로 변환
   - 예: `"대졸"` → `"학사"`, `"4년제"` → `"학사"`

#### 수정된 부분:
- `fetchJobDetail()` 함수에서 `education` 필드 추출 및 반환

```javascript
const detail = parseDetailSections(contentText);
const education = extractEducation(recruitment, detail.requirements);

return {
  // ... 기존 필드들
  education,  // 학력 필드 추가
  // ...
};
```

---

### C. 필터 마스터 데이터
**파일**: `web/lib/filter-master-data.ts`

추가된 상수:
```typescript
export const EDUCATION_LEVELS = [
  '무관',
  '고졸',
  '전문대졸',
  '학사',
  '석사',
  '박사',
] as const
```

---

### D. API 필터링 로직
**파일**: `web/app/api/jobs/route.ts`

#### 1. 타입 정의 업데이트:

**JobRow 인터페이스**:
```typescript
interface JobRow {
  // ... 기존 필드들
  education: string | null  // 학력 추가
  // ...
}
```

**UserPreferences 인터페이스**:
```typescript
interface UserPreferences {
  // ... 기존 필드들
  preferred_education?: string[]  // 학력 필터 추가
}
```

#### 2. 필터링 로직 추가 (scoreJob 함수):

```typescript
// 3.7 학력 필터 (엄격한 필터링)
if (prefs.preferred_education?.length && job.education) {
  // '무관'은 모든 학력에 매칭됨
  const isFlexible = job.education === '무관' || prefs.preferred_education.includes('무관')
  const match = isFlexible || prefs.preferred_education.includes(job.education)
  
  if (!match) {
    matchesFilter = false
    warnings.push(`⚠️ ${job.education} 요구 (학력 불일치)`)
  } else if (!isFlexible) {
    reasons.push(`학력 ${job.education}`)
  }
}
```

**필터 로직 특징**:
- ✅ **OR 조건**: 사용자가 여러 학력을 선택하면, 하나라도 매치되면 통과
- ✅ **'무관' 특수 처리**: 
  - 공고가 "학력무관"이면 → 모든 사용자 필터에 매칭
  - 사용자가 "무관"을 선택하면 → 모든 공고에 매칭
- ✅ **엄격한 필터링**: 불일치 시 `matchesFilter = false`로 완전 제외

---

## 📊 동작 방식

### 필터링 예시

| 사용자 필터 | 공고 A: `학사` | 공고 B: `무관` | 공고 C: `석사` | 공고 D: `education: null` |
|---|---|---|---|---|
| `["학사"]` | ✅ 노출 | ✅ 노출 (무관) | ❌ 미노출 | ⚠️ 필터 적용 안 됨 |
| `["학사", "석사"]` | ✅ 노출 | ✅ 노출 (무관) | ✅ 노출 | ⚠️ 필터 적용 안 됨 |
| `["무관"]` | ✅ 노출 | ✅ 노출 | ✅ 노출 | ⚠️ 필터 적용 안 됨 |
| (선택 안 함) | ✅ 노출 | ✅ 노출 | ✅ 노출 | ✅ 노출 |

### 추출 우선순위

1. **1순위**: RSC 객체의 `recruitment.education` 필드
2. **2순위**: `detail.requirements` 텍스트에서 키워드 매칭
3. **기본값**: `null` (정보 없음)

### 학력 정규화 예시

| 원본 텍스트 | 정규화 결과 |
|---|---|
| `"대졸"` | `"학사"` |
| `"4년제"` | `"학사"` |
| `"전문학사"` | `"전문대졸"` |
| `"학력 무관"` | `"무관"` |
| `"석사 학위"` | `"석사"` |

---

## 🚀 배포 절차

### 1단계: 데이터베이스 마이그레이션
```bash
# Supabase SQL Editor에서 실행
\i docs/add-education-field.sql
```

### 2단계: 크롤러 재실행
```bash
# 새로운 education 필드로 데이터 크롤링
npm run crawler:zighang
```

### 3단계: 프론트엔드 필터 UI 추가 (TODO)
```typescript
// web/components/FilterModal.tsx 또는 유사 파일
import { EDUCATION_LEVELS } from '@/lib/filter-master-data'

// 학력 필터 UI 컴포넌트 추가
<FilterSection title="학력">
  {EDUCATION_LEVELS.map(level => (
    <FilterButton 
      key={level}
      selected={selectedEducation.includes(level)}
      onClick={() => toggleEducation(level)}
    >
      {level}
    </FilterButton>
  ))}
</FilterSection>
```

### 4단계: 필터 상태 관리 연결
```typescript
// 사용자 필터 저장 시 preferred_education 포함
const filters = {
  preferred_job_types: selectedJobTypes,
  preferred_locations: selectedLocations,
  preferred_education: selectedEducation,  // ✅ 추가
  // ... 기타 필터
}
```

---

## ⚠️ 주의사항

1. **기존 데이터**
   - 마이그레이션 후 기존 공고는 `education = NULL`
   - 크롤러 재실행으로 점진적으로 데이터 채워짐

2. **NULL 값 처리**
   - `job.education`이 `null`이면 필터 로직 실행 안 됨
   - 필터 조건: `if (prefs.preferred_education?.length && job.education)`

3. **'무관' 특수 처리**
   - 공고가 "무관" → 모든 학력 필터에 통과
   - 사용자가 "무관" 선택 → 모든 공고 통과
   - 양방향 유연성 제공

4. **프론트엔드 TODO**
   - FilterModal에 학력 필터 UI 추가 필요
   - 사용자 설정 저장/불러오기 로직 업데이트 필요

---

## 📝 테스트 체크리스트

- [ ] 데이터베이스 마이그레이션 실행 확인
- [ ] 크롤러로 샘플 데이터 수집 (education 필드 포함 확인)
- [ ] API `/jobs` 엔드포인트에서 education 필드 반환 확인
- [ ] 사용자 필터에 학력 선택 시 올바르게 필터링되는지 확인
- [ ] "무관" 선택 시 모든 공고 표시 확인
- [ ] 여러 학력 선택 시 OR 조건 동작 확인
- [ ] education이 NULL인 공고는 필터 미적용 확인

---

## 🔗 관련 파일

- `docs/add-education-field.sql` - 데이터베이스 마이그레이션
- `src/crawlers/zighang-full.js` - 크롤러 education 추출 로직
- `web/lib/filter-master-data.ts` - 학력 마스터 데이터
- `web/app/api/jobs/route.ts` - API 필터링 로직
- `docs/education-field-implementation.md` - 본 문서

---

## ✅ 구현 완료 확인

- [x] A. 학력 정보 (`education`) 추가
  - [x] RSC에서 `education` 데이터 추출
  - [x] DB `jobs` 테이블에 `education` 컬럼 추가 및 저장
  - [x] **필터 매핑**: 무관, 고졸, 전문대졸, 학사, 석사, 박사
  - [x] API 필터링 로직 구현 (OR 조건, '무관' 특수 처리)
  - [ ] 프론트엔드 UI 추가 (TODO)
