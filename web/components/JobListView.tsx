'use client'

import { useState, useMemo } from 'react'
import { Job } from '@/types/job'
import { Search, ExternalLink, ChevronUp, ChevronDown } from 'lucide-react'

interface JobListViewProps {
  jobs: Job[]
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

export function JobListView({ jobs }: JobListViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('score')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'score' ? 'desc' : 'asc')
    }
  }

  const filteredAndSorted = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()

    let filtered = jobs
    if (query) {
      filtered = jobs.filter(job =>
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
  }, [jobs, searchQuery, sortKey, sortDir])

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ChevronUp className="w-3 h-3 text-gray-300" />
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-blue-600" />
      : <ChevronDown className="w-3 h-3 text-blue-600" />
  }

  const ThButton = ({ column, label, className = '' }: { column: SortKey; label: string; className?: string }) => (
    <th className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none ${className}`}
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {label}
        <SortIcon column={column} />
      </div>
    </th>
  )

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4">
      {/* 검색바 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="회사명, 공고명, 직무, 키워드로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {searchQuery && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
            {filteredAndSorted.length}건
          </span>
        )}
      </div>

      {/* 테이블 */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <ThButton column="company" label="회사명" className="min-w-[120px]" />
                <ThButton column="title" label="공고명" className="min-w-[200px]" />
                <ThButton column="career" label="경력" className="min-w-[100px]" />
                <ThButton column="company_type" label="회사유형" className="min-w-[90px]" />
                <ThButton column="employee_types" label="채용유형" className="min-w-[90px]" />
                <ThButton column="score" label="적합도" className="min-w-[70px]" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[50px]">
                  링크
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAndSorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    {searchQuery ? `"${searchQuery}"에 대한 검색 결과가 없습니다.` : '표시할 공고가 없습니다.'}
                  </td>
                </tr>
              ) : (
                filteredAndSorted.map((job) => (
                  <tr key={job.id} className="hover:bg-blue-50/50 transition-colors">
                    {/* 회사명 */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {job.company_image && (
                          <img
                            src={job.company_image}
                            alt=""
                            className="w-6 h-6 rounded object-contain flex-shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                        )}
                        <span className="text-sm font-medium text-gray-900 truncate max-w-[160px]">
                          {job.company}
                        </span>
                      </div>
                    </td>
                    {/* 공고명 */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-800 line-clamp-1">
                        {job.is_new && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 mr-1.5">
                            NEW
                          </span>
                        )}
                        {job.title}
                      </span>
                    </td>
                    {/* 경력 */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{formatCareer(job)}</span>
                    </td>
                    {/* 회사유형 */}
                    <td className="px-4 py-3">
                      {job.company_type && job.company_type !== '기타' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
                          {job.company_type}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    {/* 채용유형 */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {job.employee_types && job.employee_types.length > 0 ? (
                          job.employee_types.map((type, i) => (
                            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              {type}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    {/* 적합도 */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                        job.score >= 70 ? 'bg-green-100 text-green-700' :
                        job.score >= 50 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {job.score}%
                      </span>
                    </td>
                    {/* 링크 */}
                    <td className="px-4 py-3">
                      <a
                        href={job.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 하단 정보 */}
        {filteredAndSorted.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
            총 {filteredAndSorted.length}건
            {searchQuery && ` (전체 ${jobs.length}건 중)`}
          </div>
        )}
      </div>
    </div>
  )
}
