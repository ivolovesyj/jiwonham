# 기업 유형 필터 구현 계획

## 개요
직항에서 기업 유형 정보를 크롤링하여 필터로 제공

## 기업 유형 분류
- 대기업
- 중견기업
- 중소기업
- 스타트업
- 유니콘
- 외국계
- 공공기관
- 기타

## 구현 단계

### 1단계: 데이터베이스 스키마 수정

#### jobs 테이블에 company_id 추가
```sql
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS company_id TEXT;
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON public.jobs(company_id);
```

#### companies 테이블 생성
```sql
CREATE TABLE public.companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  image TEXT,
  company_type TEXT,
  description TEXT,
  crawled_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2단계: 크롤러 수정

1. **공고 크롤링 시 company_id 저장**
   - `recruitment.company.id`를 jobs 테이블에 저장
   - 완료: `zighang-full.js` 수정됨

2. **기업 정보 크롤링**
   - DB에서 고유한 company_id 추출
   - 각 company_id로 `/company/{id}` 페이지 크롤링
   - `og:description`에서 기업 유형 추출
   - companies 테이블에 저장

### 3단계: API 수정

1. **필터 API** (`/api/filters`)
   - `company_types` 옵션 추가
   - companies 테이블에서 고유한 company_type 목록 반환

2. **Jobs API** (`/api/jobs`)
   - `preferred_company_types` 필터 추가
   - jobs와 companies를 JOIN하여 필터링
   - 매칭 시 점수 가산

### 4단계: UI 수정

1. **FilterModal**
   - 기업 유형 선택 옵션 추가
   - 5번째 카테고리로 추가

2. **OnboardingModal**
   - 온보딩에 기업 유형 선택 단계 추가

## 기업 유형 추출 로직

```javascript
function extractCompanyType(description) {
  // og:description 예시:
  // "네이버웹툰(유)은 2020년에 설립된 외감 대기업으로, ..."

  const desc = description.toLowerCase();

  if (desc.includes('외국계') || desc.includes('외자계')) return '외국계';
  if (desc.includes('공공기관') || desc.includes('공기업')) return '공공기관';
  if (desc.includes('유니콘')) return '유니콘';
  if (desc.includes('대기업')) return '대기업';
  if (desc.includes('중견기업') || desc.includes('중견')) return '중견기업';
  if (desc.includes('중소기업') || desc.includes('중소')) return '중소기업';
  if (desc.includes('스타트업') || desc.includes('벤처')) return '스타트업';

  return '기타';
}
```

## 크롤링 스크립트

### 기존 공고 데이터에 company_id 추가
```bash
npm run crawl:update
```

### 기업 정보 크롤링
```bash
npm run crawl:companies
```

## 예상 소요 시간
- 고유 기업 수: 약 5,000~10,000개 추정
- 크롤링 속도: 초당 3개 (300ms 딜레이)
- 예상 시간: 30~60분

## 데이터 품질
- 기업 유형이 없는 경우: "기타"로 분류
- 정확도: og:description 기반이므로 85~90% 예상
- 업데이트 주기: 주 1회 (신규 기업 추가 시)
