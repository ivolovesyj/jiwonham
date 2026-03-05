# 지원함 (Jiwonham)

채용공고 탐색, 지원 현황 관리, 이력서/자소서 작성, AI 보조 기능을 제공하는 서비스입니다.

## 저장소 구조

```text
.
├─ src/         # 크롤러 (Node.js)
├─ web/         # 서비스 웹앱 (Next.js)
├─ docs/        # SQL/운영/분석 문서
└─ data/        # 로컬 데이터용 (gitkeep)
```

## 로컬 실행

### 1) 크롤러

```bash
npm install
cp .env.example .env
node src/index.js
```

필수 환경변수:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

### 2) 웹앱

```bash
cd web
npm install
# web/.env.local 생성
npm run dev
```

필수 환경변수:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY` (서버 API 이벤트 로깅용)

## 분석/로그

최근 반영된 분석 파이프라인:
- `web/lib/analytics.ts`: 클라이언트 이벤트 수집 (GA4 + Supabase)
- `web/app/api/analytics/event/route.ts`: product event 수집 API
- `web/lib/api-analytics.ts`: API 성능/에러 이벤트 수집
- `docs/create-analytics-tables.sql`: `product_events`, `api_events`, KPI view 생성 SQL
- `docs/analytics-event-taxonomy.md`: 이벤트 네이밍/의미 정의

## 배포

- 웹앱: Vercel
- 크롤러: GitHub Actions (`.github/workflows`)

## 참고 문서

- `PROJECT_GUIDE.md`: AI/개발자 인수인계용 운영 가이드
- `docs/create-analytics-tables.sql`: 분석 테이블/뷰 생성
- `docs/analytics-event-taxonomy.md`: 이벤트 택소노미
