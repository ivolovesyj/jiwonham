# 지원함 (JiwonBox) - 프로젝트 가이드

> 새로운 agent가 이 프로젝트를 작업할 때 필요한 모든 정보

**최종 업데이트**: 2026-02-06
**프로젝트**: 채용공고 크롤링 + 지원 관리 플랫폼
**저장소**: https://github.com/ivolovesyj/jiwonham

---

## 📁 프로젝트 구조

```
채용공고/
├── src/                        # 크롤러 백엔드 (Node.js)
│   ├── crawlers/
│   │   ├── zighang-full.js    ✅ [ACTIVE] 메인 크롤러 (지그재그)
│   │   ├── refill-education.js ✅ [ACTIVE] Education 재크롤링 (1회용)
│   │   ├── wanted.js          ⚠️ [INACTIVE] 원티드 크롤러
│   │   └── jobkorea.js        ⚠️ [INACTIVE] 잡코리아 크롤러
│   ├── filters/               ⚠️ [UNUSED] 필터링 로직 (사용 안 함)
│   ├── index.js               ✅ [ACTIVE] 크롤러 진입점
│   └── kakao.js               ✅ [ACTIVE] 카카오 알림
│
├── web/                        # Next.js 프론트엔드
│   ├── app/                    # App Router
│   │   ├── page.tsx           ✅ 메인 페이지 (채용공고 목록)
│   │   ├── jobs/page.tsx      ✅ 공고 상세/필터
│   │   ├── applications/page.tsx ✅ 지원 내역 관리
│   │   ├── profile/page.tsx   ✅ 프로필/설정
│   │   ├── api/               # API Routes
│   │   │   ├── jobs/route.ts  ✅ 공고 조회/필터링
│   │   │   ├── filters/route.ts ✅ 필터 옵션
│   │   │   ├── learn/route.ts  ✅ 학습 데이터
│   │   │   └── applications/   ✅ 지원 관리
│   ├── components/            ✅ React 컴포넌트
│   │   ├── FilterModal.tsx    ✅ 필터 모달
│   │   ├── JobCard.tsx        ✅ 공고 카드
│   │   ├── ApplicationCard.tsx ✅ 지원 카드
│   │   └── ui/                ✅ UI 컴포넌트
│   ├── lib/
│   │   ├── supabase.ts        ✅ Supabase 클라이언트
│   │   ├── filter-master-data.ts ✅ 필터 마스터 데이터
│   │   └── auth-context.tsx   ✅ 인증 컨텍스트
│   └── types/                 ✅ TypeScript 타입
│
├── .github/workflows/         # GitHub Actions
│   ├── crawler-full.yml       ✅ [ACTIVE] 전체 크롤링
│   ├── crawler-daily.yml      ✅ [ACTIVE] 일일 증분 크롤링
│   ├── refill-education.yml   ✅ [ACTIVE] Education 재크롤링
│   └── daily-job-alert.yml    ⚠️ [INACTIVE] 일일 알림
│
├── docs/                      📚 문서
│   ├── PROJECT_STRUCTURE.md
│   ├── company-type-implementation.md
│   └── education-field-implementation.md
│
├── scripts/                   🛠️ 유틸리티 스크립트 (대부분 사용 안 함)
├── archive/                   📦 이전 크롤러 백업
├── _archive/                  🗑️ 임시 파일/로그 보관
├── _temp_trash/               🗑️ 이전 임시 파일
└── data/                      📊 크롤링 결과 JSON (로컬용)
```

---

## 🎯 핵심 파일 (반드시 알아야 할 것들)

### 1. 크롤러 시스템

#### `src/crawlers/zighang-full.js`
- **역할**: 지그재그(zighang.com)에서 채용공고 크롤링
- **동작**:
  1. Sitemap에서 URL 수집
  2. RSC (React Server Components) 파싱
  3. 학력, 기업유형, 직무 등 추출
  4. Supabase `jobs` 테이블에 upsert
- **주요 함수**:
  - `fetchAllJobUrls()`: sitemap에서 URL 추출
  - `crawlAll()`: 실제 크롤링 실행
  - `extractEducation()`: 학력 정보 추출
  - `fetchCompanyDetail()`: 회사 유형 추출

