'use client'

import { useState } from 'react'
import { LinkItem } from '@/types/resume'
import { Plus, Pencil, Trash2, X, ExternalLink } from 'lucide-react'

interface Props {
  items: LinkItem[]
  onChange: (items: LinkItem[]) => void
}

const LABEL_PRESETS = ['GitHub', 'LinkedIn', '포트폴리오', '블로그', 'Notion', '기타']
const EMPTY_FORM = { label: 'GitHub', url: '' }

export function LinksSection({ items, onChange }: Props) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const openAdd = () => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true) }
  const openEdit = (item: LinkItem) => {
    setForm({ label: item.label, url: item.url })
    setEditingId(item.id); setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditingId(null) }

  const handleSave = () => {
    if (!form.label.trim() || !form.url.trim()) return
    if (editingId) {
      onChange(items.map(i => i.id === editingId ? { ...form, id: editingId } : i))
    } else {
      onChange([...items, { ...form, id: crypto.randomUUID() }])
    }
    closeForm()
  }

  const handleDelete = (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return
    onChange(items.filter(i => i.id !== id))
  }

  return (
    <div className="space-y-3">
      {items.length === 0 && !showForm && (
        <p className="text-sm text-gray-400 text-center py-4">포트폴리오, GitHub 등 링크를 추가해주세요.</p>
      )}

      {items.map(item => (
        <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded font-medium flex-shrink-0">{item.label}</span>
            <a href={item.url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline truncate flex items-center gap-1">
              {item.url}<ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
          </div>
          <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition ml-2">
            <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-gray-200 rounded-md transition"><Pencil className="w-3.5 h-3.5 text-gray-500" /></button>
            <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-red-100 rounded-md transition"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
          </div>
        </div>
      ))}

      {showForm && (
        <div className="border border-blue-200 rounded-lg p-4 space-y-3 bg-blue-50/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-blue-700">{editingId ? '링크 수정' : '링크 추가'}</span>
            <button onClick={closeForm}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">분류 <span className="text-red-500">*</span></label>
              <select value={form.label} onChange={e => setForm(p => ({...p, label: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {LABEL_PRESETS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">URL <span className="text-red-500">*</span></label>
              <input value={form.url} onChange={e => setForm(p => ({...p, url: e.target.value}))} placeholder="https://" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={closeForm} className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-md transition">취소</button>
            <button onClick={handleSave} disabled={!form.label.trim() || !form.url.trim()} className="px-3 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-md transition disabled:opacity-50">저장</button>
          </div>
        </div>
      )}

      {!showForm && (
        <button onClick={openAdd} className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg border border-dashed border-blue-200 transition">
          <Plus className="w-4 h-4" />추가
        </button>
      )}
    </div>
  )
}
