'use client'

import { useState } from 'react'
import { ExperienceMaterial, EXPERIENCE_TYPE_OPTIONS } from '@/types/cover-letter'
import { Pencil, Trash2, X, Check, ScrollText } from 'lucide-react'

interface Props {
  material: ExperienceMaterial
  onUpdate: (id: string, data: Partial<ExperienceMaterial>) => void
  onDelete: (id: string) => void
}

export function ExperienceMaterialCard({ material, onUpdate, onDelete }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(material.title)
  const [experienceType, setExperienceType] = useState(material.experience_type)
  const [content, setContent] = useState(material.content || '')

  const handleSave = () => {
    if (!title.trim()) return
    onUpdate(material.id, { title: title.trim(), experience_type: experienceType, content: content.trim() || null })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setTitle(material.title)
    setExperienceType(material.experience_type)
    setContent(material.content || '')
    setIsEditing(false)
  }

  const handleDelete = () => {
    if (confirm('이 소재를 삭제하시겠습니까?')) {
      onDelete(material.id)
    }
  }

  if (isEditing) {
    return (
      <div className="bg-white border-2 border-blue-300 rounded-lg p-4 space-y-3 shadow-sm">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="소재 제목"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={experienceType}
          onChange={(e) => setExperienceType(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {EXPERIENCE_TYPE_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="경험 내용을 자유롭게 작성하세요..."
          rows={5}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <div className="flex items-center justify-between">
          <button
            onClick={handleDelete}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            삭제
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim()}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              저장
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer group"
      onClick={() => setIsEditing(true)}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 flex-1">{material.title}</h3>
        <button
          onClick={(e) => { e.stopPropagation(); setIsEditing(true) }}
          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-600 transition-all"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-100">
          {material.experience_type}
        </span>
        {material.resume_item_type && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-600 border border-blue-100">
            <ScrollText className="w-3 h-3" />이력서에서 가져옴
          </span>
        )}
      </div>
      {material.content && (
        <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">{material.content}</p>
      )}
    </div>
  )
}
