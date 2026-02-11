# 데모 모드 구현 완료

> **날짜**: 2026-02-06  
> **목적**: 비로그인 사용자가 모든 기능을 체험할 수 있는 인터랙티브 데모 모드 구현

---

## 🎯 구현 내용

### 1. localStorage 기반 데모 데이터 관리

비로그인 사용자의 데모 데이터를 **브라우저 localStorage**에 저장하여:
- ✅ 새로고침해도 데이터 유지
- ✅ 사용자별 독립된 데이터 (브라우저/도메인별 격리)
- ✅ 언제든 초기화 가능

**localStorage 키:**
- `jiwonbox_demo_data`: 데모 지원 내역 데이터
- `jiwonbox_demo_interactions`: 사용자 인터랙션 카운트

### 2. 샘플 데이터 확장

기존 6개 → **10개의 다양한 샘플 데이터**로 확장:
- 토스 (프론트엔드 개발자) - 핀 고정
- 카카오 (React 개발자) - 보류
- 네이버 (AI 엔지니어) - 지원 완료
- 라인 (백엔드 개발자) - 면접 중
- 쿠팡 (데이터 분석가) - 서류 합격
- 배달의민족 (UX 디자이너) - 불합격
- 당근마켓 (Product Designer) - 지원 예정
- 넥슨 (게임 클라이언트 개발) - 지원 예정
- SK텔레콤 (DevOps 엔지니어) - 지원 완료
- LG전자 (임베디드 SW 개발) - 미지원

### 3. 모든 기능 완전 동작

비로그인 상태에서도 **로그인 사용자와 동일한 기능** 제공:

#### 지원 내역 관리
- ✅ 상태 변경 (지원 예정 → 지원 완료 → 면접 중 등)
- ✅ 메모 추가/수정
- ✅ 서류 체크리스트 관리
- ✅ 마감일 수정
- ✅ 공고 삭제

#### 검색 & 필터
- ✅ 회사명/직무 검색
- ✅ 상태별 필터 (전체/지원예정/지원완료/면접중 등)
- ✅ 정렬 (최신순/마감일순/상태순)
- ✅ 마감 임박 알림 (3일 이내)

#### 핀 기능
- ✅ 핀 고정/해제
- ✅ 드래그 앤 드롭으로 핀 순서 변경
- ✅ 핀 고정된 항목 우선 표시

#### 외부 공고 추가
- ✅ 다른 사이트 공고 직접 추가
- ✅ 회사명, 직무, 위치, 마감일, 링크, 메모 입력

### 4. 인터랙션 추적 & 회원가입 권유

사용자가 기능을 사용할 때마다 카운트하여:
- **5번 클릭마다** 회원가입 권유 모달 표시
- 모달 내용:
  - "마음에 드시나요?"
  - "회원가입하고 실제 지원 내역을 관리해보세요!"
  - [회원가입하고 시작하기] / [계속 둘러보기] 버튼
  - 안내: "데모 데이터는 브라우저에만 저장되며 언제든지 초기화할 수 있습니다"

**인터랙션으로 카운트되는 동작:**
- 상태 변경
- 메모 수정
- 서류 체크
- 마감일 수정
- 삭제
- 핀 토글
- 핀 순서 변경
- 외부 공고 추가
- 검색 (입력 시)
- 정렬 변경
- 필터 변경
- 마감 임박 배너 클릭

### 5. 데모 모드 UI 개선

#### 안내 배너
```
🔵 데모 모드: 모든 기능을 자유롭게 체험해보세요!  [초기화]
```
- 파란색 배경으로 데모 모드임을 명확히 표시
- 우측에 "초기화" 버튼 → 샘플 데이터로 복원

#### 초기화 기능
- 버튼 클릭 시 확인 다이얼로그 표시
- 확인 시 localStorage 데이터 삭제 후 초기 샘플 데이터로 복원
- 인터랙션 카운트도 함께 초기화

---

## 📂 수정된 파일

### `web/app/page.tsx`

#### 추가된 상수/타입
```typescript
const INITIAL_DEMO_APPLICATIONS: ApplicationWithJob[] = [ ... ] // 10개 샘플
const DEMO_DATA_KEY = 'jiwonbox_demo_data'
const DEMO_INTERACTION_KEY = 'jiwonbox_demo_interactions'
```

#### localStorage 헬퍼 함수
```typescript
getDemoData(): ApplicationWithJob[]
saveDemoData(data: ApplicationWithJob[])
getDemoInteractionCount(): number
incrementDemoInteraction(): number
resetDemoData()
```

#### 데모 모드 상태
```typescript
const [demoApplications, setDemoApplications] = useState<ApplicationWithJob[]>([])
const [showSignupModal, setShowSignupModal] = useState(false)
const [demoPinnedIds, setDemoPinnedIds] = useState<Set<string>>(new Set())
const [demoPinOrder, setDemoPinOrder] = useState<string[]>([])
```

#### 데모 모드 핸들러
```typescript
trackDemoInteraction()
handleDemoStatusChange()
handleDemoUpdateNotes()
handleDemoUpdateDocuments()
handleDemoUpdateDeadline()
handleDemoDelete()
handleDemoTogglePin()
handleDemoReorderPins()
handleDemoSaveExternal()
handleResetDemo()
```

#### 데모 모드 computed values
```typescript
demoProcessedApplications (useMemo)
demoPinnedApplications (useMemo)
demoStatusCounts (useMemo)
demoUrgentCount (useMemo)
```

