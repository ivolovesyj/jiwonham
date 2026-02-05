'use client'

import { useState } from 'react'
import { ApplicationWithJob, ApplicationStatus, RequiredDocuments } from '@/types/application'
import { StatusBadge } from './StatusBadge'
import { DeadlineBadge } from './DeadlineBadge'
import { Button } from '@/components/ui/button'
import { Star, ChevronDown, ChevronUp, ExternalLink, Trash2, MessageSquare } from 'lucide-react'

interface CompactApplicationRowProps {
  application: ApplicationWithJob
  onStatusChange: (id: string, newStatus: ApplicationStatus) => void
  onUpdateNotes: (id: string, notes: string) => void
  onUpdateDocuments: (id: string, documents: RequiredDocuments) => void
  onUpdateDeadline: (savedJobId: string, deadline: string) => void
  onDelete: (applicationId: string, savedJobId: string) => void
  isPinned?: boolean
  onTogglePin?: (savedJobId: string) => void
}

export function CompactApplicationRow({
  application,
  onStatusChange,
  onUpdateNotes,
  onUpdateDocuments,
  onUpdateDeadline,
  onDelete,
  isPinned,
  onTogglePin,
}: CompactApplicationRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState(application.notes || '')
  const { saved_job } = application

  // 외부 공고와 일반 공고 모두 지원
  const company = saved_job.external_company || saved_job.company || '회사명 없음'
  const title = saved_job.external_title || saved_job.title || '직무명 없음'
  const rawLocation = saved_job.external_location || saved_job.location
  const deadline = saved_job.external_deadline || saved_job.deadline
  const jobUrl = saved_job.external_url || saved_job.link

  // 지역 간소화: "서울 강남구" → "서울", "경기 성남시 분당" → "경기"
  const location = rawLocation
    ? rawLocation.split(' ')[0]
    : null

  const handleSaveNotes = () => {
    onUpdateNotes(application.id, notes)
    setEditingNotes(false)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-sm transition-shadow">
      {/* 컴팩트 행 */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-gray-50/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* 별표 고정 */}
        {onTogglePin && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onTogglePin(saved_job.id)
            }}
            className={`flex-shrink-0 p-1 rounded-md transition-all ${
              isPinned
                ? 'text-yellow-500 hover:bg-yellow-50'
                : 'text-gray-300 hover:text-yellow-400 hover:bg-gray-100'
            }`}
            title={isPinned ? '고정 해제' : '상위 고정'}
          >
            <Star className="w-4 h-4" style={isPinned ? { fill: 'currentColor' } : {}} />
          </button>
        )}

        {/* 회사명 */}
        <span className="flex-shrink-0 w-20 sm:w-28 text-sm font-bold text-gray-900 truncate">
          {company}
        </span>

        {/* 공고명 */}
        <span className="flex-1 text-sm text-gray-700 truncate min-w-0 font-medium">
          {title}
        </span>

        {/* 메모 아이콘 */}
        {application.notes && (
          <div className="flex-shrink-0" title="메모 있음">
            <MessageSquare className="w-4 h-4 text-blue-500" />
          </div>
        )}

        {/* 위치 */}
        {location && (
          <span className="hidden lg:block flex-shrink-0 text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded-md">
            {location}
          </span>
        )}

        {/* 상태 */}
        <div className="flex-shrink-0 w-[78px] flex justify-end">
          <StatusBadge
            status={application.status}
            editable
            onStatusChange={(newStatus) => onStatusChange(application.id, newStatus)}
          />
        </div>

        {/* 마감일 */}
        <div className="hidden sm:flex flex-shrink-0 w-[92px] justify-end">
          <DeadlineBadge
            deadline={deadline}
            editable
            onDeadlineChange={(newDeadline) => onUpdateDeadline(saved_job.id, newDeadline)}
          />
        </div>

        {/* 확장 아이콘 */}
        <div className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* 확장 시 상세 정보 */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gradient-to-b from-gray-50 to-white space-y-3">
          {/* 상세 정보 행 */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4 text-gray-600">
              {rawLocation && (
                <span className="flex items-center gap-1">
                  <span className="text-gray-400">📍</span>
                  {rawLocation}
                </span>
              )}
              {jobUrl && (
                <a
                  href={jobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  원문 보기
                </a>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(application.id, saved_job.id)
              }}
              className="inline-flex items-center gap-1 px-2 py-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
              title="삭제"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="text-xs">삭제</span>
            </button>
          </div>

          {/* 메모 */}
          <div onClick={(e) => e.stopPropagation()}>
            {editingNotes ? (
              <div className="space-y-2">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="메모를 입력하세요..."
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 min-h-[80px] resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 px-3 text-xs" onClick={handleSaveNotes}>
                    저장
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 px-3 text-xs" onClick={() => setEditingNotes(false)}>
                    취소
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setEditingNotes(true)}
                className="w-full text-left text-sm text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 transition-all flex items-start gap-2"
              >
                <MessageSquare className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                {application.notes ? (
                  <span className="flex-1">{application.notes}</span>
                ) : (
                  <span className="text-gray-400">메모 추가하기...</span>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
