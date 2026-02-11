'use client'

import { useState } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
}

const MAX_LENGTH = 150

export function SummarySection({ value, onChange }: Props) {
  const [draft, setDraft] = useState(value)
  const [editing, setEditing] = useState(false)

  const handleSave = () => {
    onChange(draft.trim())
    setEditing(false)
  }

  const handleCancel = () => {
    setDraft(value)
    setEditing(false)
  }

  if (!editing) {
    return (
      <div
        onClick={() => setEditing(true)}
        className="min-h-[48px] cursor-pointer rounded-md px-3 py-2 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 transition"
      >
        {value
          ? <span className="whitespace-pre-wrap">{value}</span>
          : <span className="text-gray-400">직무 경험을 한 문장으로 요약하세요. 클릭하여 입력...</span>
        }
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value.slice(0, MAX_LENGTH))}
        placeholder="예: 3년 차 마케터로 디지털 캠페인 기획과 성과 분석을 주로 담당했습니다."
        rows={3}
        autoFocus
        className="w-full px-3 py-2 border border-blue-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{draft.length} / {MAX_LENGTH}</span>
        <div className="flex gap-2">
          <button onClick={handleCancel} className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-md transition">취소</button>
          <button onClick={handleSave} className="px-3 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-md transition">저장</button>
        </div>
      </div>
    </div>
  )
}
