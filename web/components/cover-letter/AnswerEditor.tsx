'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import {
  CoverLetterQuestionWithJob,
  CoverLetterAnswerVersion,
  MaterialRecommendation,
  QUESTION_TYPE_OPTIONS,
  CHAR_LIMIT_OPTIONS,
  countChars,
  getCharCountStatus,
} from '@/types/cover-letter'
import {
  Save, Trash2, ChevronDown, ChevronUp, Building2,
  Sparkles, Wand2, Loader2, MessageSquare, Info,
  Clock, Eye, CheckCircle2,
} from 'lucide-react'
import { trackEvent } from '@/lib/analytics'

interface SavedJobOption {
  id: string
  company: string
  title: string
  description: string | null
  detail: Record<string, any> | null
}

interface Props {
  question: CoverLetterQuestionWithJob
  onUpdate: (id: string, data: Partial<CoverLetterQuestionWithJob>) => void
  onDelete: (id: string) => void
  user: User
}

export function AnswerEditor({ question, onUpdate, onDelete, user }: Props) {
  // 기존 상태
  const [questionText, setQuestionText] = useState(question.question)
  const [questionType, setQuestionType] = useState(question.question_type)
  const [customType, setCustomType] = useState('')
  const [charLimit, setCharLimit] = useState<number | null>(question.char_limit)
  const [includeSpace, setIncludeSpace] = useState(question.include_space)
  const [answer, setAnswer] = useState(question.answer || '')
  const [jdInfo, setJdInfo] = useState(question.jd_info || '')
  const [showJdInfo, setShowJdInfo] = useState(!question.jd_info && !question.saved_job)
  const [saving, setSaving] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState<string>(question.saved_job_id || '')
  const [savedJobs, setSavedJobs] = useState<SavedJobOption[]>([])
  const [showJobSelect, setShowJobSelect] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isCustomType = !QUESTION_TYPE_OPTIONS.includes(questionType as typeof QUESTION_TYPE_OPTIONS[number])

  // AI 소재 추천 상태
  const [recommendations, setRecommendations] = useState<MaterialRecommendation[]>([])
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<string>>(new Set())
  const [aiReasoning, setAiReasoning] = useState('')
  const [recommendLoading, setRecommendLoading] = useState(false)

  // AI 작성 상태
  const [writeLoading, setWriteLoading] = useState(false)

  // AI 피드백 상태
  const [feedback, setFeedback] = useState('')
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [changesExplanation, setChangesExplanation] = useState('')

  // 버전 관리 상태
  const [versions, setVersions] = useState<CoverLetterAnswerVersion[]>([])
  const [showVersions, setShowVersions] = useState(false)
  const [versionSaving, setVersionSaving] = useState(false)

  // 연결된 공고에서 JD 정보 자동 채우기
  const buildJdInfoFromJob = useCallback((job: NonNullable<typeof question.saved_job>) => {
    const parts: string[] = []
    if (job.company) parts.push(`[회사] ${job.company}`)
    if (job.title) parts.push(`[공고] ${job.title}`)

    const detail = job.detail
    if (detail) {
      if (detail.intro) parts.push(`[회사소개]\n${detail.intro}`)
      if (detail.main_tasks) parts.push(`[주요업무]\n${detail.main_tasks}`)
      if (detail.requirements) parts.push(`[자격요건]\n${detail.requirements}`)
      if (detail.preferred_points) parts.push(`[우대사항]\n${detail.preferred_points}`)
      if (detail.benefits) parts.push(`[혜택 및 복지]\n${detail.benefits}`)
      if (detail.employee_types?.length) parts.push(`[고용형태] ${detail.employee_types.join(', ')}`)
      if (detail.career) parts.push(`[경력] ${detail.career}`)
    }

    if (parts.length <= 2 && job.description) {
      parts.push(`[공고내용]\n${job.description}`)
    }

    return parts.join('\n\n')
  }, [])

  useEffect(() => {
    if (!jdInfo && question.saved_job) {
      const autoJd = buildJdInfoFromJob(question.saved_job)
      if (autoJd) {
        setJdInfo(autoJd)
      }
    }
  }, [question.saved_job])

  // 공고 목록 fetch
  useEffect(() => {
    if (showJobSelect && savedJobs.length === 0) {
      fetchSavedJobs()
    }
  }, [showJobSelect])

  const fetchSavedJobs = async () => {
    try {
      const { data: statusData } = await supabase
        .from('application_status')
        .select('saved_job_id')
        .eq('user_id', user.id)
        .eq('status', 'pending')

      const pendingJobIds = (statusData || []).map(s => s.saved_job_id).filter(Boolean)

      if (pendingJobIds.length === 0) {
        setSavedJobs([])
        return
      }

      const { data } = await supabase
        .from('saved_jobs')
        .select('id, company, title, description, detail')
        .in('id', pendingJobIds)
        .order('created_at', { ascending: false })

      if (data) {
        setSavedJobs(data.map(j => ({
          id: j.id,
          company: j.company || '회사명 없음',
          title: j.title || '공고명 없음',
          description: j.description || null,
          detail: j.detail || null,
        })))
      }
    } catch (error) {
      console.error('Failed to fetch saved jobs:', error)
    }
  }

  // textarea auto-resize
  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = Math.max(120, el.scrollHeight) + 'px'
    }
  }, [])

  useEffect(() => {
    autoResize()
  }, [answer, autoResize])

  const charCount = countChars(answer, includeSpace)
  const status = getCharCountStatus(charCount, charLimit)

  // ============ 기존 핸들러 ============

  const handleSave = async () => {
    setSaving(true)
    try {
      const finalType = isCustomType ? customType || questionType : questionType
      await onUpdate(question.id, {
        question: questionText,
        question_type: finalType,
        char_limit: charLimit,
        include_space: includeSpace,
        answer: answer || null,
        jd_info: jdInfo || null,
        saved_job_id: selectedJobId || null,
      })
      if (answer) trackEvent('cover_letter_saved', { has_answer: true })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = () => {
    if (confirm('이 질문을 삭제하시겠습니까?')) {
      onDelete(question.id)
    }
  }

  // ============ AI 헬퍼: 세션 토큰 가져오기 ============

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  // ============ AI 소재 추천 ============

  const handleRecommend = async () => {
    setRecommendLoading(true)
    setChangesExplanation('')
    try {
      const token = await getToken()
      if (!token) throw new Error('로그인이 필요합니다.')

      const response = await fetch('/api/ai/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ question_id: question.id }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || '추천을 가져오는데 실패했습니다.')
      }

      const result = await response.json()
      const recs = result.data?.recommendations || []
      setRecommendations(recs)
      setAiReasoning(result.data?.reasoning || '')
      setSelectedMaterialIds(new Set(recs.map((r: MaterialRecommendation) => r.material_id)))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '추천을 가져오는데 실패했습니다.'
      alert(message)
    } finally {
      setRecommendLoading(false)
    }
  }

  const toggleMaterial = (materialId: string) => {
    setSelectedMaterialIds(prev => {
      const next = new Set(prev)
      if (next.has(materialId)) {
        next.delete(materialId)
      } else {
        next.add(materialId)
      }
      return next
    })
  }

  // ============ AI 자소서 작성 ============

  const handleAIWrite = async () => {
    if (selectedMaterialIds.size === 0) {
      alert('먼저 경험 소재를 선택해주세요.')
      return
    }

    setWriteLoading(true)
    try {
      const token = await getToken()
      if (!token) throw new Error('로그인이 필요합니다.')

      const response = await fetch('/api/ai/write', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          question_id: question.id,
          selected_material_ids: Array.from(selectedMaterialIds),
          char_limit: charLimit,
          include_space: includeSpace,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || '답변 생성에 실패했습니다.')
      }

      const result = await response.json()
      setAnswer(result.data.answer || '')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '답변 생성에 실패했습니다.'
      alert(message)
    } finally {
      setWriteLoading(false)
    }
  }

  // ============ AI 피드백 재작성 ============

  const handleFeedback = async () => {
    if (!feedback.trim()) {
      alert('피드백을 입력해주세요.')
      return
    }
    if (!answer.trim()) {
      alert('수정할 답변이 없습니다.')
      return
    }

    setFeedbackLoading(true)
    try {
      const token = await getToken()
      if (!token) throw new Error('로그인이 필요합니다.')

      const response = await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          previous_answer: answer,
          user_feedback: feedback,
          char_limit: charLimit,
          include_space: includeSpace,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || '답변 수정에 실패했습니다.')
      }

      const result = await response.json()
      setAnswer(result.data.revised_answer || '')
      setChangesExplanation(result.data.changes_explanation || '')
      setFeedback('')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '답변 수정에 실패했습니다.'
      alert(message)
    } finally {
      setFeedbackLoading(false)
    }
  }

  // ============ 버전 관리 ============

  const fetchVersions = async () => {
    try {
      const { data, error } = await supabase
        .from('cover_letter_answer_versions')
        .select('*')
        .eq('question_id', question.id)
        .eq('user_id', user.id)
        .order('version_number', { ascending: false })

      if (!error && data) {
        setVersions(data)
      }
    } catch (error) {
      console.error('Failed to fetch versions:', error)
    }
  }

  const handleSaveVersion = async () => {
    if (!answer.trim()) {
      alert('저장할 답변이 없습니다.')
      return
    }

    setVersionSaving(true)
    try {
      // 다음 버전 번호 계산
      const { data: existing } = await supabase
        .from('cover_letter_answer_versions')
        .select('version_number')
        .eq('question_id', question.id)
        .eq('user_id', user.id)
        .order('version_number', { ascending: false })
        .limit(1)

      const nextVersion = existing && existing.length > 0 ? existing[0].version_number + 1 : 1

      const { error } = await supabase
        .from('cover_letter_answer_versions')
        .insert({
          user_id: user.id,
          question_id: question.id,
          answer: answer,
          version_number: nextVersion,
        })

      if (error) throw error

      await fetchVersions()
      setShowVersions(true)
    } catch (error) {
      console.error('Failed to save version:', error)
      alert('버전 저장에 실패했습니다.')
    } finally {
      setVersionSaving(false)
    }
  }

  const handleLoadVersion = (versionAnswer: string) => {
    if (answer.trim() && !confirm('현재 답변이 이 버전으로 교체됩니다. 계속하시겠습니까?')) return
    setAnswer(versionAnswer)
  }

  const handleDeleteVersion = async (versionId: string) => {
    if (!confirm('이 버전을 삭제하시겠습니까?')) return

    try {
      const { error } = await supabase
        .from('cover_letter_answer_versions')
        .delete()
        .eq('id', versionId)
        .eq('user_id', user.id)

      if (!error) {
        setVersions(prev => prev.filter(v => v.id !== versionId))
      }
    } catch (error) {
      console.error('Failed to delete version:', error)
    }
  }

  // 버전 목록 토글 시 fetch
  useEffect(() => {
    if (showVersions && versions.length === 0) {
      fetchVersions()
    }
  }, [showVersions])

  return (
    <div className="p-4 space-y-4 bg-gray-50/50">
      {/* 연결 공고 변경 */}
      <div className="flex items-center gap-2">
        <Building2 className="w-3.5 h-3.5 text-gray-400" />
        {showJobSelect ? (
          <select
            value={selectedJobId}
            onChange={(e) => {
              const newJobId = e.target.value
              setSelectedJobId(newJobId)
              // JD 정보가 비어있으면 선택한 공고에서 자동 채우기
              if (!jdInfo && newJobId) {
                const selectedJob = savedJobs.find(j => j.id === newJobId)
                if (selectedJob) {
                  const autoJd = buildJdInfoFromJob(selectedJob as any)
                  if (autoJd) setJdInfo(autoJd)
                }
              }
            }}
            className="flex-1 px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">공고 미연결</option>
            {savedJobs.map(job => (
              <option key={job.id} value={job.id}>
                {job.company} - {job.title}
              </option>
            ))}
          </select>
        ) : (
          <button
            onClick={() => setShowJobSelect(true)}
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline transition"
          >
            {question.saved_job
              ? `${question.saved_job.company || '회사명 없음'} - ${question.saved_job.title || '공고명 없음'}`
              : '공고 미연결'}
            <span className="ml-1 text-gray-400">(변경)</span>
          </button>
        )}
      </div>

      {/* 질문 유형 + 질문 텍스트 */}
      <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">질문 유형</label>
          {isCustomType ? (
            <input
              type="text"
              value={customType || questionType}
              onChange={(e) => setCustomType(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <select
              value={questionType}
              onChange={(e) => {
                if (e.target.value === '__custom__') {
                  setCustomType('')
                  setQuestionType('__custom__')
                } else {
                  setQuestionType(e.target.value)
                }
              }}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {QUESTION_TYPE_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
              <option value="__custom__">직접 입력</option>
            </select>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">질문</label>
          <input
            type="text"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 글자수 설정 */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500">글자수 제한</label>
          <select
            value={charLimit ?? ''}
            onChange={(e) => setCharLimit(e.target.value ? Number(e.target.value) : null)}
            className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">제한 없음</option>
            {CHAR_LIMIT_OPTIONS.map(n => (
              <option key={n} value={n}>{n}자 이내</option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={includeSpace}
            onChange={(e) => setIncludeSpace(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-600">공백 포함</span>
        </label>

        <div className={`text-sm font-semibold tabular-nums ${
          status === 'over' ? 'text-red-600' :
          status === 'warning' ? 'text-yellow-600' :
          'text-green-600'
        }`}>
          현재 {charCount}자
          {charLimit && ` / ${charLimit}자 이내`}
          {status === 'over' && charLimit && (
            <span className="text-red-500 text-xs ml-1">({charCount - charLimit}자 초과)</span>
          )}
        </div>
      </div>

      {/* JD 정보 (접이식) */}
      <div className="border border-gray-200 rounded-md overflow-hidden">
        <button
          onClick={() => setShowJdInfo(!showJdInfo)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
        >
          <span>JD 및 회사정보 {jdInfo ? '(입력됨)' : '(AI 작성에 필요)'}</span>
          {showJdInfo ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {showJdInfo && (
          <div className="p-3 pt-0">
            <textarea
              value={jdInfo}
              onChange={(e) => setJdInfo(e.target.value)}
              placeholder="채용공고의 직무 설명, 자격요건, 우대사항, 회사 소개 등을 붙여넣으세요. AI가 자소서 작성 시 참고합니다."
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-600"
            />
            {!jdInfo && (
              <p className="text-xs text-amber-600 mt-1">JD 정보를 입력하면 AI가 더 정확한 소재 추천과 답변 작성을 할 수 있습니다.</p>
            )}
          </div>
        )}
      </div>

      {/* ============ AI 소재 추천 ============ */}
      <div className="border border-purple-200 rounded-lg overflow-hidden bg-white">
        <div className="px-4 py-3 bg-purple-50 border-b border-purple-100">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-purple-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              AI 소재 추천
            </h4>
            {recommendations.length > 0 && (
              <button
                onClick={handleRecommend}
                disabled={recommendLoading}
                className="text-xs text-purple-600 hover:text-purple-800 hover:underline"
              >
                다시 추천받기
              </button>
            )}
          </div>
        </div>

        <div className="p-4">
          {recommendations.length === 0 ? (
            <button
              onClick={handleRecommend}
              disabled={recommendLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {recommendLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  AI가 소재를 분석하는 중...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  AI 소재 추천받기
                </>
              )}
            </button>
          ) : (
            <div className="space-y-3">
              {aiReasoning && (
                <p className="text-xs text-purple-700 bg-purple-50 p-2.5 rounded-md border border-purple-100">
                  {aiReasoning}
                </p>
              )}

              <div className="space-y-2">
                {recommendations.map((rec) => (
                  <div
                    key={rec.material_id}
                    onClick={() => toggleMaterial(rec.material_id)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedMaterialIds.has(rec.material_id)
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        selectedMaterialIds.has(rec.material_id)
                          ? 'border-purple-500 bg-purple-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedMaterialIds.has(rec.material_id) && (
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded mb-1">
                          우선순위 {rec.priority}
                        </span>
                        <p className="text-sm text-gray-700 mb-1">
                          <strong>추천 이유:</strong> {rec.reason}
                        </p>
                        <p className="text-xs text-gray-500">
                          <strong>활용 방안:</strong> {rec.usage_suggestion}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-500 text-center">
                {selectedMaterialIds.size}개 소재 선택됨
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ============ AI 자소서 작성 버튼 ============ */}
      {recommendations.length > 0 && (
        <button
          onClick={handleAIWrite}
          disabled={writeLoading || selectedMaterialIds.size === 0}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {writeLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              AI가 자소서를 작성하는 중...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              AI 자소서 작성하기 ({selectedMaterialIds.size}개 소재 활용)
            </>
          )}
        </button>
      )}

      {/* 답변 */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">답변</label>
        <textarea
          ref={textareaRef}
          value={answer}
          onChange={(e) => { setAnswer(e.target.value); autoResize() }}
          placeholder="자기소개서 답변을 작성하세요..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
          style={{ minHeight: '120px' }}
        />
      </div>

      {/* ============ AI 피드백 수정 ============ */}
      {answer.trim() && (
        <div className="border border-blue-200 rounded-lg overflow-hidden bg-white">
          <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
            <h4 className="text-sm font-semibold text-blue-900 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4" />
              AI 피드백 수정
            </h4>
          </div>

          <div className="p-4 space-y-3">
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder='예: "좀 더 구체적인 수치를 넣어줘", "톤이 너무 딱딱해", "두 번째 문단을 줄여줘"'
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />

            <button
              onClick={handleFeedback}
              disabled={feedbackLoading || !feedback.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {feedbackLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  수정하는 중...
                </>
              ) : (
                '피드백 반영하기'
              )}
            </button>

            {changesExplanation && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-blue-900 mb-0.5">수정 내용</p>
                  <p className="text-xs text-blue-700">{changesExplanation}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ 버전 관리 ============ */}
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        <button
          onClick={() => setShowVersions(!showVersions)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition"
        >
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            버전 관리
            {versions.length > 0 && (
              <span className="text-xs font-normal text-gray-500">({versions.length}개)</span>
            )}
          </h4>
          {showVersions ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {showVersions && (
          <div className="p-4 pt-0 space-y-3">
            <button
              onClick={handleSaveVersion}
              disabled={versionSaving || !answer.trim()}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-md transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {versionSaving ? '저장 중...' : '새 버전 저장하기'}
            </button>

            {versions.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-3">
                저장된 버전이 없습니다.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {versions.map((version) => (
                  <div key={version.id} className="p-3 bg-gray-50 rounded-md border border-gray-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                          v{version.version_number}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(version.created_at).toLocaleString('ko-KR', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleLoadVersion(version.answer)}
                          className="p-1 hover:bg-gray-200 rounded transition"
                          title="이 버전 불러오기"
                        >
                          <Eye className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteVersion(version.id)}
                          className="p-1 hover:bg-red-100 rounded transition"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">{version.answer}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 액션 버튼 */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={handleDelete}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          질문 삭제
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !questionText.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  )
}
