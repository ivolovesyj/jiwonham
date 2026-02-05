# 🤖 Gemini AI - 직항(Zighang) 크롤러 개발 인수인계서

## 📌 프로젝트 개요

**목적**: 직항(zighang.com) 채용 공고를 크롤링하여 사용자 맞춤형 추천 시스템에 활용

**현재 상태**:
- RSC Flight Data 파싱 위주로 구현됨
- RSC 실패 시 LD+JSON fallback 있으나 필드 부족으로 필터링 탈락 문제 발생

**개선 목표**:
- RSC 실패 시에도 LD+JSON + CSS Selector로 필수 필드 확보
- 최종 수집률 96% 이상 달성

---

## 📂 프로젝트 구조

```
채용공고/
├── src/
│   ├── crawlers/
│   │   ├── zighang-full.js          # 전체 크롤러 (사이트맵 기반)
│   │   └── zighang.js                # 검색 기반 크롤러
│   ├── index.js                      # 메인 실행 파일
│   └── filters/                      # 필터링 로직
├── web/
│   └── app/api/jobs/route.ts         # 추천 알고리즘 (점수 계산)
└── data/
    └── zighang_jobs.json             # 크롤링 결과 (참고용)
```

---

## 🎯 수집 필수 항목 (100% 수집 목표)

### **최우선 항목**
| 필드명 | DB 컬럼 | 예시 값 | 필터링 사용 |
|--------|---------|---------|-----------|
| 제목 | `title` | "Operation Leader" | - |
| 기업명 | `company` | "넥스트증권" | - |
| 직무 (대분류) | `depth_ones` | ["금융_보험"] | ✅ 직무 필터 (5점) |
| 직무 (중분류) | `depth_twos` | ["증권_운용"] | ✅ 직무 필터 (15점) |
| 요구 경력 | `career_min` | 7 | ✅ 경력 필터 (필수) |
| 지역 | `regions` | ["서울"] | ✅ 지역 필터 (필수) |
| 고용형태 | `employee_types` | ["정규직"] | ✅ 고용형태 필터 |
| 기업유형 | `company_type` | "대기업" | ✅ 기업유형 필터 |
| 담당업무 | `detail.main_tasks` | "증권사 운영본부 조직..." | 추천 알고리즘 |
| 자격요건 | `detail.requirements` | "대졸 이상, 경력 7년..." | 추천 알고리즘 |
| 마감일 | `deadline_type`, `end_date` | "채용시마감", null | 표시용 |

### **추가 수집 항목**
- 주소: 회사 상세 주소 (OO구 정보)
- 접수방법: 이메일, 홈페이지 등

---

## 🔍 데이터 수집 3가지 방식

### **1. RSC Flight Data** (최우선, 가장 풍부)

**위치**: HTML 내 `<script>` 태그의 `self.__next_f.push([1,"..."])`

**추출 방법**:
```javascript
// 정규식으로 모든 chunks 추출
const regex = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;

// 디코딩
const decoded = chunk
  .replace(/\\n/g, '\n')
  .replace(/\\"/g, '"')
  .replace(/\\\\/g, '\\');

// "recruitment":{...} JSON 객체 찾기
const recruitStart = fullRsc.indexOf('"recruitment":{');
```

**얻을 수 있는 필드**:
```json
{
  "company": { "name": "넥스트증권", "id": "uuid" },
  "title": "Operation Leader",
  "depthOnes": ["금융_보험"],
  "depthTwos": ["증권_운용"],
  "keywords": ["리더십", "프로젝트관리"],
  "careerMin": 7,
  "careerMax": 100,
  "regions": ["서울"],
  "employeeTypes": ["정규직"],
  "deadlineType": "채용시마감",
  "endDate": null,
  "content": { "type": "doc", "content": [...] }  // ProseMirror JSON
}
```

**현재 문제**:
- RSC 디코딩 중 JSON 파싱 에러 발생 (Bad escaped character)
- 성공률 약 70%

---

### **2. LD+JSON** (표준 Schema.org)

**위치**: `<script type="application/ld+json">`

