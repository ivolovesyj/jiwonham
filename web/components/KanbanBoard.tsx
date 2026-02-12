'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDraggable,
  useDroppable,
  rectIntersection,
} from '@dnd-kit/core'
import { ApplicationWithJob, ApplicationStatus } from '@/types/application'
import { statusConfig } from './StatusBadge'
import { StatusBadge } from './StatusBadge'
import { CompanyLogo } from './CompanyLogo'
import { DeadlineBadge } from './DeadlineBadge'
import { ExternalLink, Trash2, X } from 'lucide-react'

interface KanbanBoardProps {
  applications: ApplicationWithJob[]
  onStatusChange: (applicationId: string, newStatus: ApplicationStatus) => void
  onDelete: (applicationId: string, savedJobId: string) => void
}

const KANBAN_COLUMNS: ApplicationStatus[] = [
  'pending',
  'applied',
  'document_pass',
  'interviewing',
  'final',
  'accepted',
  'rejected',
]

const COLUMN_DOT_COLORS: Record<string, string> = {
  pending: 'bg-gray-400',
  hold: 'bg-yellow-400',
  not_applying: 'bg-gray-500',
  passed: 'bg-gray-300',
  applied: 'bg-blue-400',
  document_pass: 'bg-green-400',
  interviewing: 'bg-purple-400',
  final: 'bg-indigo-400',
  rejected: 'bg-red-400',
  accepted: 'bg-emerald-500',
  declined: 'bg-orange-400',
}

function KanbanCard({ application, isDragging }: { application: ApplicationWithJob; isDragging?: boolean }) {
  const company = application.saved_job.external_company || application.saved_job.company || '회사명 없음'
  const title = application.saved_job.external_title || application.saved_job.title || '직무명 없음'
  const deadline = application.saved_job.external_deadline || application.saved_job.deadline

  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow ${
        isDragging ? 'shadow-lg opacity-90 ring-2 ring-blue-400' : ''
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <CompanyLogo
          companyName={company}
          imageUrl={application.saved_job.company_image}
          size={20}
        />
        <span className="text-xs font-bold text-gray-900 truncate">{company}</span>
      </div>
      <div className="text-xs text-gray-600 truncate mb-2">{title}</div>
      {deadline && (
        <div className="flex justify-end">
          <DeadlineBadge deadline={deadline} />
        </div>
      )}
    </div>
  )
}

// 카드 상세 팝오버
function CardDetailPopover({
  application,
  anchorRect,
  onStatusChange,
  onDelete,
  onClose,
}: {
  application: ApplicationWithJob
  anchorRect: DOMRect
  onStatusChange: (id: string, status: ApplicationStatus) => void
  onDelete: (applicationId: string, savedJobId: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const company = application.saved_job.external_company || application.saved_job.company || '회사명 없음'
  const title = application.saved_job.external_title || application.saved_job.title || '직무명 없음'
  const location = application.saved_job.external_location || application.saved_job.location
  const deadline = application.saved_job.external_deadline || application.saved_job.deadline
  const jobUrl = application.saved_job.external_url || application.saved_job.redirect_url || application.saved_job.link

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [onClose])

  // 위치 계산: 카드 오른쪽에, 화면 밖이면 왼쪽에
  const popoverWidth = 280
  let left = anchorRect.right + 8
  if (left + popoverWidth > window.innerWidth - 16) {
    left = anchorRect.left - popoverWidth - 8
  }
  let top = anchorRect.top
  if (top + 300 > window.innerHeight - 16) {
    top = window.innerHeight - 316
  }

  return createPortal(
    <div
      ref={ref}
      className="fixed bg-white border border-gray-200 rounded-xl shadow-xl p-4 space-y-3"
      style={{ top, left, width: popoverWidth, zIndex: 9999 }}
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <CompanyLogo companyName={company} imageUrl={application.saved_job.company_image} size={28} />
          <div className="min-w-0">
            <div className="text-sm font-bold text-gray-900 truncate">{company}</div>
            <div className="text-xs text-gray-600 truncate">{title}</div>
          </div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-md flex-shrink-0">
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* 정보 */}
      <div className="space-y-2 text-xs text-gray-600">
        {location && <div>📍 {location}</div>}
        {deadline && (
          <div className="flex items-center gap-2">
            <span>마감:</span>
            <DeadlineBadge deadline={deadline} />
          </div>
        )}
        {application.notes && (
          <div className="bg-gray-50 rounded-lg p-2 text-gray-700">{application.notes}</div>
        )}
      </div>

      {/* 상태 변경 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">상태:</span>
        <StatusBadge
          status={application.status}
          editable
          onStatusChange={(newStatus) => {
            onStatusChange(application.id, newStatus)
            onClose()
          }}
        />
      </div>

      {/* 액션 버튼 */}
      <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
        {jobUrl && (
          <a
            href={jobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            원문 보기
          </a>
        )}
        <button
          onClick={() => {
            onDelete(application.id, application.saved_job.id)
            onClose()
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-auto"
        >
          <Trash2 className="w-3.5 h-3.5" />
          삭제
        </button>
      </div>
    </div>,
    document.body
  )
}

function DraggableKanbanCard({
  application,
  onCardClick,
}: {
  application: ApplicationWithJob
  onCardClick: (app: ApplicationWithJob, rect: DOMRect) => void
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: application.id })

  const wasDragging = useRef(false)

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, opacity: isDragging ? 0.4 : 1 }
    : undefined

  // 드래그 시작 시 기록
  useEffect(() => {
    if (isDragging) wasDragging.current = true
  }, [isDragging])

  const handleClick = () => {
    // 드래그 후 놓았을 때 클릭 방지
    if (wasDragging.current) {
      wasDragging.current = false
      return
    }
    if (cardRef.current) {
      onCardClick(application, cardRef.current.getBoundingClientRect())
    }
  }

  return (
    <motion.div
      ref={(node) => {
        setNodeRef(node)
        ;(cardRef as any).current = node
      }}
      style={style}
      {...attributes}
      {...listeners}
      layout
      transition={{ duration: 0.15 }}
      onClick={handleClick}
      className="cursor-grab active:cursor-grabbing"
    >
      <KanbanCard application={application} />
    </motion.div>
  )
}

function DroppableColumn({
  status,
  applications,
  isOver,
  onCardClick,
}: {
  status: ApplicationStatus
  applications: ApplicationWithJob[]
  isOver?: boolean
  onCardClick: (app: ApplicationWithJob, rect: DOMRect) => void
}) {
  const config = statusConfig[status]
  const { setNodeRef } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-[250px] bg-gray-50 rounded-xl border border-gray-200 flex flex-col min-h-[400px] transition-colors ${
        isOver ? 'bg-blue-50 border-blue-300' : ''
      }`}
    >
      <div className="p-3 border-b border-gray-200 flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${COLUMN_DOT_COLORS[status] || 'bg-gray-400'}`} />
        <span className="text-sm font-semibold text-gray-700">{config.label}</span>
        <span className="ml-auto text-xs text-gray-400 font-medium">{applications.length}</span>
      </div>

      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        {applications.map((app) => (
          <DraggableKanbanCard key={app.id} application={app} onCardClick={onCardClick} />
        ))}
        {applications.length === 0 && (
          <div className="text-xs text-gray-400 text-center py-8">
            여기로 드래그
          </div>
        )}
      </div>
    </div>
  )
}

