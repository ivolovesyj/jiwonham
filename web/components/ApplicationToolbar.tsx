'use client'

import { Search, SortAsc, Plus } from 'lucide-react'
import { Button } from './ui/button'

export type SortKey = 'created_at' | 'deadline' | 'status'

interface ApplicationToolbarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  sortKey: SortKey
  onSortChange: (key: SortKey) => void
  onAddExternal?: () => void
}

const sortOptions: { key: SortKey; label: string }[] = [
  { key: 'created_at', label: '추가일순' },
  { key: 'deadline', label: '마감일순' },
  { key: 'status', label: '상태순' },
]

export function ApplicationToolbar({
  searchQuery,
  onSearchChange,
  sortKey,
  onSortChange,
  onAddExternal,
}: ApplicationToolbarProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-2 sm:p-3 mb-3 sm:mb-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        {/* 검색 */}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 sm:w-4 h-3.5 sm:h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="회사명, 공고명 검색..."
            className="w-full pl-8 sm:pl-9 pr-2 sm:pr-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 정렬 + 추가 */}
        <div className="flex items-center gap-2">
          {/* 정렬 */}
          <div className="relative flex-1 sm:flex-none">
            <select
              value={sortKey}
              onChange={(e) => onSortChange(e.target.value as SortKey)}
              className="appearance-none w-full sm:w-auto pl-7 sm:pl-8 pr-7 sm:pr-8 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {sortOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
            <SortAsc className="absolute left-2 sm:left-2.5 top-1/2 -translate-y-1/2 w-3.5 sm:w-4 h-3.5 sm:h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* 외부 공고 추가 */}
          {onAddExternal && (
            <Button
              size="sm"
              onClick={onAddExternal}
              className="text-xs whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white h-8 sm:h-9 px-2 sm:px-3"
            >
              <Plus className="w-3.5 h-3.5 sm:mr-1" />
              <span className="hidden sm:inline">외부 공고 추가하기</span>
              <span className="sm:hidden">추가</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
