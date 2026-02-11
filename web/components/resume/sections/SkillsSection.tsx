'use client'

import { useState } from 'react'
import { SkillItem } from '@/types/resume'
import { Plus, X } from 'lucide-react'

interface Props {
  items: SkillItem[]
  onChange: (items: SkillItem[]) => void
}

export function SkillsSection({ items, onChange }: Props) {
  const [input, setInput] = useState('')

  const handleAdd = () => {
    const label = input.trim()
    if (!label) return
    onChange([...items, { id: crypto.randomUUID(), label }])
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAdd() }
  }

  const handleDelete = (id: string) => {
    onChange(items.filter(i => i.id !== id))
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 min-h-[40px]">
        {items.length === 0 && (
          <p className="text-sm text-gray-400">역량, 도구, 기술 등을 태그로 추가하세요.</p>
        )}
        {items.map(item => (
          <span key={item.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-100 text-blue-800 text-sm rounded-full">
            {item.label}
            <button onClick={() => handleDelete(item.id)} className="hover:text-blue-600 transition ml-0.5">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="예: Excel, Python, 영업관리, Adobe XD … Enter로 추가"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button onClick={handleAdd} disabled={!input.trim()} className="flex items-center gap-1 px-3 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition disabled:opacity-50">
          <Plus className="w-4 h-4" />추가
        </button>
      </div>
    </div>
  )
}
