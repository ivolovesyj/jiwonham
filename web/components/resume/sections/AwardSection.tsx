'use client'

import { useState } from 'react'
import { AwardItem } from '@/types/resume'
import { Plus, Pencil, Trash2, X } from 'lucide-react'

interface Props {
  items: AwardItem[]
  onChange: (items: AwardItem[]) => void
}

const EMPTY_FORM = { name: '', organization: '', date: '', description: '' }

export function AwardSection({ items, onChange }: Props) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const openAdd = () => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true) }
  const openEdit = (item: AwardItem) => {
    setForm({ name: item.name, organization: item.organization, date: item.date, description: item.description || '' })
    setEditingId(item.id); setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditingId(null) }

  const handleSave = () => {
    if (!form.name.trim() || !form.organization.trim()) return
    const payload = { ...form, description: form.description || undefined }
    if (editingId) {
      onChange(items.map(i => i.id === editingId ? { ...payload, id: editingId } : i))
    } else {
      onChange([...items, { ...payload, id: crypto.randomUUID() }])
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
        <p className="text-sm text-gray-400 text-center py-4">수상경력을 추가해주세요.</p>
      )}

      {items.map(item => (
        <div key={item.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg group">
          <div className="space-y-0.5 min-w-0 flex-1 pr-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900">{item.name}</span>
              <span className="text-xs text-gray-500">{item.organization}</span>
              {item.date && <span className="text-xs text-gray-400">{item.date.replace('-', '.')}</span>}
            </div>
            {item.description && <p className="text-xs text-gray-600">{item.description}</p>}
          </div>
          <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition">
            <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-gray-200 rounded-md transition"><Pencil className="w-3.5 h-3.5 text-gray-500" /></button>
            <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-red-100 rounded-md transition"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
          </div>
        </div>
      ))}

      {showForm && (
        <div className="border border-blue-200 rounded-lg p-4 space-y-3 bg-blue-50/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-blue-700">{editingId ? '수상경력 수정' : '수상경력 추가'}</span>
            <button onClick={closeForm}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">수상명 <span className="text-red-500">*</span></label>
              <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="예: 우수상, 장관상" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">수여기관 <span className="text-red-500">*</span></label>
              <input value={form.organization} onChange={e => setForm(p => ({...p, organization: e.target.value}))} placeholder="예: 과학기술정보통신부" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">수상년월</label>
              <input type="month" value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">설명 (선택)</label>
              <input value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="예: 전국 대학생 마케팅 공모전" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={closeForm} className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-md transition">취소</button>
            <button onClick={handleSave} disabled={!form.name.trim() || !form.organization.trim()} className="px-3 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-md transition disabled:opacity-50">저장</button>
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
