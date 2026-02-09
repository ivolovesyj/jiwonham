'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { QUESTION_TYPE_OPTIONS, CHAR_LIMIT_OPTIONS } from '@/types/cover-letter'
import { X } from 'lucide-react'

interface SavedJobOption {
  id: string
  company: string
  title: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSave: (data: {
    saved_job_id: string | null
    question_type: string
    question: string
    char_limit: number | null
  }) => void
  user: User
  initialJobId?: string | null
}

export function AddQuestionModal({ isOpen, onClose, onSave, user, initialJobId }: Props) {
  const [savedJobs, setSavedJobs] = useState<SavedJobOption[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string>('')
  const [questionType, setQuestionType] = useState<string>(QUESTION_TYPE_OPTIONS[0])
  const [customType, setCustomType] = useState('')
  const [isCustomType, setIsCustomType] = useState(false)
  const [question, setQuestion] = useState('')
  const [charLimit, setCharLimit] = useState<number | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchSavedJobs()
    }
  }, [isOpen])

  const fetchSavedJobs = async () => {
    try {
      // "지원 예정" 상태인 공고만 가져오기
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
        .select('id, company, title')
        .in('id', pendingJobIds)
        .order('created_at', { ascending: false })

      if (data) {
        setSavedJobs(data.map(j => ({
          id: j.id,
          company: j.company || '회사명 없음',
          title: j.title || '공고명 없음',
        })))
        // initialJobId가 있으면 자동 선택
        if (initialJobId && data.some(j => j.id === initialJobId)) {
          setSelectedJobId(initialJobId)
        }
      }
    } catch (error) {
      console.error('Failed to fetch saved jobs:', error)
    }
  }

  if (!isOpen) return null

  const [addedCount, setAddedCount] = useState(0)

  const handleSave = () => {
    if (!question.trim()) return
    const finalType = isCustomType ? customType.trim() || '기타' : questionType
    onSave({
      saved_job_id: selectedJobId || null,
      question_type: finalType,
      question: question.trim(),
      char_limit: charLimit,
    })
    // 질문/글자수만 리셋 (공고+유형은 유지해서 연달아 등록 가능)
    setQuestion('')
    setCharLimit(null)
    setAddedCount(prev => prev + 1)
  }

  const handleClose = () => {
    // 전체 리셋
    setSelectedJobId('')
    setQuestionType(QUESTION_TYPE_OPTIONS[0])
    setCustomType('')
    setIsCustomType(false)
    setQuestion('')
    setCharLimit(null)
    setAddedCount(0)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">새 질문 추가</h2>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-md transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 폼 */}
        <div className="p-4 space-y-4">
          {/* 공고 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">연결할 공고</label>
            <p className="text-xs text-gray-400 mb-1.5">지원 예정 상태의 공고만 표시됩니다.</p>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">공고 미연결</option>
              {savedJobs.map(job => (
                <option key={job.id} value={job.id}>
                  {job.company} - {job.title}
                </option>
              ))}
            </select>
          </div>

          {/* 질문 유형 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">질문 유형</label>
            {isCustomType ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  placeholder="질문 유형 직접 입력"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={() => { setIsCustomType(false); setQuestionType(QUESTION_TYPE_OPTIONS[0]) }}
                  className="px-3 py-2 text-xs text-gray-500 hover:bg-gray-100 rounded-md"
                >
                  기본값
                </button>
              </div>
            ) : (
              <select
                value={questionType}
                onChange={(e) => {
                  if (e.target.value === '__custom__') {
                    setIsCustomType(true)
                    setCustomType('')
                  } else {
                    setQuestionType(e.target.value)
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {QUESTION_TYPE_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
                <option value="__custom__">직접 입력</option>
              </select>
            )}
          </div>

          {/* 질문 텍스트 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              질문 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="예: 지원 동기와 입사 후 이루고 싶은 목표를 서술하시오."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* 글자수 제한 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">글자수 제한</label>
            <select
              value={charLimit ?? ''}
              onChange={(e) => setCharLimit(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">제한 없음</option>
              {CHAR_LIMIT_OPTIONS.map(n => (
                <option key={n} value={n}>{n}자 이내</option>
              ))}
            </select>
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div>
            {addedCount > 0 && (
              <span className="text-xs text-green-600 font-medium">{addedCount}개 질문 추가됨</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition"
            >
              {addedCount > 0 ? '완료' : '취소'}
            </button>
            <button
              onClick={handleSave}
              disabled={!question.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition disabled:opacity-50"
            >
              추가
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
