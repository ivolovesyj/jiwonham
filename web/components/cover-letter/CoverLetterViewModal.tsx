'use client'

import { useState, useEffect } from 'react'
import { X, FileText } from 'lucide-react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { CoverLetterQuestion, countChars } from '@/types/cover-letter'

interface Props {
  isOpen: boolean
  onClose: () => void
  savedJobId: string
  jobLabel: string
  user: User
}

export function CoverLetterViewModal({ isOpen, onClose, savedJobId, jobLabel, user }: Props) {
  const [questions, setQuestions] = useState<CoverLetterQuestion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen && savedJobId) {
      fetchQuestions()
    }
  }, [isOpen, savedJobId])

  const fetchQuestions = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('cover_letter_questions')
        .select('*')
        .eq('user_id', user.id)
        .eq('saved_job_id', savedJobId)
        .order('created_at', { ascending: true })

      if (!error) setQuestions(data || [])
    } catch (error) {
      console.error('Failed to fetch questions:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              자기소개서 내역
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">{jobLabel}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-md transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">불러오는 중...</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">작성된 자기소개서가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {questions.map((q, idx) => {
                const charCount = q.answer ? countChars(q.answer, q.include_space) : 0
                return (
                  <div key={q.id} className="pb-6 border-b last:border-0">
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                            {q.question_type}
                          </span>
                          {q.char_limit && (
                            <span className="text-xs text-gray-500">
                              {charCount}/{q.char_limit}자 {q.include_space ? '(공백 포함)' : '(공백 제외)'}
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">{q.question}</h3>
                        {q.answer ? (
                          <div className="bg-gray-50 p-3 rounded-md">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{q.answer}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400 italic">작성된 답변이 없습니다.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
