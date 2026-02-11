'use client'

import { useState } from 'react'
import { CertificationItem } from '@/types/resume'
import { Plus, Pencil, Trash2, X, Lightbulb, Check } from 'lucide-react'

interface Props {
  items: CertificationItem[]
  onChange: (items: CertificationItem[]) => void
  onAddToMaterial?: (item: CertificationItem) => void
  addedMaterialIds?: Set<string>
}

const EMPTY_FORM = { name: '', issuer: '', date: '' }

export function CertificationSection({ items, onChange, onAddToMaterial, addedMaterialIds }: Props) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const openAdd = () => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true) }
  const openEdit = (item: CertificationItem) => {
    setForm({ name: item.name, issuer: item.issuer, date: item.date })
    setEditingId(item.id); setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditingId(null) }

  const handleSave = () => {
    if (!form.name.trim() || !form.issuer.trim()) return
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
        <p className="text-sm text-gray-400 text-center py-4">보유한 자격증을 추가해주세요.</p>
      )}

      {items.map(item => (
        <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group">
          <div className="min-w-0 flex-1 pr-2">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-gray-900">{item.name}</p>
              {addedMaterialIds?.has(item.id) && (
                <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <Check className="w-3 h-3" />소재 추가됨
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">{item.issuer}{item.date ? ` · ${item.date.replace('-', '.')}` : ''}</p>
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
            <span className="text-xs font-semibold text-blue-700">{editingId ? '자격증 수정' : '자격증 추가'}</span>
            <button onClick={closeForm}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-gray-600 mb-1">자격증명 <span className="text-red-500">*</span></label>
              <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="예: 정보처리기사, 컴퓨터활용능력 1급" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">발급기관 <span className="text-red-500">*</span></label>
              <input value={form.issuer} onChange={e => setForm(p => ({...p, issuer: e.target.value}))} placeholder="예: 한국산업인력공단" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">취득년월</label>
              <input type="month" value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={closeForm} className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-md transition">취소</button>
            <button onClick={handleSave} disabled={!form.name.trim() || !form.issuer.trim()} className="px-3 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-md transition disabled:opacity-50">저장</button>
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
