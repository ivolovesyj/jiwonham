# 지원함 프로젝트 인수인계 가이드

이 문서는 새로운 AI 세션/개발자가 바로 작업을 이어갈 수 있도록 현재 운영 기준을 정리한 문서입니다.

최종 업데이트: 2026-03-09  
저장소: https://github.com/ivolovesyj/jiwonham

---

## 1. 현재 서비스 구성

### 웹앱 (`web/`)
- Next.js App Router 기반 메인 서비스
- 핵심 페이지:
  - `/` 지원관리
  - `/jobs` 공고 탐색/저장
  - `/resume` 이력서 관리
  - `/cover-letter` 자소서 작성
  - `/onboarding` 초기 성향 설정

### 크롤러 (`src/`)
- `src/crawlers/zighang-full.js` 중심으로 공고 수집
- Supabase `jobs` 테이블 upsert

### 데이터/분석
- Supabase를 제품 DB + 분석 이벤트 저장소로 사용
- GA4는 유입 채널 분석 보조로 사용

---

## 2. 최근 반영사항 (중요)

### A) 데모 데이터 개선
- 비로그인 지원관리 데모의 마감일이 고정 과거 날짜였던 문제 수정
- 상대 날짜 + 24시간 TTL 재생성으로 변경
- 파일: `web/app/page.tsx`

### B) 분석 로깅 인프라 구축
- 클라이언트 이벤트:
  - `web/lib/analytics.ts`
  - `web/components/AnalyticsBootstrap.tsx`
  - `web/app/layout.tsx` (`Suspense` 적용 포함)
- 인증 이벤트:
  - `web/lib/auth-context.tsx`
  - `web/app/auth/callback/page.tsx`
- 페이지/기능 이벤트 계측:
  - `web/app/jobs/page.tsx`
  - `web/app/page.tsx`
  - `web/app/onboarding/page.tsx`
  - `web/app/resume/page.tsx`
  - `web/components/cover-letter/AnswerEditor.tsx`
- 서버/API 이벤트 로깅:
  - `web/lib/api-analytics.ts`
  - `web/app/api/ai/*/route.ts`
  - `web/app/api/learn/route.ts`
- 이벤트 수집 API:
  - `web/app/api/analytics/event/route.ts`

### C) 분석 SQL/문서 추가
- `docs/create-analytics-tables.sql`
- `docs/analytics-event-taxonomy.md`

### D) jobs RPC timeout 대응
- 앱 측 임시 완화:
  - `web/app/api/jobs/route.ts`
  - RPC timeout 시 fallback 조회
  - 요청 candidate limit 축소
- 장기 DB 수정안:
  - `docs/optimize-get-filtered-jobs-v2.sql`
  - `get_filtered_jobs` 7-인자 버전의 장기 최적화 SQL

---

## 3. Supabase 분석 오브젝트

### 테이블
- `public.product_events`
- `public.api_events`

### 뷰
- `public.v_daily_product_kpis`
- `public.v_active_users`

### 보안 권장 설정
다음 실행 권장:

```sql
alter view public.v_active_users set (security_invoker = true);
alter view public.v_daily_product_kpis set (security_invoker = true);
```

---

## 4. 운영 점검 체크리스트

### 로그 유입 점검
```sql
select count(*) from public.product_events;
select count(*) from public.api_events;
```

```sql
select event_name, page_path, event_time_utc
from public.product_events
order by event_time_utc desc
limit 20;
```

### 핵심 KPI 쿼리 소스
- 일별 요약: `public.v_daily_product_kpis`
- DAU/WAU/MAU: `public.v_active_users`

---

## 5. 환경변수

### 루트 (`.env`) - 크롤러
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

### 웹 (`web/.env.local`)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY` (서버 이벤트 로깅 API에서 사용)
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` (선택)

---

## 6. 실행/배포

### 로컬
```bash
# root
npm install
node src/index.js

# web
cd web
npm install
npm run dev
```

### 배포
- `main` 푸시 시 Vercel 배포
- 크롤러는 GitHub Actions 수동/스케줄 실행

---

## 7. 정리된 항목

2026-03-05 기준:
- 루트 `_trash/` 폴더 삭제 완료 (레거시/백업/임시 파일 정리)

---

## 8. 다음 세션 권장 시작 순서

1. `git pull` 후 `git status` 확인  
2. `PROJECT_GUIDE.md`와 `docs/analytics-event-taxonomy.md` 확인  
3. 분석 작업이면 Supabase에서 `product_events` 유입 여부 먼저 확인  
4. 기능 작업이면 해당 페이지 + 연동 API 라우트를 함께 수정  
5. 공고 조회 장애면 `docs/optimize-get-filtered-jobs-v2.sql`과 `/api/jobs` 로그를 먼저 확인
