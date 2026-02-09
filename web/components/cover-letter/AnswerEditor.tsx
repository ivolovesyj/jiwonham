'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { CoverLetterQuestionWithJob, QUESTION_TYPE_OPTIONS, CHAR_LIMIT_OPTIONS, countChars, getCharCountStatus } from '@/types/cover-letter'
import { Save, Trash2, ChevronDown, ChevronUp, Building2 } from 'lucide-react'

interface SavedJobOption {
  id: string
  company: string
  title: string
}

interface Props {
  question: CoverLetterQuestionWithJob
  onUpdate: (id: string, data: Partial<CoverLetterQuestionWithJob>) => void
  onDelete: (id: string) => void
  user: User
}

export function AnswerEditor({ question, onUpdate, onDelete, user }: Props) {
  const [questionText, setQuestionText] = useState(question.question)
  const [questionType, setQuestionType] = useState(question.question_type)
  const [customType, setCustomType] = useState('')
  const [charLimit, setCharLimit] = useState<number | null>(question.char_limit)
  const [includeSpace, setIncludeSpace] = useState(question.include_space)
  const [answer, setAnswer] = useState(question.answer || '')
  const [jdInfo, setJdInfo] = useState(question.jd_info || '')
  const [showJdInfo, setShowJdInfo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState<string>(question.saved_job_id || '')
  const [savedJobs, setSavedJobs] = useState<SavedJobOption[]>([])
  const [showJobSelect, setShowJobSelect] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isCustomType = !QUESTION_TYPE_OPTIONS.includes(questionType as any)

  // 공고 목록 fetch
  useEffect(() => {
    if (showJobSelect && savedJobs.length === 0) {
      fetchSavedJobs()
    }
  }, [showJobSelect])

  const fetchSavedJobs = async () => {
    try {
      const { data } = await supabase
        .from('saved_jobs')
        .select('id, company, title')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (data) {
        setSavedJobs(data.map(j => ({
          id: j.id,
          company: j.company || '회사명 없음',
          title: j.title || '공고명 없음',
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
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = () => {
    if (confirm('이 질문을 삭제하시겠습니까?')) {
      onDelete(question.id)
    }
  }

  return (
    <div className="p-4 space-y-4 bg-gray-50/50">
      {/* 연결 공고 변경 */}
      <div className="flex items-center gap-2">
        <Building2 className="w-3.5 h-3.5 text-gray-400" />
        {showJobSelect ? (
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
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

        {/* 글자수 카운터 */}
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

      {/* JD 정보 (접이식) */}
      <div className="border border-gray-200 rounded-md overflow-hidden">
        <button
          onClick={() => setShowJdInfo(!showJdInfo)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
        >
          <span>JD 및 회사정보 {jdInfo && '(입력됨)'}</span>
          {showJdInfo ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {showJdInfo && (
          <div className="p-3 pt-0">
            <textarea
              value={jdInfo}
              onChange={(e) => setJdInfo(e.target.value)}
              placeholder="채용공고, 회사 소개 등을 붙여넣으세요. AI가 자소서 작성 시 참고합니다."
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-600"
            />
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