export function KanbanBoard({ applications, onStatusChange, onDelete }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overColumnId, setOverColumnId] = useState<string | null>(null)
  const [selectedApp, setSelectedApp] = useState<{ app: ApplicationWithJob; rect: DOMRect } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const columns = useMemo(() => {
    const groups: Record<string, ApplicationWithJob[]> = {}
    for (const col of KANBAN_COLUMNS) {
      groups[col] = []
    }
    for (const app of applications) {
      if (groups[app.status]) {
        groups[app.status].push(app)
      } else {
        groups['pending']?.push(app)
      }
    }
    return groups
  }, [applications])

  const visibleColumns = useMemo(() => {
    return KANBAN_COLUMNS.filter((col) => {
      const hasItems = (columns[col]?.length || 0) > 0
      const isDefault = ['pending', 'applied', 'document_pass', 'interviewing', 'accepted', 'rejected'].includes(col)
      return hasItems || isDefault
    })
  }, [columns])

  const activeApp = useMemo(() => {
    if (!activeId) return null
    return applications.find((a) => a.id === activeId) || null
  }, [activeId, applications])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
    setSelectedApp(null) // 드래그 시작하면 팝오버 닫기
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setOverColumnId(null)

    if (!over) return

    const activeAppId = active.id as string
    const targetStatus = over.id as string

    if (!KANBAN_COLUMNS.includes(targetStatus as ApplicationStatus)) return

    const app = applications.find((a) => a.id === activeAppId)
    if (!app || app.status === targetStatus) return

    onStatusChange(activeAppId, targetStatus as ApplicationStatus)
  }

  const handleCardClick = (app: ApplicationWithJob, rect: DOMRect) => {
    setSelectedApp((prev) => prev?.app.id === app.id ? null : { app, rect })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragOver={(event) => {
        const overId = event.over?.id as string | undefined
        if (overId && KANBAN_COLUMNS.includes(overId as ApplicationStatus)) {
          setOverColumnId(overId)
        } else {
          setOverColumnId(null)
        }
      }}
      onDragEnd={handleDragEnd}
    >
      <div className="overflow-x-auto pb-4 -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6">
        <div className="flex gap-3 min-w-max">
          {visibleColumns.map((status) => (
            <DroppableColumn
              key={status}
              status={status}
              applications={columns[status] || []}
              isOver={overColumnId === status}
              onCardClick={handleCardClick}
            />
          ))}
        </div>
      </div>

      <DragOverlay>
        {activeApp ? (
          <div className="w-[250px]">
            <KanbanCard application={activeApp} isDragging />
          </div>
        ) : null}
      </DragOverlay>

      {/* 카드 상세 팝오버 */}
      {selectedApp && (
        <CardDetailPopover
          application={selectedApp.app}
          anchorRect={selectedApp.rect}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
          onClose={() => setSelectedApp(null)}
        />
      )}
    </DndContext>
  )
}
