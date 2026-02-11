'use client'

import { PersonalInfo } from '@/types/resume'

interface Props {
  data: PersonalInfo | null | undefined
  onChange: (data: PersonalInfo) => void
}

const EMPTY: PersonalInfo = { name: '', birth_date: '', phone: '', email: '', address: '' }

export function PersonalSection({ data, onChange }: Props) {
  const form = data || EMPTY

  const set = (field: keyof PersonalInfo, value: string) => {
    onChange({ ...form, [field]: value })
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <label className="block text-xs text-gray-600 mb-1">이름 <span className="text-red-500">*</span></label>
        <input
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="홍길동"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">생년월일</label>
        <input
          type="date"
          value={form.birth_date || ''}
          onChange={e => set('birth_date', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">연락처</label>
        <input
          value={form.phone || ''}
          onChange={e => set('phone', e.target.value)}
          placeholder="010-0000-0000"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="col-span-2">
        <label className="block text-xs text-gray-600 mb-1">이메일</label>
        <input
          type="email"
          value={form.email || ''}
          onChange={e => set('email', e.target.value)}
          placeholder="example@email.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="col-span-2">
        <label className="block text-xs text-gray-600 mb-1">주소 (선택)</label>
        <input
          value={form.address || ''}
          onChange={e => set('address', e.target.value)}
          placeholder="서울특별시 강남구"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  )
}
