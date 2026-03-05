# Analytics Event Taxonomy

## 목적
- 비로그인 유입/탐색/가입 전환 추적
- 가입 후 기능 사용, 리텐션, DAU/WAU/MAU 측정
- AI 및 API 안정성 지표 추적

## 공통 스키마
- `event_name`
- `event_time_utc`
- `anonymous_id`
- `user_id` (nullable)
- `session_id`
- `is_authenticated`
- `page_path`
- `feature_name`
- `action`
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`
- `properties` (jsonb)
- `app_version`, `env`

## 핵심 이벤트

### 세션/유입
- `session_started`
- `page_view`

### 인증
- `signup_started`
- `signup_completed`
- `login_completed`
- `logout`

### 온보딩
- `onboarding_started`
- `onboarding_step_completed`
- `onboarding_completed`
- `onboarding_skipped`

### 공고 탐색
- `jobs_list_viewed`
- `search_executed`
- `filter_saved`
- `job_action` (`action`: `pass`/`hold`/`apply`)

### 지원관리
- `applications_page_viewed`
- `application_status_changed`
- `external_job_saved`
- `deadline_updated`

### 이력서
- `resume_page_viewed`
- `resume_created`
- `resume_deleted`
- `pdf_import_success`
- `pdf_import_error`

### 자소서 AI
- `cover_letter_saved`
- `ai_recommend_requested/succeeded/failed`
- `ai_write_requested/succeeded/failed`
- `ai_feedback_requested/succeeded/failed`

### API 안정성 (서버)
- `api_events` 테이블에 route/method/status/latency 기록

## Tableau 기본 대시보드 권장 시트
- 유입/가입 퍼널: `anonymous -> signup_started -> signup_completed -> onboarding_completed`
- 기능 사용: 페이지/기능별 DAU
- 리텐션: D1/D7/D30 코호트
- AI 성능: 성공률, 429 비율, 평균 지연
- 운영 안정성: route별 오류율, p95 latency

