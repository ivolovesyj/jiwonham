'use client'

import { SectionType, SECTION_LABELS, REQUIRED_SECTIONS } from '@/types/resume'
import { Eye, EyeOff } from 'lucide-react'

interface Props {
  type: SectionType
  isVisible: boolean
  onToggleVisibility: () => void
  children: React.ReactNode
}

export function SectionCard({ type, isVisible, onToggleVisibility, children }: Props) {
  const isRequired = REQUIRED_SECTIONS.includes(type)

  return (
    <div className={`bg-white rounded-lg border transition ${isVisible ? 'border-gray-200' : 'border-dashed border-gray-200 opacity-60'}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">{SECTION_LABELS[type]}</h3>
        {!isRequired && (
          <button
            onClick={onToggleVisibility}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition"
            title={isVisible ? '이 섹션 숨기기' : '이 섹션 표시하기'}
          >
            {isVisible ? (
              <><Eye className="w-3.5 h-3.5" /><span>표시중</span></>
            ) : (
              <><EyeOff className="w-3.5 h-3.5" /><span>숨김</span></>
            )}
          </button>
        )}
        {isRequired && (
          <span className="text-xs text-blue-500 font-medium">필수</span>
        )}
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  )
}
