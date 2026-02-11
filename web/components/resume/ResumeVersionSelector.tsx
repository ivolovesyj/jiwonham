'use client'

import { useState } from 'react'
import { ResumeData } from '@/types/resume'
import { ChevronDown, Plus, Pencil, Trash2, Check } from 'lucide-react'

interface Props {
  resumes: ResumeData[]
  activeId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
}

export function ResumeVersionSelector({ resumes, activeId, onSelect, onCreate, onRename, onDelete }: Props) {
  const [open, setOpen] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const active = resumes.find(r => r.id === activeId)

  const handleStartRename = (r: ResumeData, e: React.MouseEvent) => {
    e.stopPropagation()
    setRenamingId(r.id)
    setRenameValue(r.title)
  }

  const handleConfirmRename = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (renameValue.trim()) onRename(id, renameValue.trim())
    setRenamingId(null)
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (resumes.length <= 1) { alert('마지막 이력서는 삭제할 수 없습니다.'); return }
    if (!confirm('이 이력서를 삭제하시겠습니까?')) return
    onDelete(id)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition max-w-[180px]"
      >
        <span className="truncate">{active?.title ?? '이력서 선택'}</span>
        <ChevronDown className="w-4 h-4 flex-shrink-0 text-gray-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
            {resumes.map(r => (
              <div
                key={r.id}
                onClick={() => { if (renamingId !== r.id) { onSelect(r.id); setOpen(false) } }}
                className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer transition ${r.id === activeId ? 'bg-blue-50' : ''}`}
              >
                {r.id === activeId && <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />}
                {r.id !== activeId && <div className="w-3.5" />}
                {renamingId === r.id ? (
                  <input
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleConfirmRename(r.id, e as any) }}
                    onClick={e => e.stopPropagation()}
                    autoFocus
                    className="flex-1 text-sm px-1 border border-blue-400 rounded focus:outline-none"
                  />
                ) : (
                  <span className="flex-1 text-sm truncate">{r.title}</span>
                )}
                <div className="flex gap-0.5 ml-auto">
                  {renamingId === r.id ? (
                    <button onClick={e => handleConfirmRename(r.id, e)} className="p-1 hover:bg-blue-100 rounded">
                      <Check className="w-3.5 h-3.5 text-blue-600" />
                    </button>
                  ) : (
                    <button onClick={e => handleStartRename(r, e)} className="p-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100">
                      <Pencil className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  )}
                  <button onClick={e => handleDelete(r.id, e)} className="p-1 hover:bg-red-100 rounded">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
            <div className="border-t">
              <button
                onClick={() => { onCreate(); setOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 transition"
              >
                <Plus className="w-4 h-4" />새 이력서 만들기
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
