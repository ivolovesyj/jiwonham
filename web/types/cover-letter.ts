// 경험 유형 옵션
export const EXPERIENCE_TYPE_OPTIONS = [
  '인턴',
  '대외활동',
  '사이드 프로젝트',
  '동아리',
  '공모전',
  '봉사활동',
  '아르바이트',
  '학업/연구',
  '자격증',
  '기타',
] as const

// 질문 유형 옵션
export const QUESTION_TYPE_OPTIONS = [
  '지원 동기',
  '입사 후 포부',
  '성장 과정 및 가치관',
  '성격의 장단점',
  '직무 역량',
  '사회성 및 협업',
  '경험 및 행동',
] as const

// 글자수 제한 옵션 (50자 단위, 50~2000)
export const CHAR_LIMIT_OPTIONS = Array.from({ length: 40 }, (_, i) => (i + 1) * 50)

// 경험 소재
export interface ExperienceMaterial {
  id: string
  user_id: string
  title: string
  experience_type: string
  content: string | null
  resume_item_type?: string | null
  resume_item_id?: string | null
  created_at: string
  updated_at: string
}

// 자소서 질문
export interface CoverLetterQuestion {
  id: string
  user_id: string
  saved_job_id: string | null
  question_type: string
  question: string
  char_limit: number | null
  include_space: boolean
  answer: string | null
  jd_info: string | null
  created_at: string
  updated_at: string
}

// 자소서 질문 + 연결된 공고 정보
export interface CoverLetterQuestionWithJob extends CoverLetterQuestion {
  saved_job?: {
    id: string
    company: string | null
    title: string | null
    external_company: string | null
    external_title: string | null
    description: string | null
    detail: Record<string, any> | null
  } | null
}

// 답변 버전
export interface CoverLetterAnswerVersion {
  id: string
  user_id: string
  question_id: string
  version_number: number
  answer: string
  created_at: string
}

// AI 소재 추천 결과
export interface MaterialRecommendation {
  material_id: string
  reason: string
  usage_suggestion: string
  priority: number
}

export interface AIRecommendationResponse {
  recommendations: MaterialRecommendation[]
  total_recommended: number
  reasoning: string
}

// AI 작성 응답
export interface AIWritingResponse {
  answer: string
  char_count: number
  within_limit: boolean
}

// AI 피드백 응답
export interface AIFeedbackResponse {
  revised_answer: string
  changes_explanation: string
  char_count: number
  within_limit: boolean
}

// 글자수 세기 유틸
export function countChars(text: string | null, includeSpace: boolean): number {
  if (!text) return 0
  return includeSpace ? text.length : text.replace(/\s/g, '').length
}

// 글자수 상태 (색상)
export function getCharCountStatus(current: number, limit: number | null): 'ok' | 'warning' | 'over' {
  if (!limit) return 'ok'
  const ratio = current / limit
  if (ratio > 1) return 'over'
  if (ratio >= 0.9) return 'warning'
  return 'ok'
}
