'use client'

import { useState, useMemo } from 'react'
import { Job } from '@/types/job'
import { Search, ExternalLink, ChevronUp, ChevronDown, X, Clock, Check, HelpCircle } from 'lucide-react'

interface JobListViewProps {
  jobs: Job[]
  onAction?: (job: Job, action: 'pass' | 'hold' | 'apply') => void
  isLoggedIn?: boolean
}

function formatCareer(job: Job): string {
  if (job.career_min === 0 && (job.career_max === null || job.career_max === undefined)) return '신입/경력무관'
  if (job.career_min === 0 && job.career_max) return `신입~${job.career_max}년`
  if (job.career_min && job.career_max) return `${job.career_min}~${job.career_max}년`
  if (job.career_min) return `${job.career_min}년 이상`
  return '신입'
}

type SortKey = 'company' | 'title' | 'career' | 'company_type' | 'employee_types' | 'score'
type SortDir = 'asc' | 'desc'

export function JobListView({ jobs, onAction, isLoggedIn }: JobListViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('score')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [actedJobIds, setActedJobIds] = useState<Set<string>>(new Set())

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'score' ? 'desc' : 'asc')
    }
  }

  const handleAction = (job: Job, action: 'pass' | 'hold' | 'apply') => {
    setActedJobIds(prev => new Set(prev).add(job.id))
    onAction?.(job, action)
  }

  const filteredAndSorted = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()

    let filtered = jobs.filter(job => !actedJobIds.has(job.id))
    if (query) {
      filtered = filtered.filter(job =>
        job.company.toLowerCase().includes(query) ||
        job.title.toLowerCase().includes(query) ||
        (job.company_type && job.company_type.toLowerCase().includes(query)) ||
        (job.employee_types && job.employee_types.some(t => t.toLowerCase().includes(query))) ||
        (job.depth_twos && job.depth_twos.some(d => d.toLowerCase().includes(query))) ||
        (job.keywords && job.keywords.some(k => k.toLowerCase().includes(query)))
      )
    }

    return [...filtered].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'company':
          cmp = a.company.localeCompare(b.company, 'ko')
          break
        case 'title':
          cmp = a.title.localeCompare(b.title, 'ko')
          break
        case 'career':
          cmp = (a.career_min ?? 0) - (b.career_min ?? 0)
          break
        case 'company_type':
          cmp = (a.company_type || '').localeCompare(b.company_type || '', 'ko')
          break
        case 'employee_types':
          cmp = (a.employee_types?.[0] || '').localeCompare(b.employee_types?.[0] || '', 'ko')
          break
        case 'score':
          cmp = (a.score || 0) - (b.score || 0)
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [jobs, searchQuery, sortKey, sortDir, actedJobIds])

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ChevronUp className="w-3 h-3 text-gray-300" />
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-blue-600" />
      : <ChevronDown className="w-3 h-3 text-blue-600" />
  }

  const ThButton = ({ column, label, className = '' }: { column: SortKey; label: string; className?: string }) => (
    <th className={`px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap ${className}`}
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-0.5">
        {label}
        <SortIcon column={column} />
      </div>
    </th>
  )

  return (
    <div className="w-full max-w-7xl mx-auto space-y-3">
      {/* 검색바 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="회사명, 공고명, 직무, 키워드로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-16 py-2.5 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            {filteredAndSorted.length}건
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* 테이블 */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/80 border-b border-gray-200">
              <tr>
                <ThButton column="company" label="회사명" />
                <ThButton column="title" label="공고명" />
                <ThButton column="career" label="경력" />
                <ThButton column="company_type" label="회사유형" />
                <ThButton column="employee_types" label="채용유형" />
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                  onClick={() => handleSort('score')}
                >
                  <div className="flex items-center gap-0.5">
                    선호점수
                    <SortIcon column="score" />
                    <span className="relative group/tip ml-0.5">
                      <HelpCircle className="w-3 h-3 text-gray-300 hover:text-gray-500 cursor-help" />
                      <span className="absolute top-full left-0 mt-2 w-56 px-3 py-2.5 bg-gray-800 text-white text-[11px] leading-relaxed rounded-lg shadow-lg opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-50">
                        공고에 대한 지원안함/보류/지원예정 선택이 누적되면서 나의 선호도를 학습합니다. 많이 사용할수록 점수가 정확해집니다.
                      </span>
                    </span>
                  </div>
                </th>
                {onAction && (
                  <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    지원 여부
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredAndSorted.length === 0 ? (
                <tr>
                  <td colSpan={onAction ? 7 : 6} className="px-4 py-16 text-center">
                    <div className="text-gray-400 text-sm">
                      {searchQuery ? (
                        <>
                          <span className="text-2xl block mb-2">🔍</span>
                          &ldquo;{searchQuery}&rdquo;에 대한 검색 결과가 없습니다.
                        </>
                      ) : (
                        <>
                          <span className="text-2xl block mb-2">📋</span>
                          표시할 공고가 없습니다.
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSorted.map((job) => (
                  <tr key={job.id} className="group hover:bg-blue-50/40 transition-colors">
                    {/* 회사명 (클릭 시 원문 링크) */}
                    <td className="px-3 py-2.5">
                      <a
                        href={job.redirect_url || job.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 min-w-[100px] group/link"
                      >
                        {job.company_image ? (
                          <img
                            src={job.company_image}
                            alt=""
                            className="w-5 h-5 rounded object-contain flex-shrink-0 bg-gray-50"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                        ) : (
                          <div className="w-5 h-5 rounded bg-gray-100 flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium text-gray-900 truncate max-w-[140px] group-hover/link:text-blue-600 transition-colors" title={job.company}>
                          {job.company}
                        </span>
                        <ExternalLink className="w-3 h-3 text-gray-300 group-hover/link:text-blue-500 flex-shrink-0 transition-colors" />
                      </a>
                    </td>
                    {/* 공고명 (클릭 시 원문 링크) */}
                    <td className="px-3 py-2.5 max-w-[320px]">
                      <a
                        href={job.redirect_url || job.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 group/link"
                      >
                        {job.is_new && (
                          <span className="flex-shrink-0 px-1 py-px rounded text-[9px] font-bold bg-green-500 text-white leading-tight">
                            N
                          </span>
                        )}
                        <span className="text-sm text-gray-800 truncate group-hover/link:text-blue-600 transition-colors" title={job.title}>
                          {job.title}
                        </span>
                      </a>
                    </td>
                    {/* 경력 */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="text-xs text-gray-600">{formatCareer(job)}</span>
                    </td>
                    {/* 회사유형 */}
                    <td className="px-3 py-2.5">
                      {job.company_type && job.company_type !== '기타' ? (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-medium bg-teal-50 text-teal-700 border border-teal-100">
                          {job.company_type}
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-300">-</span>
                      )}
                    </td>
                    {/* 채용유형 */}
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-0.5">
                        {job.employee_types && job.employee_types.length > 0 ? (
                          job.employee_types.slice(0, 2).map((type, i) => (
                            <span key={i} className="inline-block px-1.5 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-600 border border-blue-100">
                              {type}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-gray-300">-</span>
                        )}
                      </div>
                    </td>
                    {/* 선호점수 */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              job.score >= 70 ? 'bg-green-500' :
                              job.score >= 50 ? 'bg-yellow-400' :
                              'bg-gray-300'
                            }`}
                            style={{ width: `${Math.min(100, job.score)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-semibold tabular-nums ${
                          job.score >= 70 ? 'text-green-600' :
                          job.score >= 50 ? 'text-yellow-600' :
                          'text-gray-500'
                        }`}>
                          {Math.round(job.score)}점
                        </span>
                      </div>
                    </td>
                    {/* 지원 여부 버튼 */}
                    {onAction && (
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleAction(job, 'pass')}
                            className="w-7 h-7 rounded-md flex items-center justify-center text-red-400 bg-red-50 hover:text-red-600 hover:bg-red-100 transition-colors"
                            title="지원 안 함"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleAction(job, 'hold')}
                            className="w-7 h-7 rounded-md flex items-center justify-center text-amber-500 bg-amber-50 hover:text-amber-600 hover:bg-amber-100 transition-colors"
                            title="보류"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleAction(job, 'apply')}
                            className="w-7 h-7 rounded-md flex items-center justify-center text-green-500 bg-green-50 hover:text-green-700 hover:bg-green-100 transition-colors"
                            title="지원 예정"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 하단 정보 */}
        <div className="px-3 py-2 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">
            {filteredAndSorted.length}건 표시
            {searchQuery && ` (전체 ${jobs.filter(j => !actedJobIds.has(j.id)).length}건)`}
          </span>
          {actedJobIds.size > 0 && (
            <span className="text-[11px] text-blue-500 font-medium">
              {actedJobIds.size}건 처리 완료
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
