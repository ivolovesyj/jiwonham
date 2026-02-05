# 기업 유형 실시간 크롤링 구현 완료

## ✅ 구현 완료 사항

### 변경 사항 요약
기존에는 별도 회사 DB를 사용했으나, **크롤링 시 실시간 수집**으로 변경하여 최신 정보를 보장합니다.

**수집 항목**: 회사 유형만 수집 (회사 주소는 수집하지 않음)

---

## 📦 구현된 파일들

### 1. 데이터베이스 스키마
**파일**: `docs/add-company-fields.sql`

- `jobs` 테이블에 `company_type TEXT` 컬럼 추가 (기본값: '중소기업')
- 인덱스 생성: `idx_jobs_company_type`

**마이그레이션 실행**:
```sql
-- Supabase SQL Editor에서 실행
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company_type TEXT DEFAULT '중소기업';
CREATE INDEX IF NOT EXISTS idx_jobs_company_type ON jobs(company_type);
```

---

### 2. 크롤러 업데이트
**파일**: `src/crawlers/zighang-full.js`

#### 추가된 함수: `fetchCompanyDetail(companyId)`

회사 상세 페이지 (`https://zighang.com/company/{company_id}`)를 크롤링하여 회사 유형을 추출합니다.

```javascript
async function fetchCompanyDetail(companyId) {
  try {
    const companyUrl = `${BASE_URL}/company/${companyId}`;
    const response = await axios.get(companyUrl, { ... });
    
    const html = response.data;
    const fullRsc = /* RSC 파싱 */;
    
    // 회사 유형 추출 (meta keywords에서)
    let company_type = '중소기업'; // 기본값
    const keywordsMatch = fullRsc.match(/\["meta","3",\{"name":"keywords","content":"([^"]+)"\}\]/);
    if (keywordsMatch) {
      const keywords = keywordsMatch[1].split(',').map(k => k.trim());
      // 뒤에서 두 번째 항목이 회사 유형
      if (keywords.length >= 2) {
        const potentialType = keywords[keywords.length - 2];
        const validTypes = ['대기업', '중견기업', '중소기업', '스타트업', '유니콘', '외국계', '공기업'];
        if (validTypes.includes(potentialType)) {
          company_type = potentialType;
        }
      }
    }
    
    return { company_type };
  } catch (error) {
    // Fallback 값 반환
    return { company_type: '중소기업' };
  }
}
```

#### 수정된 함수: `fetchJobDetail(entry)`

`hasDetailInfo` 분기 처리 추가:

```javascript
if (recruitment) {
  // ... 기존 코드
  
  // 회사 유형 추출 (hasDetailInfo 분기 처리)
  let company_type = '중소기업'; // 기본값
  
  const companyId = recruitment.company?.id;
  const hasDetailInfo = recruitment.company?.hasDetailInfo;
  
  if (companyId && hasDetailInfo === true) {
    // hasDetailInfo가 true면 회사 상세 페이지 크롤링
    console.log(`  ℹ️  회사 상세 정보 크롤링: ${recruitment.company?.name} (${companyId})`);
    const companyDetail = await fetchCompanyDetail(companyId);
    company_type = companyDetail.company_type;
  } else {
    // hasDetailInfo가 false이거나 없으면 fallback
    console.log(`  ⚠️  회사 상세 정보 없음, 기본값 사용: ${recruitment.company?.name}`);
  }
  
  return {
    // ... 기존 필드들
    company_type,  // 추가
    // ...
  };
}
```

#### Fallback 로직 (LD+JSON) 업데이트

RSC 파싱이 실패한 경우의 fallback에도 기본값 추가:

```javascript
return {
  // ... 기존 필드들
  company_type: '중소기업',  // fallback 기본값
  // ...
};
```

---

### 3. API 업데이트
**파일**: `web/app/api/jobs/route.ts`

#### 타입 정의 업데이트:

**JobRow 인터페이스**:
```typescript
interface JobRow {
  // ... 기존 필드들
  company_type: string | null  // 기업 유형 추가
  // ...
}
```

#### API 응답 객체 업데이트:

게스트 모드와 로그인 모드 모두 응답에 추가:

```typescript
return {
  id: job.id,
  company: job.company,
  company_image: job.company_image,
  company_type: job.company_type,  // ✅ 추가
  title: job.title,
  // ... 기타 필드들
}
```

---

## 🎯 동작 방식

### 분기 처리 로직

```
공고 크롤링 시작
  ↓
RSC에서 recruitment 객체 추출
  ↓
company.hasDetailInfo 확인
  ↓
┌─────────────────────────────┬──────────────────────────────┐
│ hasDetailInfo === true      │ hasDetailInfo === false/null │
├─────────────────────────────┼──────────────────────────────┤
│ 1. company_id 추출          │ 1. company_type = '중소기업' │
│ 2. fetchCompanyDetail() 호출│ 2. 기본값 사용               │
│ 3. 회사 페이지 크롤링       │                              │
│    - meta keywords 파싱     │                              │
│ 4. company_type 추출        │                              │
└─────────────────────────────┴──────────────────────────────┘
  ↓
jobs 테이블에 저장
  ↓
API 응답에 포함
```

---

## 📊 회사 유형 추출 로직

### Meta Keywords 파싱

**위치**: 회사 페이지 RSC의 `["$","meta","3",{...}]`

