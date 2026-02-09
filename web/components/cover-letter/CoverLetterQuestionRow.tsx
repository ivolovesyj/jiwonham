'use client'

import { useState } from 'react'
import { CoverLetterQuestionWithJob, getCharCountStatus, countChars } from '@/types/cover-letter'
import { AnswerEditor } from './AnswerEditor'
import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react'

interface Props {
  question: CoverLetterQuestionWithJob
  onUpdate: (id: string, data: Partial<CoverLetterQuestionWithJob>) => void
  onDelete: (id: string) => void
}

export function CoverLetterQuestionRow({ question, onUpdate, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false)

  const charCount = countChars(question.answer, question.include_space)
  const charStatus = getCharCountStatus(charCount, question.char_limit)

  const statusColor = {
    ok: 'text-green-600',
    warning: 'text-yellow-600',
    over: 'text-red-600',
  }[charStatus]

  const statusBgColor = {
    ok: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    over: 'bg-red-50 border-red-200',
  }[charStatus]

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      {/* 접힌 상태: 요약 행 */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition"
        onClick={() => setExpanded(!expanded)}
      >
        {/* 질문 유형 배지 */}
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap">
          {question.question_type}
        </span>

        {/* 질문 텍스트 */}
        <p className="flex-1 text-sm text-gray-800 line-clamp-1">
          {question.question}
        </p>

        {/* 글자수 상태 */}
        <div className="flex items-center gap-2 shrink-0">
          {question.answer ? (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusBgColor} ${statusColor}`}>
              {charCount}자{question.char_limit ? ` / ${question.char_limit}자` : ''}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <MessageSquare className="w-3.5 h-3.5" />
              미작성
            </span>
          )}

          {/* 펼치기 아이콘 */}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* 펼친 상태: 에디터 */}
      {expanded && (
        <div className="border-t bg-gray-50/50" onClick={(e) => e.stopPropagation()}>
          <AnswerEditor
            question={question}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        </div>
      )}
    </div>
  )
}