**선택 방법**:
```javascript
// CSS Selector
const selector = 'body > div.flex > main > div > div > script:nth-child(1)';
const script = document.querySelector(selector);
const data = JSON.parse(script.textContent);
```

**얻을 수 있는 필드**:
```json
{
  "@type": "JobPosting",
  "title": "요양보호사 구인",
  "hiringOrganization": { "name": "금강노인복지센터" },
  "employmentType": ["FULL_TIME"],  // ⚠️ 매핑 필요: FULL_TIME → 정규직
  "jobLocation": [{
    "address": { "addressLocality": "충남" }
  }],
  "experienceRequirements": "84 months",  // ⚠️ 텍스트 파싱 필요
  "description": "담당업무 및 자격요건..."
}
```

**한계**:
- ❌ `depthOnes`, `depthTwos` 없음
- ❌ `keywords` 없음
- ❌ `careerMin` 없음 (experienceRequirements는 문자열)
- ❌ `company_type` 없음

---

### **3. CSS Selector** (DOM 직접 파싱)

**공고 요약 박스**:
```javascript
// Selector
const items = document.querySelectorAll('div.bg-subtle.grid > div');

// 결과 예시
[
  "경력무관",        // 0: 경력
  "정규직",          // 1: 채용유형
  "무관",            // 2: 학력
  "충남",            // 3: 지역
  "채용시마감",      // 4: 마감일
  "고용24"           // 5: 출처
]
```

**섹션 헤더 기반 본문 추출**:
```javascript
const sections = {};
document.querySelectorAll('h3').forEach(h3 => {
  const title = h3.textContent.trim();
  const content = h3.nextElementSibling?.textContent;

  if (title.includes('담당업무')) sections.main_tasks = content;
  else if (title.includes('자격요건')) sections.requirements = content;
  else if (title.includes('우대')) sections.preferred_points = content;
  else if (title.includes('근무조건')) sections.work_conditions = content;
  else if (title.includes('접수방법')) sections.application_method = content;
});
```

**한계**:
- ⚠️ CSS class나 DOM 구조가 변경되면 깨짐
- ⚠️ 텍스트 파싱 필요 (예: "경력무관" → `careerMin: 0`)

---

## 📋 필수 구현 사항

### **1. 경력 텍스트 파싱 함수**

```javascript
function parseCareer(text) {
  if (!text) return null;

  // "경력무관", "신입" 등
  if (/무관|신입|경력\s*없/i.test(text)) return 0;

  // "1년~3년", "3-5년"
  const rangeMatch = text.match(/(\d+)\s*[년~-]\s*(\d+)/);
  if (rangeMatch) return parseInt(rangeMatch[1]);

  // "84 months" (LD+JSON)
  const monthMatch = text.match(/(\d+)\s*months?/i);
  if (monthMatch) return Math.floor(parseInt(monthMatch[1]) / 12);

  // "5년 이상"
  const yearMatch = text.match(/(\d+)\s*년/);
  if (yearMatch) return parseInt(yearMatch[1]);

  return null;
}
```

**테스트 케이스**:
```javascript
parseCareer("경력무관")        // → 0
parseCareer("신입")            // → 0
parseCareer("1년~3년")         // → 1
parseCareer("84 months")       // → 7
parseCareer("5년 이상")        // → 5
```

---

### **2. 고용형태 매핑 함수**

```javascript
function mapEmploymentType(ldJsonType) {
  const mapping = {
    'FULL_TIME': '정규직',
    'PART_TIME': '파트타임',
    'CONTRACT': '계약직',
    'INTERN': '인턴',
    'TEMPORARY': '임시직'
  };

  if (Array.isArray(ldJsonType)) {
    return ldJsonType.map(t => mapping[t] || t);
  }

  return [mapping[ldJsonType] || ldJsonType];
}
```

---

### **3. OG 태그에서 depth_twos 추출**

```javascript
function extractDepthTwosFromOgTitle(ogTitle) {
  // 예: "[넥스트증권] Operation Leader 채용 | 증권_운용"
  const match = ogTitle.match(/\|\s*(.+)$/);
  if (match) {
    return [match[1].trim()];  // ["증권_운용"]
  }
  return [];
}
```

