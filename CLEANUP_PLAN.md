# 파일 정리 계획

> **주의**: 실제 프로덕션에 영향을 주지 않도록 신중하게 분류했습니다.

---

## 📋 분류 기준

- ✅ **KEEP**: 프로덕션에서 사용 중 (절대 삭제 금지)
- 📦 **ARCHIVE**: 참고용/백업용 (안전하게 보관)
- 🗑️ **TEMP**: 임시 파일 (휴지통 폴더로 이동 가능)

---

## 1. 루트 디렉토리

### ✅ KEEP (절대 삭제 금지)

```
package.json                    # 프로젝트 의존성
package-lock.json              # 의존성 잠금
.env                           # 환경변수 (gitignore됨)
.env.example                   # 환경변수 예시
.gitignore                     # Git 설정
README.md                      # 프로젝트 문서
vercel.json                    # Vercel 배포 설정
직무 계층 구조.txt              # 필터 마스터 데이터 소스 ⚠️ 중요!
PROJECT_GUIDE.md               # 새 에이전트용 가이드
```

### 📦 ARCHIVE (참고용 - 보관)

```
GEMINI_TO_CLAUDE.md            # 마이그레이션 기록
GEMINI_크롤러_인수인계서.md      # 이전 크롤러 문서
README_크롤러_개선_요약.md       # 크롤링 전략 분석
참고_기존_코드_주요함수.md        # 이전 함수 참고
크롤링_수집전략_분석.md          # 크롤링 전략
```

### 🗑️ TEMP (휴지통 이동 가능)

```
check-education.js             # 일회성 DB 확인 스크립트
test-company-page.js           # 테스트 스크립트
test-crawler.js                # 테스트 스크립트
test-education-extraction.js   # 테스트 스크립트
test-rsc-education.js          # 테스트 스크립트
test-specific-jobs.js          # 테스트 스크립트
commit-msg.txt                 # 임시 메모
location_stats.txt             # 통계 임시 파일
work_log_2026-02-04.md         # 작업 로그
company_check_result.txt       # 크롤링 결과 확인
company_list_20260204_1645.csv # 회사 목록 덤프
company_rsc_dump.txt           # RSC 덤프
all_companies_rsc_dump.txt     # RSC 전체 덤프
rsc_dumps.json                 # RSC 덤프 JSON
_temp_company_detail.html      # 임시 HTML
_temp_rsc_data.txt             # 임시 데이터
refill-education.log           # 크롤러 로그
nul                            # 빈 파일
crawler selector 0205_mj.xlsx  # 임시 엑셀
```

### 🖼️ 이미지 파일 (중복 확인 필요)

**✅ KEEP (web/public에 있음)**
```
web/public/logo-final.png     # 실제 사용 중 (page.tsx, login.tsx에서 import)
web/public/favicon.png         # 파비콘
```

**🗑️ TEMP (루트 디렉토리 중복)**
```
최종 로고.png                   # web/public/logo-final.png와 동일
로고 투명버전.png                # 사용 안 함
로고 흰배경 버전.png             # 사용 안 함 (web/public/logo-white-bg.png로 대체됨)
```

---

## 2. src/ 디렉토리

### ✅ KEEP

```
src/index.js                   # 크롤러 메인 진입점
src/kakao.js                   # 카카오 알림
src/crawlers/zighang-full.js   # 메인 크롤러 (지그재그)
src/crawlers/refill-education.js # Education 재크롤링 (1회용이지만 보관)
```

### 📦 ARCHIVE

```
src/crawlers/wanted.js         # 원티드 크롤러 (비활성화)
src/crawlers/jobkorea.js       # 잡코리아 크롤러 (비활성화)
src/crawlers/zighang-companies.js # 회사 정보 크롤러 (향후 재사용 가능)
src/crawlers/test_20260205_mj/ # 테스트 폴더
```

### 🗑️ TEMP

```
src/filters/                   # 사용 안 함 (API로 이동)
```

---

## 3. web/ 디렉토리

### ✅ KEEP (전체)

```
web/app/                       # Next.js App Router
web/components/                # React 컴포넌트
web/lib/                       # 유틸리티
web/types/                     # TypeScript 타입
web/public/                    # 정적 파일
web/scripts/                   # DB 스크립트 (보관)
web/package.json
web/tsconfig.json
web/components.json
```

**⚠️ 주의**: `web/public/` 내부 정리 필요

