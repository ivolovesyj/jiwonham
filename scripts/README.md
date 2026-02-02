# Scripts

개발 및 테스트용 스크립트 모음

## 파일 목록

### `test-filter.js`
필터링 시스템 테스트 스크립트

**사용법:**
```bash
node scripts/test-filter.js
```

**기능:**
- 직항 크롤링 데이터로 필터 테스트
- TOP 20 추천 공고 출력
- 탈락 공고 샘플 분석
- 결과를 `data/filtered_jobs.json`에 저장

### `test-jobkorea.js`
잡코리아 크롤러 테스트 스크립트

**사용법:**
```bash
node scripts/test-jobkorea.js
```

**기능:**
- 잡코리아 마케팅 신입 공고 크롤링 테스트
- 상위 10개 공고 출력