---

### **4. 3단계 Fallback 로직**

```javascript
export async function fetchJobDetail(entry) {
  const response = await axios.get(entry.url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    timeout: 10000,
  });

  const html = response.data;
  const $ = cheerio.load(html);

  // ========================================
  // 1차: RSC Flight Data 추출
  // ========================================
  const rscData = extractRecruitmentFromRsc(html);

  if (rscData && rscData.depthOnes && rscData.depthTwos && rscData.careerMin !== undefined) {
    // ✅ 모든 필수 필드 확보
    return {
      id: entry.id,
      source: 'zighang',
      company: rscData.company?.name,
      company_id: rscData.company?.id,
      title: rscData.title,
      depth_ones: rscData.depthOnes,
      depth_twos: rscData.depthTwos,
      keywords: rscData.keywords || [],
      career_min: rscData.careerMin,
      career_max: rscData.careerMax,
      regions: rscData.regions,
      employee_types: rscData.employeeTypes,
      deadline_type: rscData.deadlineType,
      end_date: rscData.endDate,
      detail: parseDetailSections(prosemirrorToText(rscData.content)),
      crawled_at: new Date().toISOString(),
      is_active: rscData.status === 'ACTIVE',
    };
  }

  console.log(`  ⚠️ RSC 추출 실패 또는 불완전, Fallback 시도: ${entry.id}`);

  // ========================================
  // 2차: LD+JSON + CSS Selector 조합
  // ========================================
  let ldJson = null;
  $('script[type="application/ld+json"]').each((i, el) => {
    try {
      const data = JSON.parse($(el).html());
      if (data['@type'] === 'JobPosting') {
        ldJson = data;
      }
    } catch {}
  });

  if (ldJson) {
    console.log(`  ✅ LD+JSON 발견, CSS로 보강: ${entry.id}`);

    // CSS Selector로 추가 데이터 수집
    const cssData = extractWithCssSelectors($);
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const ogDesc = $('meta[property="og:description"]').attr('content') || '';

    return {
      id: entry.id,
      source: 'zighang',

      // LD+JSON 우선
      company: ldJson.hiringOrganization?.name || '',
      title: ldJson.title || '',

      // CSS Selector 보강
      depth_ones: extractDepthTwosFromOgTitle(ogTitle).length > 0
        ? [ogTitle.match(/\[(.+?)\]/)?.[1] || '']
        : [],
      depth_twos: extractDepthTwosFromOgTitle(ogTitle),

      keywords: [],  // ⚠️ 없음

      // 경력 파싱
      career_min: parseCareer(
        cssData.summary[0] ||  // CSS: "경력무관"
        ldJson.experienceRequirements  // LD+JSON: "84 months"
      ),
      career_max: null,

      // LD+JSON 우선
      regions: ldJson.jobLocation?.map(loc =>
        loc.address?.addressLocality
      ).filter(Boolean) || [cssData.summary[3]],

      employee_types: mapEmploymentType(ldJson.employmentType) || [cssData.summary[1]],

      deadline_type: cssData.summary[4] || null,
      end_date: ldJson.validThrough || null,

      // CSS Selector로 섹션 추출
      detail: cssData.sections,

      crawled_at: new Date().toISOString(),
      is_active: true,
    };
  }

  // ========================================
  // 3차: CSS Selector만
  // ========================================
  console.log(`  ⚠️ LD+JSON 없음, CSS만 사용: ${entry.id}`);

  const cssData = extractWithCssSelectors($);
  const ogTitle = $('meta[property="og:title"]').attr('content') || '';
  const ogDesc = $('meta[property="og:description"]').attr('content') || '';

  return {
    id: entry.id,
    source: 'zighang',
    company: ogTitle.match(/\[(.+?)\]/)?.[1] || '',
    title: ogTitle.split('|')[0].replace(/\[.+?\]/, '').trim(),
    depth_ones: [],
    depth_twos: extractDepthTwosFromOgTitle(ogTitle),
    keywords: [],
    career_min: parseCareer(cssData.summary[0]),
    career_max: null,
    regions: [cssData.summary[3]],
    employee_types: [cssData.summary[1]],
    deadline_type: cssData.summary[4],
    end_date: null,
    detail: cssData.sections,
    crawled_at: new Date().toISOString(),
    is_active: true,
  };
}

// ========================================
// 헬퍼 함수: CSS Selector 추출
// ========================================
function extractWithCssSelectors($) {
  const summaryItems = [];
  $('div.bg-subtle.grid > div').each((i, el) => {
    summaryItems.push($(el).text().trim());
  });

  const sections = {
    intro: '',
    main_tasks: '',
    requirements: '',
    preferred_points: '',
    benefits: '',
    work_conditions: '',
    application_method: '',
  };

  $('h3').each((i, el) => {
    const title = $(el).text().trim();
    const content = $(el).next().text().trim();

    if (title.includes('담당업무') || title.includes('주요업무')) {
      sections.main_tasks = content;
    } else if (title.includes('자격요건')) {
      sections.requirements = content;
    } else if (title.includes('우대')) {
      sections.preferred_points = content;
    } else if (title.includes('복리후생') || title.includes('혜택')) {
      sections.benefits = content;
    } else if (title.includes('근무조건') || title.includes('근무환경')) {
      sections.work_conditions = content;
    } else if (title.includes('접수방법') || title.includes('지원방법')) {
      sections.application_method = content;
    }
  });

  return {
    summary: summaryItems,  // [경력, 채용유형, 학력, 지역, 마감일, 출처]
    sections,
  };
}
```