#### `src/index.js`
- **역할**: 크롤러 진입점
- **환경변수 필요**:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY` (RLS 우회)

### 2. 웹 애플리케이션

#### `web/app/api/jobs/route.ts`
- **역할**: 공고 조회 및 필터링 API
- **주요 로직**:
  - Jaro-Winkler 유사도 매칭
  - 사용자 선호도 기반 점수 계산
  - 학습 데이터 반영
  - **필터링 로직** (중요!):
    ```typescript
    // 학력 필터: 정확히 일치만 (null이면 제외)
    if (prefs.preferred_education?.length) {
      if (!job.education) {
        matchesFilter = false
      } else {
        const match = prefs.preferred_education.includes(job.education)
        if (!match) matchesFilter = false
      }
    }

    // 기업 유형 필터: 정확히 일치만 (null/'기타'면 제외)
    if (prefs.preferred_company_types?.length) {
      if (!companyType || companyType === '기타') {
        matchesFilter = false
      } else {
        const match = prefs.preferred_company_types.includes(companyType)
        if (!match) matchesFilter = false
      }
    }
    ```

#### `web/lib/filter-master-data.ts`
- **역할**: 필터 옵션 마스터 데이터
- **중요**: `직무 계층 구조.txt` 파일과 **정확히 일치**해야 함
- **구조**:
  - 26개 대분류 (IT·개발, AI·데이터, 게임, ...)
  - 각 대분류마다 소분류 배열
  - **첫 번째 항목은 항상 '전체'**
  - 정렬하지 않음 (원본 순서 유지)

#### `web/components/FilterModal.tsx`
- **역할**: 필터 UI 모달
- **특징**:
  - 3단 구조: 대분류 → 중분류(직무만) → 소분류
  - '전체' 버튼: 해당 대분류의 모든 소분류 선택
  - 검색 기능 지원

---

## 🗄️ 데이터베이스 (Supabase)

### URL
https://uphoiwlvglkogkcnrjkl.supabase.co

### 주요 테이블

#### `jobs` 테이블
```sql
id                  TEXT PRIMARY KEY
source              TEXT (예: 'zighang')
company             TEXT
company_image       TEXT
company_type        TEXT (대기업/중견기업/중소기업/스타트업/유니콘/외국계/공공기관/기타)
title               TEXT
regions             TEXT[] (서울, 경기, ...)
location            TEXT
career_min          INTEGER
career_max          INTEGER
employee_types      TEXT[] (정규직, 인턴, 계약직, ...)
deadline_type       TEXT
end_date            TIMESTAMPTZ
depth_ones          TEXT[] (직무 대분류)
depth_twos          TEXT[] (직무 소분류)
keywords            TEXT[]
views               INTEGER
detail              JSONB {intro, main_tasks, requirements, preferred_points, benefits, work_conditions}
education           TEXT (무관/고졸/전문대졸/학사/석사/박사)
original_created_at TIMESTAMPTZ
last_modified_at    TIMESTAMPTZ
crawled_at          TIMESTAMPTZ
is_active           BOOLEAN
```

#### `user_preferences` 테이블
```sql
user_id                   UUID PRIMARY KEY
preferred_job_types       TEXT[] (depth_two 값들)
preferred_locations       TEXT[]
career_level              TEXT (신입, 1-3, 3-5, ...)
work_style                TEXT[] (고용형태)
preferred_company_types   TEXT[]
preferred_education       TEXT[]
updated_at                TIMESTAMPTZ
```

#### `applications` 테이블
- 사용자의 지원 내역 관리
- status: applied, screening, interview, offer, rejected, withdrawn

---

## 🔧 GitHub Actions 워크플로우

### 1. Full Mode Crawler (`crawler-full.yml`)
- **트리거**: 수동 실행 (workflow_dispatch)
- **역할**: 전체 공고 크롤링 (모든 sitemap)
- **실행**: `node src/index.js`
- **타임아웃**: 6시간

### 2. Daily Crawler (`crawler-daily.yml`)
- **트리거**: 매일 새벽 3시 (KST) 자동 실행
- **역할**: 증분 크롤링 (최근 변경분만)
- **타임아웃**: 1시간

### 3. Refill Education (`refill-education.yml`)
- **트리거**: 수동 실행
- **역할**: education이 null인 공고만 재크롤링
- **스크립트**: `src/crawlers/refill-education.js`
- **타임아웃**: 6시간

---

## 🔑 환경변수

### 루트 `.env` (크롤러용)
```env
SUPABASE_URL=https://uphoiwlvglkogkcnrjkl.supabase.co
SUPABASE_SERVICE_KEY=<service_role_key>  # RLS 우회
```

### `web/.env.local` (Next.js용)
```env
NEXT_PUBLIC_SUPABASE_URL=https://uphoiwlvglkogkcnrjkl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>  # 클라이언트용
```

### GitHub Secrets
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 🚨 중요한 규칙

### 1. 필터 로직
- **학력 필터**: 정확히 일치만 허용, null 공고는 제외
- **기업 유형 필터**: 정확히 일치만 허용, null/'기타' 공고는 제외
- **직무 필터**: depth_two 기준으로 필터링

### 2. 직무 계층 구조
- **절대 변경 금지**: `직무 계층 구조.txt` 파일
- **동기화 필수**: `web/lib/filter-master-data.ts`와 정확히 일치해야 함
- **'전체' 위치**: 각 대분류의 소분류 배열에서 첫 번째 (정렬 금지)

### 3. 크롤링
- **멱등성 보장**: 동일 공고를 여러 번 크롤링해도 안전 (upsert)
- **null 처리**: education, company_type이 null인 경우가 많음 (정상)
- **503/502 에러**: 일시적 서버 과부하, 재시도 필요

### 4. Git 규칙
- **절대 커밋 금지**:
  - `.env`, `.env.local`
  - `*.log` 파일
  - `node_modules/`
  - `.next/` 빌드 결과
  - `data/*.json` (로컬 크롤링 결과)

---

## 🛠️ 로컬 개발 환경

### 크롤러 실행
```bash
# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env
# .env 파일에 SUPABASE_SERVICE_KEY 입력

# 크롤러 실행
node src/index.js
```

### 웹 개발 서버
```bash
cd web

# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env.local
# .env.local 파일에 Supabase 키 입력

# 개발 서버 실행
npm run dev
# http://localhost:3000 접속
```

---

## 🗂️ 사용하지 않는 파일들

### 완전히 사용 안 함 (삭제 가능)
- `src/filters/` - 필터 로직이 API로 이동됨
- `src/crawlers/wanted.js` - 원티드 크롤러 비활성
- `src/crawlers/jobkorea.js` - 잡코리아 크롤러 비활성
- `scripts/` - 대부분 일회성 유틸리티 (보관용)
- `archive/` - 이전 크롤러 백업 (참고용)
- `_temp_trash/` - 이전 임시 파일
- `_archive/` - 최근 임시 파일/로그

### 참고용 문서
- `GEMINI_TO_CLAUDE.md` - Gemini에서 Claude로 마이그레이션 기록
- `GEMINI_크롤러_인수인계서.md` - 이전 크롤러 문서
- `참고_기존_코드_주요함수.md` - 이전 함수 참고
- `크롤링_수집전략_분석.md` - 크롤링 전략 분석

### 임시 파일들 (이미 _archive로 이동)
- `check-education.js`
- `test-*.js` 파일들
- `*.log` 파일들
- `company_*.csv`, `company_*.txt` 덤프 파일들

---

## 📝 작업 시 체크리스트

### 새 필터 추가 시
1. [ ] `web/lib/filter-master-data.ts`에 마스터 데이터 추가
2. [ ] `web/app/api/filters/route.ts`에서 API 응답 추가
3. [ ] `web/components/FilterModal.tsx`에 UI 추가
4. [ ] `web/app/api/jobs/route.ts`에 필터 로직 추가
5. [ ] `user_preferences` 테이블에 컬럼 추가 (필요시)
6. [ ] 필터 테스트

### 크롤러 수정 시
1. [ ] `src/crawlers/zighang-full.js` 수정
2. [ ] 로컬에서 테스트: `node src/index.js`
3. [ ] GitHub에 push
4. [ ] GitHub Actions에서 full mode 실행
5. [ ] DB에서 결과 확인

### 배포 시
1. [ ] `web/` 디렉토리에서 `npm run build` 테스트
2. [ ] Vercel에서 자동 배포 확인
3. [ ] 배포 후 필터 동작 확인

---

## 🆘 문제 해결

### Education 필터가 작동하지 않음
- **원인**: DB에 education 데이터가 없음
- **해결**: GitHub Actions에서 "Refill Education Data" 실행

### 공고가 하나도 안 보임
- **원인**: 필터가 너무 엄격함 (null 제외)
- **해결**: 필터 조건 완화 또는 크롤러 재실행

### 직무 필터 구조가 안 맞음
- **원인**: `filter-master-data.ts`와 `직무 계층 구조.txt` 불일치
- **해결**: 두 파일을 정확히 동기화

### 크롤러가 멈춤
- **원인**: 503/502 서버 에러
- **해결**: GitHub Actions에서 "Re-run all jobs"

---

## 📞 연락처 & 리소스

- **GitHub**: https://github.com/ivolovesyj/jiwonham
- **Supabase Dashboard**: https://supabase.com/dashboard/project/uphoiwlvglkogkcnrjkl
- **Vercel**: (Next.js 자동 배포)

---

**이 가이드를 읽으면 새로운 agent가 즉시 작업을 시작할 수 있어야 합니다.**
