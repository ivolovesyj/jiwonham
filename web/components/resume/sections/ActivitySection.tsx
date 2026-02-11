'use client'

import { useState } from 'react'
import { ActivityItem } from '@/types/resume'
import { Plus, Pencil, Trash2, X, Lightbulb, Check } from 'lucide-react'

interface Props {
  items: ActivityItem[]
  onChange: (items: ActivityItem[]) => void
  onAddToMaterial?: (item: ActivityItem) => void
  addedMaterialIds?: Set<string>
}

const EMPTY_FORM: Omit<ActivityItem, 'id'> = {
  name: '', organization: '', start_date: '', end_date: null, is_current: false, description: '',
}

export function ActivitySection({ items, onChange, onAddToMaterial, addedMaterialIds }: Props) {
  const [form, setForm] = useState<Omit<ActivityItem, 'id'>>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const openAdd = () => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true) }
  const openEdit = (item: ActivityItem) => {
    setForm({ name: item.name, organization: item.organization, start_date: item.start_date, end_date: item.end_date, is_current: item.is_current, description: item.description || '' })
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

  const formatDate = (d: string | null) => d ? d.replace('-', '.') : ''

  return (
    <div className="space-y-3">
      {items.length === 0 && !showForm && (
        <p className="text-sm text-gray-400 text-center py-4">대외활동을 추가해주세요.</p>
      )}

      {items.map(item => (
        <div key={item.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg group">
          <div className="space-y-0.5 min-w-0 flex-1 pr-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900">{item.name}</span>
              <span className="text-xs text-gray-500">{item.organization}</span>
              {addedMaterialIds?.has(item.id) && (
                <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <Check className="w-3 h-3" />소재 추가됨
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">{formatDate(item.start_date)} ~ {item.is_current ? '진행중' : formatDate(item.end_date)}</p>
            {item.description && <p className="text-xs text-gray-600 line-clamp-2">{item.description}</p>}
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {onAddToMaterial && (
              <button onClick={() => onAddToMaterial(item)} className="p-1.5 hover:bg-green-100 rounded-md transition" title="자소서 소재로 추가">
                <Lightbulb className={`w-3.5 h-3.5 ${addedMaterialIds?.has(item.id) ? 'text-green-500' : 'text-gray-300'}`} />
              </button>
            )}
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
              <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-gray-200 rounded-md transition"><Pencil className="w-3.5 h-3.5 text-gray-500" /></button>
              <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-red-100 rounded-md transition"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
            </div>
          </div>
        </div>
      ))}

      {showForm && (
        <div className="border border-blue-200 rounded-lg p-4 space-y-3 bg-blue-50/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-blue-700">{editingId ? '대외활동 수정' : '대외활동 추가'}</span>
            <button onClick={closeForm}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">활동명 <span className="text-red-500">*</span></label>
              <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="예: 교내 마케팅 동아리" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">기관/단체명 <span className="text-red-500">*</span></label>
              <input value={form.organization} onChange={e => setForm(p => ({...p, organization: e.target.value}))} placeholder="예: 한국대학교" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">시작년월</label>
              <input type="month" value={form.start_date} onChange={e => setForm(p => ({...p, start_date: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">종료년월</label>
              <input type="month" value={form.end_date || ''} onChange={e => setForm(p => ({...p, end_date: e.target.value || null}))} disabled={form.is_current} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="act-current" checked={form.is_current} onChange={e => setForm(p => ({...p, is_current: e.target.checked, end_date: e.target.checked ? null : p.end_date}))} className="rounded" />
              <label htmlFor="act-current" className="text-xs text-gray-600">진행중</label>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-600 mb-1">활동 내용 (선택)</label>
              <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="활동 내용과 역할을 간략히 기재해주세요." rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
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