---

## 🧪 테스트 케이스

### **테스트 URL**
1. RSC 성공 케이스: `https://zighang.com/recruitment/4b3b9682-7477-4d42-8f62-a402c78ec119`
2. LD+JSON 케이스: `https://zighang.com/recruitment/54fdae5e-1959-4c8a-8ec5-7680da37ffd6`

### **검증 항목**
```javascript
// 필수 필드 검증
const requiredFields = [
  'title',
  'company',
  'depth_ones',
  'depth_twos',
  'career_min',
  'regions',
  'employee_types',
  'detail.main_tasks',
  'detail.requirements',
];

function validateJob(job) {
  const missing = requiredFields.filter(field => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      return !job[parent]?.[child];
    }
    return !job[field] || (Array.isArray(job[field]) && job[field].length === 0);
  });

  if (missing.length > 0) {
    console.error(`❌ 누락된 필드: ${missing.join(', ')}`);
    return false;
  }

  console.log('✅ 모든 필수 필드 확보');
  return true;
}
```

---

## 📊 예상 성능 지표

| 지표 | 현재 | 목표 |
|------|------|------|
| 전체 수집률 | 100% | 100% |
| RSC 성공률 | 70% | 80% (디버깅 후) |
| 필수 필드 확보율 | 75% | **96%** |
| depth_twos 수집률 | 70% | **90%** |
| careerMin 수집률 | 70% | **95%** |

---

## 🚀 구현 순서

1. **parseCareer 함수** 구현 및 테스트
2. **mapEmploymentType 함수** 구현
3. **extractWithCssSelectors 함수** 구현
4. **fetchJobDetail에 3단계 fallback 적용**
5. **테스트 URL로 검증**
6. **전체 크롤링 실행 및 수집률 측정**

---

## 📝 참고 파일

- **기존 크롤러**: `src/crawlers/zighang-full.js`
- **수집 전략 분석**: `크롤링_수집전략_분석.md`
- **CSS Selector 목록**: `crawler selector 0205_mj.xlsx`
- **샘플 데이터**: `data/zighang_jobs.json`

---

## 💡 추가 개선 아이디어

1. **주소 수집**: 회사 상세 페이지 크롤링 또는 지도 API 활용
2. **기업유형 추론**: 회사명 패턴 분석 (예: "주식회사" → 대기업)
3. **NLP 키워드 추출**: 본문에서 직무 관련 키워드 자동 추출
4. **companies 테이블 구축**: 회사별 정보 별도 관리

---

## ❓ 질문사항

궁금한 점이 있으면 언제든지 물어보세요!

**작성일**: 2025-02-05
**작성자**: Claude Sonnet 4.5