#### UI 변경
- 비로그인 시 전체 인터랙티브 UI 표시 (기존 오버레이 제거)
- 데모 모드 배너 추가
- 회원가입 권유 모달 추가
- 외부 공고 추가 시 데모 핸들러 사용

---

## 🔄 데이터 흐름

### 비로그인 사용자 (데모 모드)
```
1. 페이지 로드
   ↓
2. localStorage에서 데모 데이터 읽기
   (없으면 INITIAL_DEMO_APPLICATIONS 사용)
   ↓
3. demoApplications 상태로 설정
   ↓
4. 사용자가 기능 사용 (상태 변경, 메모 등)
   ↓
5. trackDemoInteraction() 호출
   - 카운트 증가
   - 5의 배수면 회원가입 모달 표시
   ↓
6. handleDemo* 핸들러 호출
   ↓
7. demoApplications 상태 업데이트
   ↓
8. saveDemoData()로 localStorage에 저장
```

### 로그인 사용자 (기존 로직)
```
1. 페이지 로드
   ↓
2. Supabase에서 실제 데이터 fetch
   ↓
3. applications 상태로 설정
   ↓
4. 사용자가 기능 사용
   ↓
5. handle* 핸들러 호출
   ↓
6. Supabase에 저장
   ↓
7. applications 상태 업데이트
```

---

## 🧪 테스트 시나리오

### 1. 기본 동작 확인
- [ ] 비로그인으로 접속 시 10개의 샘플 데이터 표시
- [ ] 데모 모드 배너 표시 확인
- [ ] "초기화" 버튼 동작 확인

### 2. 검색 & 필터
- [ ] 검색창에 "토스" 입력 → 토스만 표시
- [ ] 상태 필터: "지원 예정" 클릭 → 해당 상태만 표시
- [ ] 정렬: "마감일순" 클릭 → 마감일 가까운 순 정렬
- [ ] 마감 임박 배너 클릭 → 필터 초기화 & 마감일순 정렬

### 3. 상태 변경
- [ ] 지원 예정 → 지원 완료 변경 시 applied_date 자동 설정
- [ ] 상태 변경 후 새로고침 → 변경 내용 유지 확인

### 4. 메모 & 서류
- [ ] 메모 입력 후 저장 → localStorage에 저장 확인
- [ ] 서류 체크박스 클릭 → 상태 유지 확인
- [ ] 마감일 수정 → 변경 내용 반영 확인

### 5. 핀 기능
- [ ] 핀 아이콘 클릭 → 상단 "핀 고정" 섹션으로 이동
- [ ] 핀 순서 드래그 변경 → 순서 유지 확인
- [ ] 핀 해제 → "일반" 섹션으로 복귀

### 6. 외부 공고 추가
- [ ] "외부 공고 추가" 버튼 클릭
- [ ] 정보 입력 후 저장
- [ ] 목록에 새 항목 추가 확인
- [ ] 새로고침 후에도 유지 확인

### 7. 삭제
- [ ] 공고 삭제 → 확인 다이얼로그 표시
- [ ] 확인 후 목록에서 제거 확인
- [ ] 새로고침 후에도 삭제 상태 유지

### 8. 인터랙션 카운트
- [ ] 기능 5번 사용 → 회원가입 모달 표시
- [ ] "계속 둘러보기" 클릭 → 모달 닫힘
- [ ] 추가 5번 사용 → 다시 모달 표시
- [ ] "회원가입하고 시작하기" → /login 페이지 이동

### 9. 초기화
- [ ] 데이터 수정 후 "초기화" 버튼 클릭
- [ ] 확인 다이얼로그 표시
- [ ] 확인 후 초기 샘플 데이터로 복원
- [ ] 인터랙션 카운트도 0으로 초기화

### 10. 브라우저 격리
- [ ] 크롬에서 데이터 변경
- [ ] 엣지에서 접속 → 초기 샘플 데이터 표시 (격리 확인)
- [ ] 시크릿 모드 → 초기 샘플 데이터 (세션 격리)

---

## 🚀 배포 후 확인사항

1. **Vercel 빌드 성공 확인**
   - TypeScript 컴파일 에러 없음
   - 빌드 성공

2. **프로덕션 동작 확인**
   - https://jiwonham.vercel.app 접속 (로그아웃 상태)
   - 데모 모드 정상 동작
   - 모든 기능 테스트

3. **로그인 사용자 영향 없음 확인**
   - 로그인 후 기존 기능 정상 동작
   - 실제 데이터 fetch/저장 정상

---

## 📝 향후 개선 가능 사항

### 1. 데모 데이터 다양화
- 더 많은 업종/직무의 샘플 추가
- 다양한 상태 분포 조정

### 2. 온보딩 개선
- 첫 방문 시 간단한 튜토리얼
- 주요 기능별 툴팁

### 3. 전환율 추적
- 데모 사용 → 회원가입 전환율 측정
- Google Analytics 이벤트 추가

### 4. localStorage 용량 관리
- 데모 데이터가 너무 많아지면 자동 정리
- 최대 50개 제한 등

---

## ✅ 완료 체크리스트

- [x] localStorage 헬퍼 함수 구현
- [x] 10개 샘플 데이터 작성
- [x] 데모 모드 핸들러 구현
- [x] 데모 모드 computed values 구현
- [x] UI 변경 (배너, 모달)
- [x] 인터랙션 추적 로직
- [x] 회원가입 권유 모달
- [x] 초기화 기능
- [x] 문서 작성

---

**구현 완료!** 🎉
