'use client'

import { useState } from 'react'
import { ApplicationWithJob, ApplicationStatus, RequiredDocuments, DocumentStatus } from '@/types/application'
import { StatusBadge } from './StatusBadge'
import { DeadlineBadge } from './DeadlineBadge'
import { Button } from './ui/button'
import { ExternalLink, ChevronDown, ChevronUp, Calendar, FileText, CheckCircle2, Pin } from 'lucide-react'

interface ApplicationCardProps {
  application: ApplicationWithJob
  onStatusChange: (id: string, newStatus: ApplicationStatus) => void
  onUpdateNotes: (id: string, notes: string) => void
  onUpdateDocuments: (id: string, documents: RequiredDocuments) => void
  onUpdateDeadline: (savedJobId: string, deadline: string) => void
  onDelete: (applicationId: string, savedJobId: string) => void
  isPinned?: boolean
  onTogglePin?: (savedJobId: string) => void
}

export function ApplicationCard({
  application,
  onStatusChange,
  onUpdateNotes,
  onUpdateDocuments,
  onUpdateDeadline,
  onDelete,
  isPinned,
  onTogglePin,
}: ApplicationCardProps) {
  const [expanded, setExpanded] = useState(true)
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [notes, setNotes] = useState(application.notes || '')
  const [requiredDocs, setRequiredDocs] = useState<RequiredDocuments>(
    application.required_documents || {}
  )

  const { saved_job } = application

  const handleSaveNotes = () => {
    onUpdateNotes(application.id, notes)
    setIsEditingNotes(false)
  }

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('ko-KR')
  }

  return (
    <div className={`bg-white rounded-lg border p-4 hover:shadow-md transition-shadow ${
      isPinned ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200'
    } ${application.status === 'passed' ? 'opacity-60' : ''}`}>
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {/* 핀 버튼 */}
            {onTogglePin && (
              <button
                onClick={() => onTogglePin(saved_job.id)}
                className={`flex-shrink-0 p-1 rounded hover:bg-gray-100 ${isPinned ? 'text-blue-600' : 'text-gray-300 hover:text-gray-500'}`}
                title={isPinned ? '고정 해제' : '상위 고정'}
              >
                <Pin className="w-4 h-4" style={isPinned ? { fill: 'currentColor' } : {}} />
              </button>
            )}
            <h3 className="font-semibold text-lg text-gray-900 truncate">
              {saved_job.company}
            </h3>
          </div>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {saved_job.title}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs text-gray-500">{saved_job.location}</span>
            <DeadlineBadge deadline={saved_job.deadline} />
            {!saved_job.deadline && (
              <label className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-500 border border-dashed border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors">
                <Calendar className="w-3 h-3" />
                <span>마감일 설정</span>
                <input
                  type="date"
                  className="sr-only"
                  onChange={(e) => {
                    if (e.target.value) {
                      onUpdateDeadline(saved_job.id, e.target.value)
                    }
                  }}
                />
              </label>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge
            status={application.status}
            editable
            onStatusChange={(newStatus) => onStatusChange(application.id, newStatus)}
          />
          {saved_job.score && saved_job.score > 50 && (
            <div className="text-xs font-medium text-blue-600">
              적합도 {saved_job.score}%
            </div>
          )}
        </div>
      </div>

      {/* 추천 이유 */}
      {saved_job.reason && (
        <div className="mt-3 text-sm text-gray-700 bg-blue-50 rounded-lg p-3">
          💡 {saved_job.reason}
        </div>
      )}

      {/* 필요 서류 (지원 예정 상태일 때만) */}
      {application.status === 'pending' && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-gray-700" />
            <h4 className="text-sm font-semibold text-gray-900">필요 서류</h4>
          </div>
          <div className="space-y-3">
            {(['resume', 'cover_letter', 'portfolio'] as const).map((docType) => {
              const labels = { resume: '이력서', cover_letter: '자기소개서', portfolio: '포트폴리오' }
              return (
                <div key={docType}>
                  <label className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={!!requiredDocs[docType]}
                      onChange={(e) => {
                        const newDocs = { ...requiredDocs }
                        if (e.target.checked) {
                          newDocs[docType] = 'existing'
                        } else {
                          delete newDocs[docType]
                        }
                        setRequiredDocs(newDocs)
                        onUpdateDocuments(application.id, newDocs)
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium text-gray-700">{labels[docType]}</span>
                  </label>
                  {requiredDocs[docType] && (
                    <div className="ml-6 flex gap-2">
                      {(['existing', 'needs_update', 'needs_new', 'ready'] as DocumentStatus[]).map((status) => (
                        <button
                          key={status}
                          onClick={() => {
                            const newDocs = { ...requiredDocs, [docType]: status }
                            setRequiredDocs(newDocs)
                            onUpdateDocuments(application.id, newDocs)
                          }}
                          className={`px-2 py-1 text-xs rounded ${
                            requiredDocs[docType] === status
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-600 border border-gray-300'
                          }`}
                        >
                          {status === 'existing' && '기존서류'}
                          {status === 'needs_update' && '수정필요'}
                          {status === 'needs_new' && '신규작성'}
                          {status === 'ready' && '준비완료'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 상태 변경 버튼들 */}
      <div className="mt-4 flex flex-wrap gap-2">
        {application.status === 'passed' && (
          <Button
            size="sm"
            onClick={() => onStatusChange(application.id, 'pending')}
            className="text-xs"
          >
            지원 예정으로 변경
          </Button>
        )}
        {(application.status === 'pending' || application.status === 'hold') && (
          <>
            <Button
              size="sm"
              onClick={() => onStatusChange(application.id, 'applied')}
              className="text-xs"
            >
              지원 완료로 변경
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onStatusChange(application.id, 'not_applying')}
              className="text-xs text-gray-600 hover:text-gray-700"
            >
              미지원
            </Button>
          </>
        )}
        {application.status === 'applied' && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onStatusChange(application.id, 'document_pass')}
              className="text-xs"
            >
              서류 합격
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onStatusChange(application.id, 'rejected')}
              className="text-xs text-red-600 hover:text-red-700"
            >
              불합격
            </Button>
          </>
        )}
        {application.status === 'document_pass' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onStatusChange(application.id, 'interviewing')}
            className="text-xs"
          >
            면접 진행 중
          </Button>
        )}
        {application.status === 'interviewing' && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onStatusChange(application.id, 'final')}
              className="text-xs"
            >
              최종 면접
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onStatusChange(application.id, 'rejected')}
              className="text-xs text-red-600 hover:text-red-700"
            >
              불합격
            </Button>
          </>
        )}
        {application.status === 'final' && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onStatusChange(application.id, 'accepted')}
              className="text-xs text-green-600 hover:text-green-700"
            >
              합격
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onStatusChange(application.id, 'rejected')}
              className="text-xs text-red-600 hover:text-red-700"
            >
              불합격
            </Button>
          </>
        )}
        {application.status === 'accepted' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onStatusChange(application.id, 'declined')}
            className="text-xs"
          >
            제안 거절
          </Button>
        )}
      </div>

      {/* 상세 정보 토글 */}
      <div className="mt-4 border-t pt-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          <span>상세 정보</span>
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {expanded && (
          <div className="mt-4 space-y-4">
            {application.applied_date && (
              <div className="text-sm">
                <span className="font-medium text-gray-700">지원일:</span>{' '}
                <span className="text-gray-600">
                  {formatDate(application.applied_date)}
                </span>
              </div>
            )}

            {/* 메모 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  메모
                </label>
                {!isEditingNotes && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditingNotes(true)}
                    className="text-xs"
                  >
                    편집
                  </Button>
                )}
              </div>
              {isEditingNotes ? (
                <div className="space-y-2">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full min-h-[100px] p-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="면접 준비 사항, 질문 내용 등을 메모하세요..."
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveNotes}>
                      저장
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setNotes(application.notes || '')
                        setIsEditingNotes(false)
                      }}
                    >
                      취소
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {application.notes || '메모가 없습니다.'}
                </p>
              )}
            </div>

            {/* 공고 링크 - 원문 URL 우선 */}
            <a
              href={saved_job.external_url || saved_job.redirect_url || saved_job.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              공고 페이지 보기
              {saved_job.affiliate && (
                <span className="text-[10px] text-gray-400 font-normal">({saved_job.affiliate})</span>
              )}
            </a>

            {/* 주의사항 */}
            {saved_job.warnings && saved_job.warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs font-medium text-yellow-800 mb-1">
                  ⚠️ 주의사항
                </p>
                <ul className="text-xs text-yellow-700 space-y-1">
                  {saved_job.warnings.map((warning, idx) => (
                    <li key={idx}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}