```
✅ KEEP:
  - logo-final.png             # 실제 사용
  - favicon.png, favicon.ico   # 파비콘
  - og-image.png               # OpenGraph

🗑️ TEMP:
  - AIDrawing_*.png (3개)       # AI 생성 이미지 (사용 안 함)
  - logo.png                   # 중복
  - logo-v2.png, logo-v3.png   # 중복
  - logo-white-bg.png          # 중복
  - carousel-demo.html         # 데모 파일
  - 취업하개.png                # 사용 안 함
```

---

## 4. 기타 디렉토리

### ✅ KEEP

```
.github/workflows/             # GitHub Actions (모두 사용 중)
  - crawler-full.yml           # 전체 크롤링
  - crawler-daily.yml          # 일일 크롤링
  - refill-education.yml       # Education 재크롤링
  - daily-job-alert.yml        # 알림 (비활성이지만 보관)

docs/                          # 프로젝트 문서
  - PROJECT_STRUCTURE.md
  - company-type-implementation.md
  - education-field-implementation.md
```

### 📦 ARCHIVE

```
archive/                       # 이전 크롤러 백업
  - crawl-wanted.js
  - crawl-zighang.js
  - README.md
```

### 🗑️ TEMP

```
scripts/                       # 대부분 일회성 유틸리티
  - analyze-company-page.js
  - check-*.js
  - test-*.js
  - dump_*.js
  - (총 20개 파일)
  ⚠️ 예외: README.md는 보관

data/                          # 로컬 크롤링 결과 (gitignore됨)
  - *.json 파일들

_temp_trash/                   # 이전 임시 파일
_archive/                      # 방금 생성된 임시 폴더

crawler/                       # 빈 폴더 또는 미사용
survey/                        # 설문 관련 (gitignore됨)
```

---

## 🚀 실행 계획

### Phase 1: 안전한 임시 폴더 생성

```bash
mkdir -p _CLEANUP_20260206/{temp_files,old_docs,test_scripts,old_images,old_data}
```

### Phase 2: 파일 이동 (삭제 아님!)

```bash
# 1. 임시/테스트 파일
mv check-education.js test-*.js _CLEANUP_20260206/test_scripts/
mv *_dump.txt *.csv *.log _CLEANUP_20260206/temp_files/
mv _temp_*.* nul _CLEANUP_20260206/temp_files/

# 2. 중복 이미지
mv 최종\ 로고.png 로고\ 투명버전.png 로고\ 흰배경\ 버전.png _CLEANUP_20260206/old_images/

# 3. 이전 데이터
mv data/*.json _CLEANUP_20260206/old_data/ 2>/dev/null || true

# 4. scripts 폴더 (README 제외)
mkdir -p _CLEANUP_20260206/old_scripts
find scripts -type f -name "*.js" -exec mv {} _CLEANUP_20260206/old_scripts/ \;

# 5. src/filters (사용 안 함)
mv src/filters _CLEANUP_20260206/

# 6. web/public 정리
cd web/public
mv AIDrawing_*.png logo-v*.png logo-white-bg.png logo.png carousel-demo.html 취업하개.png ../../_CLEANUP_20260206/old_images/ 2>/dev/null || true
```

### Phase 3: 검증

```bash
# 웹 로컬 실행 테스트
cd web && npm run dev

# 크롤러 테스트 (dry run)
node src/index.js --help
```

### Phase 4: Git 커밋

```bash
git add .
git commit -m "chore: Clean up temporary files and duplicates

- Move test scripts to _CLEANUP_20260206/
- Remove duplicate logo images
- Archive unused utility scripts
- Add PROJECT_GUIDE.md for new agents
"
```

---

## ⚠️ 주의사항

1. **절대 직접 삭제하지 않기** - 모두 `_CLEANUP_20260206/` 폴더로 이동
2. **검증 후 커밋** - 웹/크롤러 모두 정상 작동 확인 후 push
3. **1주일 보관** - _CLEANUP_20260206 폴더는 1주일 후 삭제 (문제 없으면)
4. **롤백 가능** - 문제 발생 시 `git restore .`로 즉시 복구

---

## 📊 정리 효과

**Before:**
- 루트 디렉토리: 50+ 파일
- 혼재된 임시/테스트/프로덕션 파일

**After:**
- 루트 디렉토리: ~15개 핵심 파일
- 명확한 구조
- PROJECT_GUIDE.md로 새 agent 온보딩 간소화

---

**승인 필요**: 위 계획대로 진행할까요?
