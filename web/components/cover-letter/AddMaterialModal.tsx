'use client'

import { useState, useEffect } from 'react'
import { EXPERIENCE_TYPE_OPTIONS } from '@/types/cover-letter'
import { X, Lightbulb } from 'lucide-react'

interface PrefilledData {
  title: string
  experience_type: string
  content: string
  resume_item_type?: string
  resume_item_id?: string
  modalTitle?: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { title: string; experience_type: string; content: string | null; resume_item_type?: string; resume_item_id?: string }) => void
  prefilledData?: PrefilledData
}

export function AddMaterialModal({ isOpen, onClose, onSave, prefilledData }: Props) {
  const [title, setTitle] = useState('')
  const [experienceType, setExperienceType] = useState<string>(EXPERIENCE_TYPE_OPTIONS[0])
  const [content, setContent] = useState('')

  useEffect(() => {
    if (isOpen) {
      if (prefilledData) {
        setTitle(prefilledData.title)
        setExperienceType(prefilledData.experience_type)
        setContent(prefilledData.content)
      }
    } else {
      setTitle('')
      setExperienceType(EXPERIENCE_TYPE_OPTIONS[0])
      setContent('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSave = () => {
    if (!title.trim()) return
    onSave({
      title: title.trim(),
      experience_type: experienceType,
      content: content.trim() || null,
      ...(prefilledData?.resume_item_type ? { resume_item_type: prefilledData.resume_item_type } : {}),
      ...(prefilledData?.resume_item_id ? { resume_item_id: prefilledData.resume_item_id } : {}),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">{prefilledData?.modalTitle ?? '새 소재 추가'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-md transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 이력서 연동 힌트 */}
        {prefilledData && (
          <div className="mx-4 mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">이력서 내용이 기본으로 채워졌어요. 자기소개서에 활용할 상세 경험을 추가해주세요.</p>
          </div>
        )}

        {/* 폼 */}
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">경험 유형</label>
            <select
              value={experienceType}
              onChange={(e) => setExperienceType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {EXPERIENCE_TYPE_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              소재 제목 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 데이터 프로젝트 협업 경험"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">경험 내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="경험을 자유롭게 작성하세요. 어떤 상황이었고, 무엇을 했으며, 어떤 결과를 얻었는지 등..."
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition disabled:opacity-50"
          >
            추가
          </button>
        </div>
      </div>
    </div>
  )
}
