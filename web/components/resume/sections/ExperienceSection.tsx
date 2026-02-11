'use client'

import { useState } from 'react'
import { ExperienceItem } from '@/types/resume'
import { Plus, Pencil, Trash2, X, Lightbulb, Check } from 'lucide-react'

interface Props {
  items: ExperienceItem[]
  onChange: (items: ExperienceItem[]) => void
  onAddToMaterial?: (item: ExperienceItem) => void
  addedMaterialIds?: Set<string>
}

const EMPTY_FORM: Omit<ExperienceItem, 'id'> = {
  company: '', department: '', position: '', start_date: '', end_date: null, is_current: false, tasks: '', achievements: '',
}

export function ExperienceSection({ items, onChange, onAddToMaterial, addedMaterialIds }: Props) {
  const [form, setForm] = useState<Omit<ExperienceItem, 'id'>>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const openAdd = () => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true) }
  const openEdit = (item: ExperienceItem) => {
    setForm({ company: item.company, department: item.department || '', position: item.position, start_date: item.start_date, end_date: item.end_date, is_current: item.is_current, tasks: item.tasks, achievements: item.achievements || '' })
    setEditingId(item.id); setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditingId(null) }

  const handleSave = () => {
    if (!form.company.trim() || !form.position.trim() || !form.start_date || !form.tasks.trim()) return
    const payload = { ...form, department: form.department || undefined, achievements: form.achievements || undefined }
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
        <p className="text-sm text-gray-400 text-center py-4">경력사항을 추가해주세요. 신입이라면 비워두셔도 됩니다.</p>
      )}

      {items.map(item => (
        <div key={item.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg group">
          <div className="space-y-1 min-w-0 flex-1 pr-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900">{item.company}</span>
              {item.department && <span className="text-xs text-gray-500">{item.department}</span>}
              <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">{item.position}</span>
              {addedMaterialIds?.has(item.id) && (
                <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <Check className="w-3 h-3" />소재 추가됨
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {formatDate(item.start_date)} ~ {item.is_current ? '재직중' : formatDate(item.end_date)}
            </p>
            <p className="text-xs text-gray-600 whitespace-pre-wrap line-clamp-2">{item.tasks}</p>
            {item.achievements && <p className="text-xs text-blue-600 whitespace-pre-wrap line-clamp-1">✦ {item.achievements}</p>}
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
            <span className="text-xs font-semibold text-blue-700">{editingId ? '경력 수정' : '경력 추가'}</span>
            <button onClick={closeForm}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">회사명 <span className="text-red-500">*</span></label>
              <input value={form.company} onChange={e => setForm(p => ({...p, company: e.target.value}))} placeholder="예: (주)한국기업" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">부서 (선택)</label>
              <input value={form.department} onChange={e => setForm(p => ({...p, department: e.target.value}))} placeholder="예: 마케팅팀" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-600 mb-1">직책/직급 <span className="text-red-500">*</span></label>
              <input value={form.position} onChange={e => setForm(p => ({...p, position: e.target.value}))} placeholder="예: 대리, 인턴, 주임" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">입사년월 <span className="text-red-500">*</span></label>
              <input type="month" value={form.start_date} onChange={e => setForm(p => ({...p, start_date: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">퇴사년월</label>
              <input type="month" value={form.end_date || ''} onChange={e => setForm(p => ({...p, end_date: e.target.value || null}))} disabled={form.is_current} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="exp-current" checked={form.is_current} onChange={e => setForm(p => ({...p, is_current: e.target.checked, end_date: e.target.checked ? null : p.end_date}))} className="rounded" />
              <label htmlFor="exp-current" className="text-xs text-gray-600">현재 재직중</label>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-600 mb-1">담당 업무 <span className="text-red-500">*</span></label>
              <textarea value={form.tasks} onChange={e => setForm(p => ({...p, tasks: e.target.value}))} placeholder="담당한 주요 업무를 입력하세요." rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-600 mb-1">주요 성과 (선택)</label>
              <textarea value={form.achievements} onChange={e => setForm(p => ({...p, achievements: e.target.value}))} placeholder="수치 등 구체적인 성과를 기재하면 좋습니다. 예: 캠페인 전환율 20% 개선" rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={closeForm} className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-md transition">취소</button>
            <button onClick={handleSave} disabled={!form.company.trim() || !form.position.trim() || !form.start_date || !form.tasks.trim()} className="px-3 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-md transition disabled:opacity-50">저장</button>
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