**예시**:
```json
["$","meta","3",{"name":"keywords","content":"채용,구인구직,취업,이력서,면접,기업정보,회사정보,인투셀,스타트업,대전"}]
```

**추출 과정**:
1. `content` 값을 쉼표로 분리: 
   ```
   ["채용","구인구직","취업","이력서","면접","기업정보","회사정보","인투셀","스타트업","대전"]
   ```
2. 배열의 **뒤에서 두 번째 항목** 추출: `"스타트업"`
3. 유효한 회사 유형인지 검증: `['대기업', '중견기업', '중소기업', '스타트업', '유니콘', '외국계', '공기업']`
4. 유효하면 사용, 아니면 기본값 `'중소기업'`

### 유효한 회사 유형

- 대기업
- 중견기업
- 중소기업
- 스타트업
- 유니콘
- 외국계
- 공기업

---

## 🔄 기존 데이터 처리

### 마이그레이션 후
- 기존 공고: `company_type = '중소기업'`
- 크롤러 재실행 후 새 데이터부터 실제 값 채워짐

### 선택적 업데이트
기존 데이터를 업데이트하려면:
1. 크롤러 재실행으로 자동 업데이트
2. 또는 별도 스크립트로 기존 공고의 `company_id` 이용하여 회사 정보 재수집

---

## ⚙️ 성능 고려사항

### 추가 요청 수
- `hasDetailInfo = true`인 공고만 회사 상세 페이지 크롤링
- 예상 비율: 약 50~80% (추정)
- 동일 회사의 여러 공고는 첫 번째만 크롤링하도록 캐싱 가능 (선택사항)

### 크롤링 속도
- 회사 페이지 크롤링: 평균 500ms~1초 추가
- 동시성 제어: `CONCURRENCY = 5` 유지
- 딜레이: `DELAY_MS = 300ms` 유지

### 최적화 방안 (선택사항)
```javascript
// 회사 정보 캐시 (메모리)
const companyCache = new Map();

async function fetchCompanyDetailCached(companyId) {
  if (companyCache.has(companyId)) {
    return companyCache.get(companyId);
  }
  
  const detail = await fetchCompanyDetail(companyId);
  companyCache.set(companyId, detail);
  return detail;
}
```

---

## 🚀 배포 절차

### 1단계: 데이터베이스 마이그레이션
```bash
# Supabase SQL Editor에서 실행
\i docs/add-company-fields.sql
```

### 2단계: 크롤러 재실행
```bash
# 새로운 company_type 필드로 데이터 크롤링
npm run crawler:zighang
```

### 3단계: API 확인
```bash
# API 응답에 company_type 포함 확인
curl http://localhost:3000/api/jobs | jq '.jobs[0] | {company, company_type}'
```

---

## 📝 테스트 체크리스트

- [ ] 데이터베이스 마이그레이션 실행 확인
- [ ] 크롤러로 샘플 데이터 수집 (company_type 포함 확인)
- [ ] `hasDetailInfo = true`인 공고: 실제 회사 정보 크롤링 확인
- [ ] `hasDetailInfo = false`인 공고: 기본값 사용 확인
- [ ] API `/jobs` 엔드포인트에서 company_type 반환 확인
- [ ] 회사 유형 필터링 동작 확인 (기존 기능)
- [ ] meta keywords에서 회사 유형 정확히 추출되는지 확인

---

## 🔗 관련 파일

- `docs/add-company-fields.sql` - 데이터베이스 마이그레이션
- `src/crawlers/zighang-full.js` - 크롤러 회사 유형 추출 로직
- `web/app/api/jobs/route.ts` - API company_type 필드 전달
- `docs/company-info-realtime-crawling.md` - 본 문서

---

## ✅ 구현 완료 확인

- [x] B. 기업 유형 실시간 크롤링 방식 변경
  - [x] 상세 페이지 수집 분기 처리 (`hasDetailInfo`)
    - [x] `true`: `https://zighang.com/company/{company_id}` 추가 요청
    - [x] `false`: 기본값 사용 (회사 유형: '중소기업')
  - [x] 상세 페이지 파싱 로직 (RSC 파싱)
    - [x] 회사 유형 추출: meta keywords 뒤에서 두 번째 항목
  - [x] DB 스키마 업데이트 (`company_type`)
  - [x] API 응답에 필드 추가
  - [x] Fallback 로직 구현

---

## 📌 주의사항

1. **회사 주소는 수집하지 않음**
   - 회사 유형만 크롤링하여 저장

2. **기존 companies 테이블과의 관계**
   - 기존에 별도 companies 테이블이 있었다면 제거 가능
   - 또는 유지하되 jobs 테이블의 실시간 데이터를 우선 사용

3. **hasDetailInfo 필드**
   - RSC의 `recruitment.company.hasDetailInfo` 확인 필요
   - 값이 없거나 false면 기본값 사용

4. **유효한 회사 유형**
   - 매핑: 대기업, 중견기업, 중소기업, 스타트업, 유니콘, 외국계, 공기업
   - 기타 값이면 기본값 '중소기업' 사용

5. **에러 처리**
   - 회사 페이지 크롤링 실패 시 기본값 사용
   - 타임아웃: 10초
   - 404 에러는 정상 처리 (회사 정보 없음)
