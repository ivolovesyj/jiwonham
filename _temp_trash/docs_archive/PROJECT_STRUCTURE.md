# 취업하개 프로젝트 구조

## 📁 디렉토리 구조

```
채용공고/
├── src/                    # 백엔드 코드
│   ├── crawlers/          # 크롤러 (Wanted, Zighang)
│   │   ├── wanted.js
│   │   └── zighang.js
│   ├── filters/           # 공고 필터링 로직
│   │   └── filter.js
│   ├── utils/             # 유틸리티 함수
│   │   ├── keywords.js
│   │   └── scoring.js
│   └── index.js           # 메인 실행 파일
│
├── web/                    # Next.js 웹 앱
│   ├── app/               # App Router
│   │   ├── page.tsx       # 메인 페이지 (공고 피드)
│   │   └── api/jobs/      # API 라우트
│   ├── components/        # React 컴포넌트
│   │   ├── JobCard.tsx
│   │   └── SwipeCard.tsx
│   ├── lib/               # 라이브러리
│   │   └── supabase.ts
│   └── types/             # TypeScript 타입
│       └── job.ts
│
├── data/                   # 크롤링 데이터
│   ├── filtered_jobs.json # 필터링된 공고 (API 사용)
│   ├── wanted_jobs.json   # 원티드 원본 데이터
│   └── zighang_jobs.json  # 직항 원본 데이터
│
├── docs/                   # 문서
│   ├── supabase-schema-v2.sql    # 최신 DB 스키마
│   ├── cleanup-old-tables.sql    # 구 테이블 삭제 SQL
│   └── PROJECT_STRUCTURE.md      # 이 파일
│
├── scripts/                # 유틸리티 스크립트
│   ├── test-filter.js
│   └── test-jobkorea.js
│
├── archive/                # 구 버전 코드 보관
│   ├── crawl-wanted.js
│   └── crawl-zighang.js
│
└── survey/                 # 초기 설문조사 페이지 (선택적)
    └── index.html
```

## 🗄️ Supabase 테이블 구조

### 핵심 테이블

1. **user_profiles** - 사용자 기본 정보
2. **user_preferences** - 초기 필터 설정 (직무, 지역, 회사 규모 등)
3. **user_job_actions** - 공고 선택 이력 (pass/hold/apply)
4. **keyword_weights** - 키워드별 학습 가중치
5. **company_preference** - 회사별 선호도
6. **saved_jobs** - 지원 예정 공고 상세 정보
7. **application_status** - 지원 현황 관리
8. **sent_jobs** - 발송된 공고 이력 (중복 방지)

### 삭제된 구 테이블

- ~~job_feedback~~ → `user_job_actions`로 대체
- ~~survey_responses~~ → 개발 단계에서 불필요

## 🔄 데이터 흐름

### 1. 크롤링 → 저장
```
src/crawlers/*.js → data/*.json
```

### 2. 필터링 → API 제공
```
data/wanted_jobs.json + data/zighang_jobs.json
    ↓ (src/filters/filter.js)
data/filtered_jobs.json
    ↓ (web/app/api/jobs/route.ts)
웹 앱
```

### 3. 사용자 선택 → 학습
```
사용자 선택 (pass/hold/apply)
    ↓
user_job_actions (선택 기록)
    ↓
keyword_weights & company_preference 업데이트
    ↓
다음 추천에 반영
```

## 📝 주요 파일 설명

### 백엔드
- `src/crawlers/wanted.js` - 원티드 크롤러 (마감일 포함)
- `src/crawlers/zighang.js` - 직항 크롤러 (상세 정보 포함)
- `src/filters/filter.js` - AI 기반 공고 필터링 및 점수 계산

### 프론트엔드
- `web/app/page.tsx` - 메인 피드 (Tinder 스타일)
- `web/components/JobCard.tsx` - 공고 카드 (3버튼: 지원안함/보류/지원예정)
- `web/components/SwipeCard.tsx` - 카드 애니메이션

### 데이터베이스
- `docs/supabase-schema-v2.sql` - 최신 스키마 (학습 기능 포함)

## 🚀 실행 방법

### 크롤링
```bash
node src/index.js
```

### 웹 앱
```bash
cd web
npm run dev
```

## 📌 다음 작업

1. [ ] 공고 필터링 로직 (이미 선택한 공고 제외)
2. [ ] 관리 페이지 (지원 예정 공고 목록)
3. [ ] Kakao 로그인 연동
4. [ ] 키워드 학습 알고리즘 구현
5. [ ] 온보딩 페이지 (초기 필터 설정)
