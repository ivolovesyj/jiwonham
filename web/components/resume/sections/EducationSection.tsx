'use client'

import { useState } from 'react'
import { EducationItem, DegreeType, DEGREE_OPTIONS } from '@/types/resume'
import { Plus, Pencil, Trash2, X } from 'lucide-react'

interface Props {
  items: EducationItem[]
  onChange: (items: EducationItem[]) => void
}

const EMPTY_FORM: Omit<EducationItem, 'id'> = {
  school: '', major: '', degree: '학사', start_date: '', end_date: null, is_current: false, gpa: '', note: '',
}

export function EducationSection({ items, onChange }: Props) {
  const [form, setForm] = useState<Omit<EducationItem, 'id'>>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const openAdd = () => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true) }
  const openEdit = (item: EducationItem) => {
    setForm({ school: item.school, major: item.major, degree: item.degree, start_date: item.start_date, end_date: item.end_date, is_current: item.is_current, gpa: item.gpa || '', note: item.note || '' })
    setEditingId(item.id); setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditingId(null) }

  const handleSave = () => {
    if (!form.school.trim() || !form.major.trim() || !form.start_date) return
    if (editingId) {
      onChange(items.map(i => i.id === editingId ? { ...form, id: editingId, gpa: form.gpa || undefined, note: form.note || undefined } : i))
    } else {
      onChange([...items, { ...form, id: crypto.randomUUID(), gpa: form.gpa || undefined, note: form.note || undefined }])
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
        <p className="text-sm text-gray-400 text-center py-4">학력을 추가해주세요.</p>
      )}

      {items.map(item => (
        <div key={item.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg group">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900">{item.school}</span>
              <span className="text-xs text-gray-500">{item.degree}</span>
            </div>
            <p className="text-sm text-gray-700">{item.major}{item.gpa ? ` · 학점 ${item.gpa}` : ''}</p>
            <p className="text-xs text-gray-500">
              {formatDate(item.start_date)} ~ {item.is_current ? '재학중' : formatDate(item.end_date)}
            </p>
            {item.note && <p className="text-xs text-gray-400">{item.note}</p>}
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
            <span className="text-xs font-semibold text-blue-700">{editingId ? '학력 수정' : '학력 추가'}</span>
            <button onClick={closeForm}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-gray-600 mb-1">학교명 <span className="text-red-500">*</span></label>
              <input value={form.school} onChange={e => setForm(p => ({...p, school: e.target.value}))} placeholder="예: 한국대학교" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">전공 <span className="text-red-500">*</span></label>
              <input value={form.major} onChange={e => setForm(p => ({...p, major: e.target.value}))} placeholder="예: 경영학과" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">학위</label>
              <select value={form.degree} onChange={e => setForm(p => ({...p, degree: e.target.value as DegreeType}))} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {DEGREE_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">입학년월 <span className="text-red-500">*</span></label>
              <input type="month" value={form.start_date} onChange={e => setForm(p => ({...p, start_date: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">졸업년월</label>
              <input type="month" value={form.end_date || ''} onChange={e => setForm(p => ({...p, end_date: e.target.value || null}))} disabled={form.is_current} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="edu-current" checked={form.is_current} onChange={e => setForm(p => ({...p, is_current: e.target.checked, end_date: e.target.checked ? null : p.end_date}))} className="rounded" />
              <label htmlFor="edu-current" className="text-xs text-gray-600">재학중</label>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">학점 (선택)</label>
              <input value={form.gpa} onChange={e => setForm(p => ({...p, gpa: e.target.value}))} placeholder="예: 3.8 / 4.5" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">비고 (선택)</label>
              <input value={form.note} onChange={e => setForm(p => ({...p, note: e.target.value}))} placeholder="예: 조기졸업, 편입 등" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={closeForm} className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-md transition">취소</button>
            <button onClick={handleSave} disabled={!form.school.trim() || !form.major.trim() || !form.start_date} className="px-3 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-md transition disabled:opacity-50">저장</button>
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
